import {
    doc,
    collection,
    Timestamp,
    getDoc,
    setDoc,
    getDocs,
    query,
    where,
    orderBy,
} from "firebase/firestore";
import { db } from "./firebase.js";

// Firestore converters for type safety in JS
export const userConverter = {
    toFirestore: (user) => ({
        username: user.username,
        email: user.email,
        createdAt: user.createdAt || Timestamp.now(),
    }),
    fromFirestore: (snapshot) => ({
        id: snapshot.id,
        ...snapshot.data(),
    }),
};

export const accountConverter = {
    toFirestore: (account) => ({
        type: account.type,
        name: account.name,
        balance: account.balance || 0,
        apr: account.apr || null,
        limit: account.limit || null,
        updatedAt: account.updatedAt || Timestamp.now(),
    }),
    fromFirestore: (snapshot) => ({
        id: snapshot.id,
        ...snapshot.data(),
    }),
};

export const transactionConverter = {
    toFirestore: (transaction) => ({
        amount: transaction.amount,
        category: transaction.category,
        merchant: transaction.merchant,
        date: transaction.date,
        type: transaction.type,
        notes: transaction.notes || null,
    }),
    fromFirestore: (snapshot) => ({
        id: snapshot.id,
        ...snapshot.data(),
    }),
};

export const simulationConverter = {
    toFirestore: (simulation) => ({
        createdAt: simulation.createdAt || Timestamp.now(),
        inputs: simulation.inputs,
        outputs: simulation.outputs,
    }),
    fromFirestore: (snapshot) => ({
        id: snapshot.id,
        ...snapshot.data(),
    }),
};

// Helper functions
export const getUserDoc = (userId) =>
    doc(db, "user_accounts", userId).withConverter(userConverter);

export const getUserAccounts = (userId) =>
    collection(db, "user_accounts", userId, "accounts").withConverter(
        accountConverter
    );

export const getUserTransactions = (userId) =>
    collection(db, "user_accounts", userId, "transactions").withConverter(
        transactionConverter
    );

export const getUserSimulations = (userId) =>
    collection(db, "user_accounts", userId, "simulations").withConverter(
        simulationConverter
    );

export const getUserBudgets = (userId) =>
    collection(db, "user_accounts", userId, "budgets");

export const getUserGoals = (userId) =>
    collection(db, "user_accounts", userId, "goals");

// New minimal helpers (mapped to current schema: user_accounts/{uid})
// (imports merged above)

// reads user_accounts/{uid}
export async function getUserProfile(uid) {
    const ref = doc(db, "user_accounts", uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const data = snap.data();
    // Migration: prefer username ?? displayName
    if (!data.username && data.displayName) {
        data.username = data.displayName;
    }
    return { id: snap.id, ...data };
}

// writes user_accounts/{uid}.username
export async function updateUsername(uid, username) {
    const ref = doc(db, "user_accounts", uid);
    await setDoc(ref, { username }, { merge: true });
    return { uid, username };
}

// reads accounts/{customerID}
export async function getAccountByCustomerId(customerID) {
    if (!customerID) return null;
    const ref = collection(db, "accounts");
    const q = query(
        ref,
        where("customer_firestore_id", "==", String(customerID))
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...d.data() };
}

// reads top-level transactions filtered by customer_firestore_id (== uid) with optional date filters
export async function getTransactions(uid, { start, end } = {}) {
    // Fetch from top-level 'transactions' collection, scoped to the given uid
    const base = collection(db, "transactions");
    let q;
    if (start && end) {
        // uid equality + date range + order by date desc (may require composite index in Firestore)
        q = query(
            base,
            where("customer_firestore_id", "==", uid),
            where("date", ">=", start),
            where("date", "<=", end),
            orderBy("date", "desc")
        );
    } else if (start && !end) {
        q = query(
            base,
            where("customer_firestore_id", "==", uid),
            where("date", ">=", start),
            orderBy("date", "desc")
        );
    } else if (!start && end) {
        q = query(
            base,
            where("customer_firestore_id", "==", uid),
            where("date", "<=", end),
            orderBy("date", "desc")
        );
    } else {
        q = query(
            base,
            where("customer_firestore_id", "==", uid),
            orderBy("date", "desc")
        );
    }

    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// reads savings goal from user_accounts/{uid}.savings_goal OR goals/main
export async function getSavingsGoal(uid) {
    const ref = doc(db, "user_accounts", uid);
    const snap = await getDoc(ref);
    if (snap.exists() && typeof snap.data().savings_goal === "number") {
        return snap.data().savings_goal;
    }
    // try goals/main
    const mainGoalRef = doc(db, "user_accounts", uid, "goals", "main");
    const mainSnap = await getDoc(mainGoalRef);
    if (mainSnap.exists()) {
        const data = mainSnap.data();
        const val = data.savings_goal ?? data.amount;
        if (typeof val === "number") return val;
    }
    return 0;
}

// reads purchase transactions from the transactions collection (simplified to avoid index requirements)
export async function getPurchaseTransactions(uid, { start, end } = {}) {
    // First, get the user's profile to find their customerID
    const userProfile = await getUserProfile(uid);
    if (!userProfile) {
        console.log("DEBUG: No user profile found for UID:", uid);
        return [];
    }

    // Get the customerID from the profile (could be customerID or CustomerID)
    const customerID = userProfile.customerID || userProfile.CustomerID;
    if (!customerID) {
        console.log("DEBUG: No customerID found in user profile:", userProfile);
        return [];
    }

    console.log("DEBUG: Found customerID from profile:", customerID);

    const base = collection(db, "transactions");

    // Try multiple possible customer ID formats since the DB might store them differently
    const possibleIds = [
        customerID,                    // raw customerID
        `"${customerID}"`,            // quoted customerID
        customerID.replace(/"/g, ''), // customerID with quotes removed
    ];

    let allTransactions = [];

    for (const customerId of possibleIds) {
        try {
            const q = query(
                base,
                where("customer_firestore_id", "==", customerId),
                where("type", "==", "purchase")
            );

            const snap = await getDocs(q);
            console.log(`DEBUG: Found ${snap.docs.length} transactions for customer ID: ${customerId}`);

            if (snap.docs.length > 0) {
                const transactions = snap.docs.map((d) => {
                    const data = d.data();
                    console.log("DEBUG: Transaction data:", data);

                    // Handle different date field names
                    const dateStr = data.purchase_date || data.transaction_date || data.date;

                    return {
                        id: d.id,
                        ...data,
                        // Ensure we have a standardized date field for easier processing
                        date: dateStr ? new Date(dateStr) : new Date()
                    };
                });

                allTransactions = transactions;
                break; // Found transactions, stop trying other ID formats
            }
        } catch (error) {
            console.log(`DEBUG: Error querying with customer ID ${customerId}:`, error);
        }
    }

    console.log("DEBUG: Total transactions found:", allTransactions.length);

    // Filter by date range client-side if needed
    if (start || end) {
        allTransactions = allTransactions.filter((t) => {
            const tDate = t.date;
            if (start && tDate < start) return false;
            if (end && tDate > end) return false;
            return true;
        });
    }

    // Sort by date descending
    allTransactions.sort((a, b) => b.date - a.date);

    console.log("DEBUG: Final filtered transactions:", allTransactions.length);
    return allTransactions;
}
