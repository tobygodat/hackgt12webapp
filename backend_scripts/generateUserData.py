import requests
import json
from datetime import date, timedelta
from dateutil.relativedelta import relativedelta
import random

# --- Configuration ---
API_KEY = '933f9b5bbbb8094ff92c2ea78ece8502'
BASE_URL = 'http://api.nessieisreal.com'

# --- Main Functions ---

def create_customer(first_name, last_name, street_number, street_name, city, state, zip_code):
    """Creates a new customer."""
    url = f'{BASE_URL}/customers?key={API_KEY}'
    payload = {
        "first_name": first_name,
        "last_name": last_name,
        "address": {
            "street_number": street_number,
            "street_name": street_name,
            "city": city,
            "state": state,
            "zip": zip_code
        }
    }
    response = requests.post(url, headers={'Content-Type': 'application/json'}, data=json.dumps(payload))
    if response.status_code == 201:
        print("Customer created successfully!")
        return response.json()['objectCreated']['_id']
    else:
        print(f"Error creating customer: {response.text}")
        return None

def create_account(customer_id, account_type, nickname, opening_balance):
    """Creates a new account for a customer."""
    url = f'{BASE_URL}/customers/{customer_id}/accounts?key={API_KEY}'
    payload = {
        "type": account_type,
        "nickname": nickname,
        "balance": opening_balance,
        "rewards": 0,
    }
    response = requests.post(url, headers={'Content-Type': 'application/json'}, data=json.dumps(payload))
    if response.status_code == 201:
        print("Account created successfully!")
        return response.json()['objectCreated']['_id']
    else:
        print(f"Error creating account: {response.text}")
        return None

def create_deposit(account_id, amount, description, transaction_date):
    """Creates a deposit transaction."""
    url = f'{BASE_URL}/accounts/{account_id}/deposits?key={API_KEY}'
    payload = {
        "medium": "balance",
        "transaction_date": transaction_date,
        "amount": amount,
        "description": description
    }
    response = requests.post(url, headers={'Content-Type': 'application/json'}, data=json.dumps(payload))
    if response.status_code == 201:
        print(f"Paycheck deposit of ${amount} on {transaction_date} successful.")
    else:
        print(f"Error creating deposit: {response.text}")

def create_purchase(account_id, merchant_id, amount, description, purchase_date):
    """Creates a purchase transaction."""
    url = f'{BASE_URL}/accounts/{account_id}/purchases?key={API_KEY}'
    payload = {
        "merchant_id": merchant_id,
        "medium": "balance",
        "purchase_date": purchase_date,
        "amount": amount,
        "description": description
    }
    response = requests.post(url, headers={'Content-Type': 'application/json'}, data=json.dumps(payload))
    if response.status_code == 201:
        print(f"Purchase of ${amount} on {purchase_date} for '{description}' successful.")
    else:
        print(f"Error creating purchase: {response.text}")

def create_withdrawal(account_id, amount, description, transaction_date):
    """Creates a withdrawal transaction for payments like loans or rent."""
    url = f'{BASE_URL}/accounts/{account_id}/withdrawals?key={API_KEY}'
    payload = {
        "medium": "balance",
        "transaction_date": transaction_date,
        "amount": amount,
        "description": description
    }
    response = requests.post(url, headers={'Content-Type': 'application/json'}, data=json.dumps(payload))
    if response.status_code == 201:
        print(f"Withdrawal of ${amount} on {transaction_date} for '{description}' successful.")
    else:
        print(f"Error creating withdrawal: {response.text}")

def get_random_merchant():
    """Returns a random merchant ID."""
    merchants = [
        "57cf75cea73e494d8675ec49", "57cf75cea73e494d8675ec4a", "57cf75cea73e494d8675ec4b",
        "57cf75cea73e494d8675ec4c", "57cf75cea73e494d8675ec4d", "57cf75cea73e494d8675ec4e"
    ]
    return random.choice(merchants)

if __name__ == "__main__":
    # --- 1. Create a Customer and Account for a Lower-Income Profile ---
    print("--- Creating Customer and Account ---")
    customer_id = create_customer("Jane", "Smith", "456", "Oak Ave", "Smalltown", "TX", "67890")
    if customer_id:
        # Lower starting balance for a more realistic scenario
        account_id = create_account(customer_id, "Checking", "Main Checking", 1000)
        if account_id:
            print("\n--- Generating 1 Year of Financial Data ---")
            # Generate data for a full year
            end_date = date.today()
            start_date = end_date - relativedelta(years=1)

            # --- 2. Generate Biweekly Paychecks with Variable Hours ---
            print("\n--- Simulating Variable Biweekly Paychecks ---")
            paycheck_date = start_date + timedelta(days=(4 - start_date.weekday() + 7) % 7)  # First Friday
            hourly_wage = 20
            tax_rate = 0.22 # Approximate combined tax rate (Federal, State, FICA)

            while paycheck_date <= end_date:
                hours_week1 = random.uniform(33, 50)
                hours_week2 = random.uniform(33, 50)
                gross_pay = (hours_week1 + hours_week2) * hourly_wage
                net_pay = round(gross_pay * (1 - tax_rate), 2)
                create_deposit(account_id, net_pay, "Paycheck Deposit", paycheck_date.strftime("%Y-%m-%d"))
                paycheck_date += timedelta(weeks=2)

            # --- 3. Generate Monthly Fixed Necessity Payments ---
            print("\n--- Simulating Monthly Necessity Payments (Rent, Loan, Utilities, Insurance) ---")
            for i in range(12):
                # Rent payment on the 1st of the month
                rent_date = start_date + relativedelta(months=i, day=1)
                if rent_date < end_date:
                    create_withdrawal(account_id, 1200.00, "Monthly Rent Payment", rent_date.strftime("%Y-%m-%d"))

                # Auto loan payment on the 5th of the month
                loan_date = start_date + relativedelta(months=i, day=5)
                if loan_date < end_date:
                    create_withdrawal(account_id, 485.75, "Auto Loan Payment", loan_date.strftime("%Y-%m-%d"))
                
                # Car Insurance payment on the 10th of the month
                insurance_date = start_date + relativedelta(months=i, day=10)
                if insurance_date < end_date:
                    create_purchase(account_id, get_random_merchant(), 155.25, "Car Insurance", insurance_date.strftime("%Y-%m-%d"))

                # Utilities (Overheads) on the 20th, with variable cost
                utilities_date = start_date + relativedelta(months=i, day=20)
                if utilities_date < end_date:
                    utilities_amount = round(random.uniform(100.0, 250.0), 2)
                    create_purchase(account_id, get_random_merchant(), utilities_amount, "Gas & Electric Bill", utilities_date.strftime("%Y-%m-%d"))

            # --- 4. Generate Regular Grocery Purchases ---
            print("\n--- Simulating Weekly Grocery Purchases ---")
            grocery_date = start_date + timedelta(days=(6 - start_date.weekday() + 7) % 7)  # First Sunday
            while grocery_date <= end_date:
                grocery_amount = round(random.uniform(70.0, 150.0), 2)
                create_purchase(account_id, get_random_merchant(), grocery_amount, "Groceries", grocery_date.strftime("%Y-%m-%d"))
                grocery_date += timedelta(weeks=1)

            # --- 5. Generate Recurrent Subscriptions ---
            print("\n--- Simulating Recurring Subscriptions ---")
            subscriptions = {
                "Netflix": 15.49,
                "Spotify Premium": 10.99
            }
            for i in range(12):
                subscription_date = start_date + relativedelta(months=i, day=15)
                if subscription_date < end_date:
                    for service, amount in subscriptions.items():
                        create_purchase(account_id, get_random_merchant(), amount, f"{service} Subscription", subscription_date.strftime("%Y-%m-%d"))

            # --- 6. Generate Discretionary (Random) Spending ---
            print("\n--- Simulating Random Discretionary Spending ---")
            for _ in range(80):  # Number of random purchases over the year
                purchase_date = start_date + timedelta(days=random.randint(0, (end_date - start_date).days))
                # Amounts reflect smaller, more typical discretionary spending
                purchase_amount = round(random.uniform(5.0, 150.0), 2)
                purchase_description = random.choice([
                    "Gas", "Dinner Out", "Online Shopping", "Coffee", "Movie Tickets",
                    "Lunch with Friends", "Clothing", "Pharmacy", "Convenience Store"
                ])
                create_purchase(account_id, get_random_merchant(), purchase_amount, purchase_description, purchase_date.strftime("%Y-%m-%d"))

            print("\n--- Data Generation Complete ---")