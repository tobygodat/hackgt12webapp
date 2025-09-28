import { Outlet, NavLink } from "react-router-dom";
import { TrendingUp, User, LogOut } from "lucide-react";
import { useAuth } from "../hooks/useAuth.js";
import FloatingChat from "./FloatingChat.jsx";
import { useState, useEffect } from "react";
import { getPurchaseTransactions } from "../lib/firestore.js";

export default function Layout() {
    const { user, logout } = useAuth();
    const [transactionData, setTransactionData] = useState([]);

    const navItems = [
        { to: "/", icon: TrendingUp, label: "Insights" },
        { to: "/profile", icon: User, label: "Profile" },
    ];

    // Fetch transaction data for the financial assistant
    useEffect(() => {
        async function fetchTransactions() {
            if (!user) return;

            try {
                // Get last 3 months of purchase transactions
                const threeMonthsAgo = new Date();
                threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

                const transactions = await getPurchaseTransactions(user.uid, {
                    start: threeMonthsAgo
                });
                setTransactionData(transactions);
            } catch (error) {
                console.error("Error fetching transactions for chat:", error);
            }
        }

        fetchTransactions();
    }, [user]);

    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error("Logout error:", error);
        }
    };

    return (
        <div className="min-h-screen bg-bg">
            <nav className="border-b border-border bg-card">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <h1 className="text-xl font-bold text-text">
                                CartWatch
                            </h1>
                        </div>
                        <div className="flex items-center space-x-8">
                            <div className="flex space-x-8">
                                {navItems.map(({ to, icon: Icon, label }) => (
                                    <NavLink
                                        key={to}
                                        to={to}
                                        className={({ isActive }) =>
                                            `flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                                isActive
                                                    ? "text-text bg-surfaceAlt"
                                                    : "text-text-muted hover:text-text hover:bg-surface"
                                            }`
                                        }
                                    >
                                        <Icon size={18} />
                                        <span>{label}</span>
                                    </NavLink>
                                ))}
                            </div>

                            <div className="flex items-center space-x-4 pl-4 border-l border-border">
                                <span className="text-sm text-text-muted">
                                    {user?.email?.replace(
                                        "@cartwatch.local",
                                        ""
                                    ) ||
                                        user?.username ||
                                        "User"}
                                </span>
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-text-muted hover:text-text hover:bg-surface transition-colors"
                                    title="Sign out"
                                >
                                    <LogOut size={18} />
                                    <span>Sign Out</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </nav>
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Outlet />
            </main>

            {/* Floating Chat Assistant - only show when user is logged in */}
            {user && <FloatingChat transactionData={transactionData} />}
        </div>
    );
}
