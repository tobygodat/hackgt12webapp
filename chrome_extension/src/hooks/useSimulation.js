import { useState, useEffect, useMemo } from 'react';
import { query, where, getDocs, addDoc } from 'firebase/firestore';
import { getUserSimulations } from '../lib/firestore.js';
import { simulateTwin } from '../domain/simulateTwin.js';
import { rankRecommendations } from '../domain/recommend.js';
import { hashInputs } from '../domain/util.js';
import { useAuth } from './useAuth.js';
import { useAccounts } from './useAccounts.js';
import { useTransactions } from './useTransactions.js';

export function useSimulation(inputs) {
  const { user } = useAuth();
  const { accounts } = useAccounts();
  const { transactions } = useTransactions({ pageSize: 1000 });
  const [simulation, setSimulation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Memoize the simulation inputs hash
  const inputsHash = useMemo(() => hashInputs(inputs), [inputs]);

  useEffect(() => {
    if (!user || !inputs || !accounts.length) {
      setSimulation(null);
      return;
    }

    runSimulation();
  }, [user, inputsHash, accounts, transactions]);

  const runSimulation = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if we have a cached simulation
      const simulationsRef = getUserSimulations(user.uid);
      const q = query(simulationsRef, where('inputsHash', '==', inputsHash));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        // Use cached simulation
        const cachedSimulation = snapshot.docs[0].data();
        setSimulation(cachedSimulation);
        return;
      }

      // Run new simulation
      const simulationResults = simulateTwin(inputs, { accounts });
      const recommendations = rankRecommendations(transactions);

      const newSimulation = {
        inputsHash,
        createdAt: new Date(),
        inputs,
        outputs: {
          ...simulationResults,
          recommendations,
        },
      };

      // Save to Firestore
      await addDoc(simulationsRef, newSimulation);
      setSimulation(newSimulation);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Calculate estimated monthly income/expenses from recent transactions
  const estimatedMonthlyStats = useMemo(() => {
    if (!transactions.length) {
      return { incomeMean: 5000, expenseMean: 3500 }; // defaults
    }

    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());

    const recentTransactions = transactions.filter(t => {
      const transactionDate = t.date?.toDate?.() || new Date(t.date);
      return transactionDate >= threeMonthsAgo;
    });

    const totalIncome = recentTransactions
      .filter(t => t.type === 'credit' || t.amount > 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const totalExpenses = recentTransactions
      .filter(t => t.type === 'debit' || t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const monthsOfData = Math.max(1, (now - threeMonthsAgo) / (1000 * 60 * 60 * 24 * 30));

    return {
      incomeMean: Math.max(1000, totalIncome / monthsOfData),
      expenseMean: Math.max(500, totalExpenses / monthsOfData),
    };
  }, [transactions]);

  return {
    simulation,
    loading,
    error,
    refresh: runSimulation,
    estimatedMonthlyStats,
  };
}