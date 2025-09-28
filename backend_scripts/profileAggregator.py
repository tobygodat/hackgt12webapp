# profile_aggregator.py
import os
import math
from datetime import datetime
from collections import defaultdict
import numpy as np
import pandas as pd
import requests
# Import Google Cloud and helper libraries
import firebase_admin
from firebase_admin import credentials, firestore
from dateutil.rrule import rrule, MONTHLY
from dateutil.parser import parse
from dateutil.relativedelta import relativedelta
import requests
import json

# --- 1. Configuration ---
# The URL of your running FastAPI application
BASE_URL = "http://127.0.0.1:8000"
# The Nessie Customer ID you want to sync


# Construct the full endpoint URL
NESSIE_API_KEY = '933f9b5bbbb8094ff92c2ea78ece8502'
NESSIE_BASE_URL = 'http://api.nessieisreal.com'
# --- 1. Configuration & Initialization ---
CREDENTIALS_PATH = 'ubuntu/mvidia-c10e5-firebase-adminsdk-fbsvc-b0e12b6e77.json'
def nessie_get_request(endpoint: str):
    """Makes a GET request to the Nessie API and handles common errors."""
    url = f"{NESSIE_BASE_URL}{endpoint}?key={NESSIE_API_KEY}"
    try:
        response = requests.get(url, timeout=15)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"  ERROR: Could not connect to Nessie API at {endpoint}. Reason: {e}")
        return None

def sync_document(collection_name: str, nessie_data: dict, extra_fields: dict = None):
    """Syncs a Nessie record to Firestore, preventing duplicates."""
    nessie_id = nessie_data.get('_id')
    if not nessie_id: return None

    docs = db.collection(collection_name).where('nessie_id', '==', nessie_id).limit(1).stream()
    existing_doc = next(docs, None)

    if existing_doc:
        return existing_doc.id
    else:
        firestore_data = nessie_data.copy()
        firestore_data['nessie_id'] = firestore_data.pop('_id')
        if extra_fields:
            firestore_data.update(extra_fields)
        
        _update_time, doc_ref = db.collection(collection_name).add(firestore_data)
        return doc_ref.id

# --- 3. New Master Sync Function ---

def sync_all_nessie_data():
    """
    Fetches all accounts from Nessie, but ONLY syncs data for customers
    that already exist in the Firestore 'users' collection.
    """
    print("\n--- 🔄 Starting Controlled Sync from Nessie API ---")

    # 1. Get all existing customers from Firestore first.
    # Create a map of {nessie_id: firestore_id} for fast lookups.
    print("Fetching existing customer list from Firestore...")
    existing_customers_map = {}
    users_ref = db.collection('users').stream()
    for user in users_ref:
        user_data = user.to_dict()
        if 'nessie_id' in user_data:
            existing_customers_map[user_data['nessie_id']] = user.id
    
    if not existing_customers_map:
        print("No existing customers found in Firestore. Aborting sync.")
        return []
    
    print(f"Found {len(existing_customers_map)} existing customers to process.")

    # 2. Fetch all accounts from Nessie.
    all_accounts = nessie_get_request('/accounts')
    if not all_accounts:
        print("Could not fetch accounts from Nessie. Aborting sync.")
        return []

    # 3. Filter the accounts list to only include those belonging to our existing customers.
    accounts_to_sync = [
        acc for acc in all_accounts if acc.get('customer_id') in existing_customers_map
    ]
    print(f"Found {len(accounts_to_sync)} accounts belonging to existing customers.")
    
    # 4. Sync the filtered accounts and their transactions.
    synced_customer_firestore_ids = set()

    for account in accounts_to_sync:
        nessie_customer_id = account['customer_id']
        customer_firestore_id = existing_customers_map[nessie_customer_id]
        synced_customer_firestore_ids.add(customer_firestore_id)

        nessie_account_id = account['_id']
        account_firestore_id = sync_document('accounts', account, {'customer_firestore_id': customer_firestore_id})
        
        # Fetch and sync all transaction types
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

    print("--- ✅ Controlled Sync Complete ---")
    return list(synced_customer_firestore_ids)
try:
    cred = credentials.Certificate(CREDENTIALS_PATH)
    if not firebase_admin._apps:
        firebase_admin.initialize_app(cred)
except Exception as e:
    print(f"Error initializing Firebase Admin SDK: {e}")
    print("Ensure the credentials path is correct and the file is accessible.")
    exit()

db = firestore.client()

# --- 2. Data Fetching Functions ---

def get_all_customer_ids():
    """Fetches all customer IDs from the 'users' collection in Firestore."""
    print("Fetching list of all customer IDs from Firestore...")
    try:
        users_ref = db.collection('users').stream()
        return [user.id for user in users_ref]
    except Exception as e:
        print(f"  ERROR: Could not fetch customer IDs. Reason: {e}")
        return []

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

# --- 3. Analysis Functions ---

def calculate_historical_profile(transactions: list[dict]):
    """
    Calculates a baseline financial profile using ONLY completed historical months.
    """
    if not transactions: return None, None
    
    monthly_data = defaultdict(lambda: {'income': 0.0, 'expenses': 0.0})
    valid_dates = []
    
    for t in transactions:
        date_str = t.get('purchase_date') or t.get('transaction_date') or t.get('payment_date')
        if not date_str: continue
        try:
            parsed_date = parse(date_str)
            valid_dates.append(parsed_date)
            month_key = parsed_date.strftime('%Y-%m')
            amount = t.get('amount', 0)
            if t.get('type') == 'deposit': monthly_data[month_key]['income'] += amount
            elif t.get('type') in ['withdrawal', 'purchase']: monthly_data[month_key]['expenses'] += amount
        except (ValueError, TypeError): continue

    if not valid_dates: return None, None
    
    start_date, end_date = min(valid_dates), max(valid_dates)
    date_range = [dt.strftime('%Y-%m') for dt in rrule(MONTHLY, dtstart=start_date, until=end_date)]
    
    income_series = pd.Series([monthly_data[m]['income'] for m in date_range], index=pd.to_datetime(date_range))
    expenses_series = pd.Series([monthly_data[m]['expenses'] for m in date_range], index=pd.to_datetime(date_range))

    # Exclude the current, partial month to ensure a stable baseline
    today = datetime.now()
    if not income_series.empty:
        last_data_month = income_series.index[-1]
        if last_data_month.year == today.year and last_data_month.month == today.month:
            print(f"  INFO: Excluding partial data for {today.strftime('%Y-%m')} from historical analysis.")
            income_series = income_series[:-1]
            expenses_series = expenses_series[:-1]

    if len(income_series) < 2: return None, None

    monthly_fcf_series = income_series - expenses_series
    ewma_series = monthly_fcf_series.ewm(span=3, adjust=False).mean()
    predicted_fcf = ewma_series.iloc[-1]
    
    historical_profile = {
        "ewma_predicted_fcf": round(float(predicted_fcf), 2),
        "mean_free_cash_flow": round(float(monthly_fcf_series.mean()), 2),
        "std_dev_free_cash_flow": round(float(monthly_fcf_series.std(ddof=0)), 2),
        "months_analyzed": len(income_series),
    }
    
    return historical_profile, expenses_series

def adjust_for_current_month_outliers(all_transactions: list[dict], historical_expenses: pd.Series, baseline_profile: dict):
    """
    Finds outliers in the current month and amortizes their impact on the baseline prediction.
    """
    if historical_expenses is None or historical_expenses.empty:
        return {**baseline_profile, "final_adjusted_fcf": baseline_profile.get("ewma_predicted_fcf", 0)}

    today = datetime.now()
    
    current_month_transactions = [
        t for t in all_transactions 
        if parse(t.get('purchase_date') or t.get('transaction_date', '1900-01-01')).strftime('%Y-%m') == today.strftime('%Y-%m')
    ]

    if not current_month_transactions:
        return {**baseline_profile, "final_adjusted_fcf": baseline_profile.get("ewma_predicted_fcf", 0)}

    q1 = historical_expenses.quantile(0.25)
    q3 = historical_expenses.quantile(0.75)
    iqr = q3 - q1
    outlier_fence = q3 + 1.5 * iqr

    current_outliers = [
        t['amount'] for t in current_month_transactions
        if t.get('type') in ['withdrawal', 'purchase'] and t['amount'] > outlier_fence
    ]
    
    total_outlier_cost = sum(current_outliers)
    adjusted_profile = baseline_profile.copy()
    
    if total_outlier_cost > 0:
        amortization_period_months = 3
        monthly_outlier_impact = total_outlier_cost / amortization_period_months
        print(f"  INFO: Found ${total_outlier_cost:.2f} in current-month outliers. Adjusting forecast by ${monthly_outlier_impact:.2f}/month.")
        adjusted_profile["current_month_outlier_impact"] = round(monthly_outlier_impact, 2)
        adjusted_profile["final_adjusted_fcf"] = round(baseline_profile["ewma_predicted_fcf"] - monthly_outlier_impact, 2)
    else:
        # If no outliers, the final prediction is the same as the baseline
        adjusted_profile["current_month_outlier_impact"] = 0.0
        adjusted_profile["final_adjusted_fcf"] = baseline_profile["ewma_predicted_fcf"]

    return adjusted_profile

# --- 4. Main Orchestration Logic ---
def main():
    """
    Main function to run the entire data pipeline:
    1. Sync all data from Nessie.
    2. Analyze the synced data to create financial profiles.
    """
    print(f"--- ⚙️ Starting nightly job at {datetime.now()} ---")
    
    # 1. Run the master sync to discover and update all customer data
    customer_ids_to_process = sync_all_nessie_data()
    
    if not customer_ids_to_process:
        print("No customers to process after sync. Exiting.")
        return

    print("\n--- 🧠 Starting Financial Profile Analysis ---")
    success_count, failure_count = 0, 0

    # 2. Loop through the customers that were just synced
    for customer_id in customer_ids_to_process:
        print(f"\nAnalyzing customer: {customer_id}")
        
        all_transactions = get_transactions_for_customer(customer_id)
        if not all_transactions:
            print(f"  INFO: No transactions found for {customer_id}.")
            failure_count += 1
            continue

        historical_profile, historical_expenses = calculate_historical_profile(all_transactions)
        
        if historical_profile:
            final_profile = adjust_for_current_month_outliers(all_transactions, historical_expenses, historical_profile)
            final_profile["last_updated_utc"] = datetime.utcnow()
            
            try:
                doc_ref = db.collection('financial_profiles').document(customer_id)
                doc_ref.set(final_profile)
                print(f"  ✅ SUCCESS: Financial profile for {customer_id} saved to Firestore.")
                success_count += 1
            except Exception as e:
                print(f"  ❌ ERROR: Could not save profile for {customer_id}. Reason: {e}")
                failure_count += 1
        else:
            print(f"  INFO: Not enough historical data to create a profile for {customer_id}.")
            failure_count += 1
            
    print(f"\n--- Job complete ---")
    print(f"Successfully analyzed: {success_count} | Failed or skipped: {failure_count}")

if __name__ == '__main__':
    main()