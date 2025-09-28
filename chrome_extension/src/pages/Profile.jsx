import { useEffect, useMemo, useState } from "react";
import Card from "../components/Card.jsx";
import Money from "../components/Money.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { LogOut, User as UserIcon } from "lucide-react";
import {
    getAccountByCustomerId,
    getSavingsGoal,
    getTransactions,
    getUserProfile,
    updateUsername,
} from "../lib/firestore.js";
import { startOfMonth, endOfMonth } from "date-fns";

export default function Profile() {
    const { user, logout } = useAuth();
    const [username, setUsername] = useState("");
    const [savingUsername, setSavingUsername] = useState(false);
    const [account, setAccount] = useState(null);
    const [savingsGoal, setSavingsGoal] = useState(0);
    const [monthSpend, setMonthSpend] = useState(0);
    const [monthIncome, setMonthIncome] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        async function hydrate() {
            if (!user) return;
            setLoading(true);
            try {
                const prof = await getUserProfile(user.uid);
                const uname =
                    prof?.username ??
                    prof?.displayName ??
                    user.email?.split("@")[0] ??
                    "";
                setUsername(uname);

                // Net worth account by customerID
                const customerID = prof?.customerID || prof?.CustomerID;
                if (customerID) {
                    const acct = await getAccountByCustomerId(customerID);
                    if (isMounted) setAccount(acct);
                } else {
                    setAccount(null);
                }

                // Savings goal
                const goal = await getSavingsGoal(user.uid);
                if (isMounted) setSavingsGoal(goal || 0);

                // Monthly spend/income for current calendar month
                const start = startOfMonth(new Date());
                const end = endOfMonth(new Date());
                const txns = await getTransactions(user.uid, { start, end });
                if (isMounted) {
                    let spend = 0;
                    let income = 0;
                    txns.forEach((t) => {
                        const amt =
                            typeof t.amount === "number"
                                ? t.amount
                                : parseFloat(t.amount) || 0;
                        const isDebit = t.type === "debit" || amt < 0;
                        if (isDebit) spend += Math.abs(amt);
                        else income += Math.abs(amt);
                    });
                    setMonthSpend(spend);
                    setMonthIncome(income);
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        }
        hydrate();
        return () => {
            isMounted = false;
        };
    }, [user]);

    const balance = account?.balance || 0;
    // Financial Health Score Algorithm (0-100)
    const financialHealthScore = useMemo(() => {
        if (!monthIncome && !monthSpend && !balance) return 0;

        let score = 0;
        let factors = 0;

        // Factor 1: Savings Rate (30% weight)
        if (monthIncome > 0) {
            const savingsRate = Math.max(0, (monthIncome - monthSpend) / monthIncome);
            score += Math.min(30, savingsRate * 150); // 20% savings = 30 points
            factors++;
        }

        // Factor 2: Account Balance Health (25% weight)
        if (balance >= 0) {
            if (balance > monthSpend * 3) score += 25; // 3+ months expenses = full points
            else if (balance > monthSpend) score += 15; // 1-3 months = partial points
            else if (balance > 0) score += 5; // Some savings = minimal points
            factors++;
        }

        // Factor 3: Spending Consistency (20% weight)
        if (monthSpend > 0 && monthIncome > 0) {
            const spendingRatio = monthSpend / monthIncome;
            if (spendingRatio <= 0.5) score += 20; // Spending ≤50% of income = excellent
            else if (spendingRatio <= 0.7) score += 15; // 50-70% = good
            else if (spendingRatio <= 0.9) score += 10; // 70-90% = fair
            else score += 5; // >90% = needs improvement
            factors++;
        }

        // Factor 4: Emergency Fund Buffer (15% weight)
        if (balance > 0 && monthSpend > 0) {
            const emergencyMonths = balance / monthSpend;
            if (emergencyMonths >= 6) score += 15; // 6+ months = excellent
            else if (emergencyMonths >= 3) score += 12; // 3-6 months = good
            else if (emergencyMonths >= 1) score += 8; // 1-3 months = fair
            else score += 3; // <1 month = minimal
            factors++;
        }

        // Factor 5: Income Stability Bonus (10% weight)
        if (monthIncome > monthSpend * 2) {
            score += 10; // High income vs spending = bonus points
            factors++;
        } else if (monthIncome > monthSpend) {
            score += 5; // Positive income = some bonus
            factors++;
        }

        // Normalize score if we don't have all factors
        const maxPossibleScore = 100;
        const actualMaxScore = factors > 0 ? (score / factors) * 5 : 0; // Rough normalization

        return Math.min(100, Math.max(0, Math.round(actualMaxScore)));
    }, [monthIncome, monthSpend, balance]);

    const saveUsername = async () => {
        if (!user) return;
        try {
            setSavingUsername(true);
            await updateUsername(user.uid, username.trim());
            // profile state removed; username shown from local state
        } finally {
            setSavingUsername(false);
        }
    };

    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Card title="Sign In Required" className="max-w-md text-center">
                    <p className="text-text-muted">
                        Please sign in to access your profile.
                    </p>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-text">Profile</h1>
                    <p className="text-text-muted">
                        Manage your CartWatch profile
                    </p>
                </div>
                <button
                    onClick={logout}
                    className="flex items-center space-x-2 text-danger hover:bg-danger/10 px-3 py-2 rounded-lg transition-colors"
                >
                    <LogOut size={18} />
                    <span>Sign Out</span>
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Personal Information (Username only) */}
                <div className="space-y-6">
                    <Card title="Personal Information">
                        {loading ? (
                            <div className="animate-pulse h-24 bg-surface rounded-xl" />
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-center space-x-3">
                                    <UserIcon
                                        className="text-text-muted"
                                        size={20}
                                    />
                                    <div className="flex-1">
                                        <label
                                            htmlFor="username"
                                            className="block text-sm font-medium text-text mb-2"
                                        >
                                            Username
                                        </label>
                                        <div className="flex items-center space-x-3">
                                            <input
                                                id="username"
                                                value={username}
                                                onChange={(e) =>
                                                    setUsername(e.target.value)
                                                }
                                                className="input flex-1"
                                                placeholder="your-username"
                                            />
                                            <button
                                                onClick={saveUsername}
                                                disabled={savingUsername}
                                                className="btn-secondary"
                                            >
                                                {savingUsername
                                                    ? "Saving…"
                                                    : "Save"}
                                            </button>
                                        </div>
                                        <p className="text-sm text-text-muted mt-2">
                                            Shown across the app.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </Card>

                    {/* Insights within Profile */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card title="Balance">
                            {loading ? (
                                <div className="animate-pulse h-8 bg-surface rounded" />
                            ) : (
                                <Money
                                    amount={balance}
                                    className="text-2xl font-bold"
                                />
                            )}
                        </Card>
                        <Card title="Monthly Spend">
                            {loading ? (
                                <div className="animate-pulse h-8 bg-surface rounded" />
                            ) : (
                                <Money
                                    amount={monthSpend}
                                    className="text-2xl font-bold text-danger"
                                />
                            )}
                        </Card>
                    </div>

                    <Card title="Financial Health Score">
                        {loading ? (
                            <div className="animate-pulse h-24 bg-surface rounded-xl" />
                        ) : (
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-4xl font-bold">
                                        {financialHealthScore}/100
                                    </div>
                                    <p className="text-text-muted">
                                        {financialHealthScore >= 80 ? "Excellent" :
                                         financialHealthScore >= 60 ? "Good" :
                                         financialHealthScore >= 40 ? "Fair" : "Needs Improvement"}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <div className={`w-16 h-16 rounded-full border-4 flex items-center justify-center font-bold ${
                                        financialHealthScore >= 80 ? "border-green-500 text-green-500" :
                                        financialHealthScore >= 60 ? "border-blue-500 text-blue-500" :
                                        financialHealthScore >= 40 ? "border-yellow-500 text-yellow-500" : "border-red-500 text-red-500"
                                    }`}>
                                        {financialHealthScore}
                                    </div>
                                </div>
                            </div>
                        )}
                    </Card>
                </div>

                {/* Right column intentionally minimal */}
                <div className="space-y-6" />
            </div>
        </div>
    );
}
