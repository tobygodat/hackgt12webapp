import { useState, useEffect } from 'react';
import { getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { getUserAccounts } from '../lib/firestore.js';
import { useAuth } from './useAuth.js';

export function useAccounts() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) {
      setAccounts([]);
      setLoading(false);
      return;
    }

    const fetchAccounts = async () => {
      try {
        setLoading(true);
        const accountsRef = getUserAccounts(user.uid);
        const snapshot = await getDocs(accountsRef);
        const accountsData = snapshot.docs.map(doc => doc.data());
        setAccounts(accountsData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAccounts();
  }, [user]);

  const addAccount = async (accountData) => {
    if (!user) return;

    try {
      const accountsRef = getUserAccounts(user.uid);
      const newAccount = {
        ...accountData,
        updatedAt: new Date(),
      };
      const docRef = await addDoc(accountsRef, newAccount);
      const accountWithId = { ...newAccount, id: docRef.id };
      setAccounts(prev => [...prev, accountWithId]);
      return accountWithId;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const updateAccount = async (accountId, updates) => {
    if (!user) return;

    try {
      const accountRef = doc(getUserAccounts(user.uid), accountId);
      const updatedData = { ...updates, updatedAt: new Date() };
      await updateDoc(accountRef, updatedData);
      setAccounts(prev =>
        prev.map(account =>
          account.id === accountId ? { ...account, ...updatedData } : account
        )
      );
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const deleteAccount = async (accountId) => {
    if (!user) return;

    try {
      const accountRef = doc(getUserAccounts(user.uid), accountId);
      await deleteDoc(accountRef);
      setAccounts(prev => prev.filter(account => account.id !== accountId));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const totalBalance = accounts.reduce((sum, account) => sum + (account.balance || 0), 0);

  return {
    accounts,
    loading,
    error,
    addAccount,
    updateAccount,
    deleteAccount,
    totalBalance,
  };
}