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
    const ref = doc(db, "accounts", String(customerID));
    const snap = await getDoc(ref);
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// reads user_accounts/{uid}/transactions with optional date filters
export async function getTransactions(uid, { start, end } = {}) {
    const base = collection(db, "user_accounts", uid, "transactions");
    let q = query(base, orderBy("date", "desc"));
    // Firestore can only apply range on the same field; handle common cases
    if (start && !end) {
        q = query(base, where("date", ">=", start), orderBy("date", "desc"));
    } else if (!start && end) {
        q = query(base, where("date", "<=", end), orderBy("date", "desc"));
    } else if (start && end) {
        // May require composite index; fallback to client-side filter after fetch
        q = query(base, where("date", ">=", start), orderBy("date", "desc"));
    }
    const snap = await getDocs(q);
    let items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    if (start && end) {
        items = items.filter((t) => {
            const dt = t.date?.toDate?.() || new Date(t.date);
            return dt >= start && dt <= end;
        });
    }
    return items;
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
