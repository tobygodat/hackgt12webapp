import { useState, useEffect } from "react";
import { getDoc, setDoc } from "firebase/firestore";
import { getUserDoc } from "../lib/firestore.js";
import { useAuth } from "./useAuth.js";

export function useUserDoc() {
    const { user } = useAuth();
    const [userDoc, setUserDoc] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!user) {
            setUserDoc(null);
            setLoading(false);
            return;
        }

        const fetchUserDoc = async () => {
            try {
                setLoading(true);
                const docRef = getUserDoc(user.uid);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    if (!data.username && data.displayName)
                        data.username = data.displayName;
                    setUserDoc(data);
                } else {
                    // Create a minimal user document
                    const newUserDoc = {
                        username: user.displayName || user.email?.split("@")[0],
                        email: user.email,
                        createdAt: new Date(),
                    };
                    await setDoc(docRef, newUserDoc);
                    setUserDoc(newUserDoc);
                }
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchUserDoc();
    }, [user]);

    const updateUserDoc = async (updates) => {
        if (!user) return;

        try {
            const docRef = getUserDoc(user.uid);
            await setDoc(docRef, { ...userDoc, ...updates }, { merge: true });
            setUserDoc((prev) => ({ ...prev, ...updates }));
        } catch (err) {
            setError(err.message);
        }
    };

    return { userDoc, loading, error, updateUserDoc };
}
