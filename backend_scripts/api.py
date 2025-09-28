import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from datetime import date
from typing import Literal
import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
import requests
from purchaseAnalysis import predict_affordability
from datetime import date, datetime
from dateutil.relativedelta import relativedelta
from profileAggregator import calculate_historical_profile, adjust_for_current_month_outliers

NESSIE_API_KEY = '933f9b5bbbb8094ff92c2ea78ece8502'
NESSIE_BASE_URL = 'http://api.nessieisreal.com'
# Initialize the SDK with a service account
# Replace 'path/to/your/serviceAccountKey.json' with your actual file path
#cred = credentials.Certificate('hakgt25realproj/mvidia-c10e5-firebase-adminsdk-fbsvc-b0e12b6e77.json')
#firebase_admin.initialize_app(cred)

# Get a reference to the Firestore database
db = firestore.client()

# -- jAEiLtrKvtoLO2U3NmVo --sample customer ID
# Import Google Cloud Firestore client library

# --- 1. Firestore Initialization ---
# This assumes you have authenticated with Google Cloud CLI and set your project.
# See the "How to Run" section below for instructions.
app = FastAPI(
    title="Nessie Data Sync API",
    description="An API to pull all data for a customer from the Nessie API and store it in Cloud Firestore.",
    version="2.0.0",
)

@app.on_event("startup")
async def startup_event():
    """Checks for a valid Firestore client on startup."""
    if db is None:
        raise RuntimeError("Could not initialize Firestore client. Check GCP authentication.")

# --- 3. Nessie API Helper ---

def nessie_get_request(endpoint: str):
    """
    Makes a GET request to the Nessie API and handles common errors.
    """
    url = f"{NESSIE_BASE_URL}{endpoint}?key={NESSIE_API_KEY}"
    try:
        response = requests.get(url, timeout=10)
        # Raise an exception for 4xx or 5xx status codes
        response.raise_for_status()
        return response.json()
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 404:
            # Return None for 404s so the caller can handle "not found" cases
            return None
        raise HTTPException(status_code=e.response.status_code, detail=f"Error from Nessie API: {e}")
    except requests.exceptions.RequestException as e:
        # Handle network errors, timeouts, etc.
        raise HTTPException(status_code=503, detail=f"Could not connect to Nessie API: {e}")

def get_transactions_for_customer(customer_firestore_id: str):
    """Retrieves all transactions for a given customer from Firestore."""
    try:
        accounts_query = db.collection('accounts').where('customer_firestore_id', '==', customer_firestore_id).stream()
        account_ids = [account.id for account in accounts_query]
        if not account_ids: return []
        if len(account_ids) > 30:
            print(f"  WARNING: Customer {customer_firestore_id} has >30 accounts. Skipping.")
            return []
        transactions_query = db.collection('transactions').where('customer_firestore_id', '==', customer_firestore_id).stream()
        return [t.to_dict() for t in transactions_query]
    except Exception as e:
        print(f"  ERROR: Could not fetch transactions for {customer_firestore_id}. Reason: {e}")
        return []
# --- 4. Firestore De-duplication & Sync Logic ---

def sync_document(collection_name: str, nessie_data: dict, extra_fields: dict = None):
    """
    Syncs a Nessie record to a Firestore collection, preventing duplicates.

    It checks if a document with the same 'nessie_id' already exists.
    If it exists, it returns the existing Firestore ID.
    If not, it creates a new document and returns its new ID.
    """
    nessie_id = nessie_data.get('_id')
    if not nessie_id:
        raise ValueError(f"Nessie data for {collection_name} is missing the '_id' field.")

    # Query Firestore to see if this Nessie record already exists
    docs = db.collection(collection_name).where('nessie_id', '==', nessie_id).limit(1).stream()
    existing_doc = next(docs, None)

    if existing_doc:
        print(f"  -> Record '{nessie_id}' already exists in '{collection_name}'. Skipping creation.")
        return existing_doc.id
    else:
        # Prepare the data for Firestore
        firestore_data = nessie_data.copy()
        firestore_data['nessie_id'] = firestore_data.pop('_id')
        if extra_fields:
            firestore_data.update(extra_fields)

        # Create the new document in Firestore
        _update_time, doc_ref = db.collection(collection_name).add(firestore_data)
        print(f"  -> Created new record for Nessie ID '{nessie_id}' in '{collection_name}'.")
        return doc_ref.id

# --- 5. The Combined Sync Endpoint ---

@app.post("/sync/customers/{nessie_customer_id}", status_code=200)
def sync_single_customer_by_nessie_id(nessie_customer_id: str):
    """
    Fetches and syncs all data for a single customer given their Nessie ID.
    This includes the customer record, all their accounts, and all their transactions.
    """
    print(f"\n--- 🎯 Starting targeted sync for Nessie Customer ID: {nessie_customer_id} ---")
    try:
        # Step 1: Fetch and Sync the Customer record
        customer_data = nessie_get_request(f"/customers/{nessie_customer_id}")
        if not customer_data:
            print(f"  ERROR: Customer '{nessie_customer_id}' not found in Nessie.")
            return None
        
        customer_firestore_id = sync_document('users', customer_data)
        
        # Step 2: Fetch and Sync all of the Customer's Accounts
        accounts_data = nessie_get_request(f"/customers/{nessie_customer_id}/accounts")
        if not accounts_data:
            print("  INFO: No accounts found for this customer.")
            print(f"--- ✅ Targeted Sync Complete for {nessie_customer_id} (no accounts to process) ---")
            return customer_firestore_id

        # Step 3: Loop through each account and sync its transactions
        total_synced_transactions = 0
        for account in accounts_data:
            nessie_account_id = account['_id']
            account_firestore_id = sync_document(
                'accounts', account, {'customer_firestore_id': customer_firestore_id}
            )
            
            # Fetch all transaction types for the account
            deposits = nessie_get_request(f"/accounts/{nessie_account_id}/deposits") or []
            purchases = nessie_get_request(f"/accounts/{nessie_account_id}/purchases") or []
            withdrawals = nessie_get_request(f"/accounts/{nessie_account_id}/withdrawals") or []

            all_txns = (
                [{**t, 'type': 'deposit'} for t in deposits] +
                [{**t, 'type': 'purchase'} for t in purchases] +
                [{**t, 'type': 'withdrawal'} for t in withdrawals]
            )

            print(f"  Syncing {len(all_txns)} transactions for account {nessie_account_id}...")
            for txn in all_txns:
                sync_document('transactions', txn, {'customer_firestore_id': customer_firestore_id})
            
            total_synced_transactions += len(all_txns)


            all_transactions = get_transactions_for_customer(customer_firestore_id)
            if not all_transactions:
                print(f"  INFO: No transactions found for {customer_firestore_id}.")
                continue
            historical_profile, historical_expenses = calculate_historical_profile(all_transactions)
        
            if historical_profile:
                final_profile = adjust_for_current_month_outliers(all_transactions, historical_expenses, historical_profile)
                final_profile["last_updated_utc"] = datetime.utcnow()
                
                try:
                    doc_ref = db.collection('financial_profiles').document(customer_firestore_id)
                    doc_ref.set(final_profile)
                    print(f"  ✅ SUCCESS: Financial profile for {customer_firestore_id} saved to Firestore.")
                except Exception as e:
                    print(f"  ❌ ERROR: Could not save profile for {customer_firestore_id}. Reason: {e}")
            else:
                print(f"  INFO: Not enough historical data to create a profile for {customer_firestore_id}.")            
            print(f"--- ✅ Targeted Sync Complete for {nessie_customer_id}. Synced {total_synced_transactions} transactions. ---")
            return customer_firestore_id

    except Exception as e:
        print(f"  ❌ An unexpected error occurred during sync for {nessie_customer_id}: {e}")
        return None
    
@app.get("/customers/{customer_firestore_id}/analysis", status_code=200)
def get_customer_approval_info(customer_firestore_id: str):
    """
    Retrieves all transactions for a given customer from Firestore.
    The customer ID must be the Firestore document ID, not the Nessie ID.
    """
    try:
        # 1. Validate that the customer exists in Firestore
        customer_doc = db.collection('users').document(customer_firestore_id).get()
        if not customer_doc.exists:
            raise HTTPException(status_code=404, detail="Customer not found in Firestore.")

        # 2. Find all accounts belonging to this customer
        accounts_query = db.collection('accounts').where('customer_firestore_id', '==', customer_firestore_id).stream()
        
        account_ids = [account.id for account in accounts_query]

        # 3. If no accounts are found, return an empty list
        if not account_ids:
            return []

        # Note: Firestore 'in' queries are limited to 30 items.
        # This will fail if a customer has more than 30 accounts.
        if len(account_ids) > 30:
            raise HTTPException(status_code=400, detail="Query failed: Customer has more than 30 accounts, which exceeds the query limit.")

        # 4. Find all transactions linked to these accounts using an 'in' query
        dat = db.collection('financial_profiles').document(customer_firestore_id).get().get('final_adjusted_fcf')
        
        return dat

    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An internal server error occurred: {e}")

@app.get("/customers/{customer_firestore_id}/purchases/recent", status_code=200)
def get_recent_transactions(customer_firestore_id: str):
    """
    Retrieves the last three months of transactions for a given customer.
    """
    try:
        # 1. Validate customer and find their accounts (same as above)
        customer_doc = db.collection('users').document(customer_firestore_id).get()
        if not customer_doc.exists:
            raise HTTPException(status_code=404, detail="Customer not found in Firestore.")

        accounts_query = db.collection('accounts').where('customer_firestore_id', '==', customer_firestore_id).stream()
        account_ids = [account.id for account in accounts_query]

        if not account_ids:
            return ["no accounts found"]

        if len(account_ids) > 30:
            raise HTTPException(status_code=400, detail="Query failed: Customer has more than 30 accounts.")

        # 2. Calculate the start date for the query (3 months ago)
        start_date = date.today() - relativedelta(months=3)
        start_datetime = datetime.combine(start_date, datetime.min.time()) # Set time to 00:00:00

        # 3. Query transactions using the date range and order them
        transactions_query = db.collection('transactions').where('customer_firestore_id', '==', customer_firestore_id).where('purchase_date', '>=', str(start_datetime)).stream()
        
        # 4. Format and return the results
        recent_transactions = [
            {**t.to_dict(), 'transaction_firestore_id': t.id} for t in transactions_query
        ]
        return recent_transactions

    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An internal server error occurred: {e}")



# --- 6. Run the Application ---
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
