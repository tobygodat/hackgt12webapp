import { useState, useEffect } from "react";
import {
    query,
    orderBy,
    limit,
    startAfter,
    getDocs,
    where,
} from "firebase/firestore";
import { getUserTransactions } from "../lib/firestore.js";
import { useAuth } from "./useAuth.js";

export function useTransactions({ pageSize = 50, filters = {} } = {}) {
    const { user } = useAuth();
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [hasMore, setHasMore] = useState(true);
    const [lastDoc, setLastDoc] = useState(null);

    useEffect(() => {
        if (!user) {
            setTransactions([]);
            setLoading(false);
            return;
        }

        fetchTransactions(true);
    }, [user, filters]);

    const fetchTransactions = async (reset = false) => {
        if (!user) return;

        try {
            setLoading(true);
            const transactionsRef = getUserTransactions(user.uid);

            let q = query(transactionsRef, orderBy("purchase_date", "desc"));

            // Apply filters
            if (filters.category) {
                q = query(q, where("category", "==", filters.category));
            }
            if (filters.minAmount) {
                q = query(
                    q,
                    where("amount", ">=", parseFloat(filters.minAmount))
                );
            }
            if (filters.startDate) {
                q = query(q, where("date", ">=", new Date(filters.startDate)));
            }

            q = query(q, limit(pageSize));

            if (!reset && lastDoc) {
                q = query(q, startAfter(lastDoc));
            }

            const snapshot = await getDocs(q);
            let newTransactions = snapshot.docs.map((doc) => doc.data());
            // Client-side apply endDate and maxAmount when present
            if (filters.endDate) {
                const endDate = new Date(filters.endDate);
                newTransactions = newTransactions.filter((t) => {
                    const d = t.date?.toDate?.() || new Date(t.date);
                    return d <= endDate;
                });
            }
            if (filters.maxAmount) {
                const maxAmount = parseFloat(filters.maxAmount);
                newTransactions = newTransactions.filter(
                    (t) => t.amount <= maxAmount
                );
            }

            if (reset) {
                setTransactions(newTransactions);
            } else {
                setTransactions((prev) => [...prev, ...newTransactions]);
            }

            setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
            setHasMore(snapshot.docs.length === pageSize);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const loadMore = () => {
        if (!loading && hasMore) {
            fetchTransactions(false);
        }
    };

    // Filter transactions client-side for search (since Firestore doesn't support full-text search)
    const filteredTransactions = transactions.filter((transaction) => {
        if (filters.search) {
            const searchTerm = filters.search.toLowerCase();
            return (
                transaction.merchant?.toLowerCase().includes(searchTerm) ||
                transaction.category?.toLowerCase().includes(searchTerm)
            );
        }
        return true;
    });

    // Group transactions by month
    const groupedTransactions = filteredTransactions.reduce(
        (groups, transaction) => {
            const date =
                transaction.date?.toDate?.() || new Date(transaction.date);
            const monthKey = date.toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
            });

            if (!groups[monthKey]) {
                groups[monthKey] = [];
            }
            groups[monthKey].push(transaction);
            return groups;
        },
        {}
    );

    return {
        transactions: filteredTransactions,
        groupedTransactions,
        loading,
        error,
        hasMore,
        loadMore,
        refresh: () => fetchTransactions(true),
    };
}
