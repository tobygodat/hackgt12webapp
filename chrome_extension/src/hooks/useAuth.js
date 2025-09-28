import { useState, useEffect } from "react";
import {
    collection,
    query,
    where,
    getDocs,
    getDoc,
    doc,
    setDoc,
    serverTimestamp,
} from "firebase/firestore";
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut as fbSignOut,
} from "firebase/auth";
import { db, auth } from "../lib/firebase.js";
import { useAppStore } from "../store/useAppStore.js";

export function useAuth() {
    const [loading, setLoading] = useState(true);
    const { user, setUser } = useAppStore();

    useEffect(() => {
        // Use Firebase Auth session; hydrate with user_accounts profile
        setLoading(true);
        const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
            try {
                if (!firebaseUser) {
                    localStorage.removeItem("cartwatch_session_user");
                    setUser(null);
                    return;
                }

                const email = firebaseUser.email || "";
                const uid = firebaseUser.uid;

                // Prefer direct doc by uid
                let profileDoc = await getDoc(doc(db, "user_accounts", uid));
                let profile = profileDoc.exists() ? profileDoc.data() : null;

                // Fallback: query by email if not found
                if (!profile && email) {
                    try {
                        const snapByEmail = await getDocs(
                            query(
                                collection(db, "user_accounts"),
                                where("email", "==", email)
                            )
                        );
                        if (!snapByEmail.empty) {
                            profile = snapByEmail.docs[0].data();
                        }
                    } catch (e) {
                        console.warn("Failed to query profile by email:", e);
                    }
                }

                // If still no profile, create one at user_accounts/{uid}
                if (!profile) {
                    profile = {
                        username: email.split("@")[0],
                        email,
                        createdAt: serverTimestamp(),
                    };
                    await setDoc(doc(db, "user_accounts", uid), profile, {
                        merge: true,
                    });
                }

                const sessionUser = {
                    uid,
                    username: profile.username || email.split("@")[0],
                    displayName:
                        profile.displayName ||
                        profile.username ||
                        email.split("@")[0],
                    email,
                };
                setUser(sessionUser);
                localStorage.setItem(
                    "cartwatch_session_user",
                    JSON.stringify(sessionUser)
                );
            } finally {
                setLoading(false);
            }
        });

        return () => unsub();
    }, [setUser]);

    const signIn = async (email, password) => {
        try {
            if (!email?.includes("@")) {
                const err = new Error("Invalid email format");
                err.code = "auth/invalid-email";
                throw err;
            }
            console.log("Attempting sign in with email:", email);
            await signInWithEmailAndPassword(auth, email, password);
            // onAuthStateChanged will hydrate the store + localStorage
        } catch (error) {
            console.error("Sign in error:", error);
            throw error;
        }
    };

    const signUp = async (usernameOrEmail, password) => {
        try {
            const email = usernameOrEmail.includes("@")
                ? usernameOrEmail
                : `${usernameOrEmail}@cartwatch.local`;
            if (!email.includes("@")) {
                const err = new Error("Invalid email");
                err.code = "auth/invalid-email";
                throw err;
            }
            if (!password || password.length < 6) {
                const err = new Error(
                    "Password must be at least 6 characters long"
                );
                err.code = "auth/weak-password";
                throw err;
            }

            const cred = await createUserWithEmailAndPassword(
                auth,
                email,
                password
            );
            const uid = cred.user.uid;
            const profile = {
                username: email.split("@")[0],
                email,
                createdAt: serverTimestamp(),
            };
            await setDoc(doc(db, "user_accounts", uid), profile, {
                merge: true,
            });
            // onAuthStateChanged will hydrate the store
            console.log("Sign up successful for:", email);
        } catch (error) {
            console.error("Sign up error:", error);
            throw error;
        }
    };

    const logout = async () => {
        try {
            await fbSignOut(auth);
            localStorage.removeItem("cartwatch_session_user");
            setUser(null);
        } catch (error) {
            console.error("Logout error:", error);
            throw error;
        }
    };

    return {
        user,
        loading,
        signIn,
        signUp,
        logout,
        isAuthenticated: !!user,
    };
}
