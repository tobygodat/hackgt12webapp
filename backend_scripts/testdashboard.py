import requests
import pandas as pd
from datetime import datetime
import asyncio  # <-- 1. Import asyncio

from nicegui import ui
import matplotlib.pyplot as plt

# --- Configuration ---
API_KEY = '933f9b5bbbb8094ff92c2ea78ece8502'
BASE_URL = 'http://api.nessieisreal.com'
#SAMPLE_CUSTOMER_ID = 68d768529683f20dd51963af

# --- API Functions (unchanged) ---
def get_customer_accounts(customer_id: str):
    """Fetches all accounts for a given customer ID."""
    url = f'{BASE_URL}/customers/{customer_id}/accounts?key={API_KEY}'
    response = requests.get(url)
    if response.status_code == 200:
        return response.json()
    return None

def get_account_transactions(account_id: str):
    """Fetches all transactions for an account."""
    endpoints = {
        'purchases': f'/accounts/{account_id}/purchases',
        'deposits': f'/accounts/{account_id}/deposits',
        'withdrawals': f'/accounts/{account_id}/withdrawals'
    }
    all_transactions = []
    for trans_type, endpoint in endpoints.items():
        url = f'{BASE_URL}{endpoint}?key={API_KEY}'
        response = requests.get(url)
        if response.status_code == 200:
            transactions = response.json()
            for t in transactions:
                t['type'] = trans_type.capitalize()
                t['date'] = t.get('transaction_date') or t.get('purchase_date')
                if trans_type in ['purchases', 'withdrawals']:
                    t['amount'] = -t['amount']
            all_transactions.extend(transactions)
    return all_transactions

# --- Data Processing (unchanged) ---
def process_data_for_visualization(transactions: list, opening_balance: float):
    if not transactions:
        return pd.DataFrame(), None
    df = pd.DataFrame(transactions)
    df['date'] = pd.to_datetime(df['date'])
    df = df.sort_values(by='date')
    df['balance'] = opening_balance + df['amount'].cumsum()
    df_display = df[['date', 'type', 'description', 'amount', 'balance']].copy()
    df_display['date'] = df_display['date'].dt.strftime('%Y-%m-%d')
    df_display['amount'] = df_display['amount'].map('${:,.2f}'.format)
    df_display['balance'] = df_display['balance'].map('${:,.2f}'.format)
    return df_display, df

# --- NiceGUI UI ---
ui.label('Bank Account History Visualizer 🏦').classes('text-h4 text-center my-4')

with ui.card().classes('w-full max-w-2xl mx-auto'):
    customer_id_input = ui.input(
        'Enter Customer ID',
        placeholder='e.g., 65149d05c613b5643e948518'
    ).classes('w-full')
    results_container = ui.column().classes('w-full')

    async def fetch_and_display_history():
        customer_id = customer_id_input.value
        if not customer_id:
            ui.notify('Please enter a Customer ID.', color='negative')
            return

        results_container.clear()
        with results_container:
            with ui.spinner(size='lg', color='primary'):
                accounts = await asyncio.to_thread(get_customer_accounts, customer_id)

            if not accounts:
                ui.notify('Could not find customer or accounts.', color='negative')
                return

            checking_account = next((acc for acc in accounts if acc.get('type') == 'Checking'), None)
            if not checking_account:
                ui.notify('No checking account found for this customer.', color='warning')
                return

            account_id = checking_account['_id']
            current_balance = checking_account['balance']
            ui.label(f"Displaying History for Account: {account_id}").classes('text-lg font-bold')
            
            with ui.spinner(size='lg', color='primary'):
                transactions = await asyncio.to_thread(get_account_transactions, account_id)
            
            if not transactions:
                ui.label("No transactions found for this account.").classes('mt-4')
                return

            total_transaction_amount = sum(t['amount'] for t in transactions)
            opening_balance = current_balance - total_transaction_amount
            ui.label(f"Current Balance: ${current_balance:,.2f}").classes('text-md')

            df_display, df_raw = process_data_for_visualization(transactions, opening_balance)
            
            ui.label('Transaction History').classes('text-xl mt-4')
            # --- FIX 1: Use from_pandas ---
            ui.aggrid.from_pandas(df_display).classes('h-96')

            ui.label('Balance Over Time').classes('text-xl mt-6')
            
            # --- FIX 2: Correct way to call ui.pyplot ---
            fig, ax = plt.subplots()
            ax.plot(df_raw['date'], df_raw['balance'], marker='o', linestyle='-')
            ax.set_title('Account Balance Trend')
            ax.set_xlabel('Date')
            ax.set_ylabel('Balance ($)')
            ax.grid(True)
            plt.xticks(rotation=45)
            plt.tight_layout()
            
            ui.pyplot().classes('mt-2') # Call with no arguments
            plt.close(fig) # Release figure from memory
            
    ui.button('Get History', on_click=fetch_and_display_history).classes('w-full mt-4')

ui.run()