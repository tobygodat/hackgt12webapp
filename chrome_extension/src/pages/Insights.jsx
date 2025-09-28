  import { useMemo } from "react";
import Card from "../components/Card.jsx";
import ChartPie from "../components/ChartPie.jsx";
import ChartBar from "../components/ChartBar.jsx";
import KPI from "../components/KPI.jsx";
import Money from "../components/Money.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { subMonths, format, startOfMonth, endOfMonth } from "date-fns";
import {
    getAccountByCustomerId,
    getUserProfile,
    getPurchaseTransactions,
} from "../lib/firestore.js";
import { useEffect, useState } from "react";

export default function Insights() {
    const { user } = useAuth();
    const [balance, setBalance] = useState(0);
    const [monthSpend, setMonthSpend] = useState(0);
    const [purchaseTransactions, setPurchaseTransactions] = useState([]);

    // Separate effect for profile data that doesn't depend on transactions
    useEffect(() => {
        let isMounted = true;
        async function hydrateProfile() {
            if (!user) return;
            // balance from accounts/{CustomerID} via profile
            const profile = await getUserProfile(user.uid);
            const customerID = profile?.CustomerID || profile?.customerID;
            if (customerID) {
                const acct = await getAccountByCustomerId(customerID);
                if (isMounted) setBalance(acct?.balance || 0);
            }
        }
        hydrateProfile();
        return () => {
            isMounted = false;
        };
    }, [user]);

    // Separate effect for purchase transaction calculations
    useEffect(() => {
        let isMounted = true;
        async function fetchPurchaseData() {
            if (!user) return;

            try {
                // Get current month date range
                const start = startOfMonth(new Date());
                const end = endOfMonth(new Date());

                // Fetch purchase transactions directly from Firestore for current month
                const currentMonthPurchases = await getPurchaseTransactions(user.uid, { start, end });

                // Fetch all purchase transactions for charts (last 6 months)
                const sixMonthsAgo = subMonths(new Date(), 6);
                const allPurchases = await getPurchaseTransactions(user.uid, { start: sixMonthsAgo });

                if (isMounted) {
                    // Calculate total spending from current month purchase transactions
                    const totalSpend = currentMonthPurchases.reduce((sum, t) => {
                        const amt = typeof t.amount === "number" ? t.amount : parseFloat(t.amount) || 0;
                        return sum + Math.abs(amt);
                    }, 0);

                    setMonthSpend(totalSpend);
                    setPurchaseTransactions(allPurchases);
                }
            } catch (error) {
                console.error("Error fetching purchase transactions:", error);
            }
        }

        fetchPurchaseData();
        return () => {
            isMounted = false;
        };
    }, [user]);

    // Category distribution for pie chart
    const categoryData = useMemo(() => {
        const categories = {};
        purchaseTransactions.forEach((t) => {
            const category = t.category || t.description || "Other";
            const amt = typeof t.amount === "number" ? t.amount : parseFloat(t.amount) || 0;
            categories[category] = (categories[category] || 0) + Math.abs(amt);
        });

        return Object.entries(categories)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 6);
    }, [purchaseTransactions]);

    // Monthly spending for bar chart
    const monthlySpending = useMemo(() => {
        const months = {};
        const now = new Date();

        // Initialize last 6 months
        for (let i = 5; i >= 0; i--) {
            const month = subMonths(now, i);
            const monthKey = format(month, "MMM yyyy");
            months[monthKey] = 0;
        }

        purchaseTransactions.forEach((t) => {
            const date = t.date || new Date(t.purchase_date);
            const monthKey = format(date, "MMM yyyy");
            if (Object.prototype.hasOwnProperty.call(months, monthKey)) {
                const amt = typeof t.amount === "number" ? t.amount : parseFloat(t.amount) || 0;
                months[monthKey] += Math.abs(amt);
            }
        });

        return Object.entries(months).map(([name, value]) => ({ name, value }));
    }, [purchaseTransactions]);

    // Color palette for charts and categories
    const getCategoryColor = (index) => {
        const colors = [
            '#3B82F6', // Blue
            '#EF4444', // Red
            '#10B981', // Green
            '#F59E0B', // Amber
            '#8B5CF6', // Purple
            '#EC4899', // Pink
            '#06B6D4', // Cyan
            '#84CC16', // Lime
        ];
        return colors[index % colors.length];
    };

    // Average monthly spending
    // const avgMonthlySpending = useMemo(() => {
    //   const total = monthlySpending.reduce((sum, month) => sum + month.value, 0);
    //   return total / Math.max(1, monthlySpending.length);
    // }, [monthlySpending]);

    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Card title="Sign In Required" className="max-w-md text-center">
                    <p className="text-text-muted">
                        Please sign in to view your insights.
                    </p>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-text">Insights</h1>
                <p className="text-text-muted">
                    Understand your spending patterns and financial health
                </p>
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <KPI
                        label="Current Balance"
                        value={<Money amount={balance} />}
                        trend={balance > 0 ? "up" : "down"}
                    />
                </Card>
                <Card>
                    <KPI
                        label="Spending this month"
                        value={<Money amount={monthSpend} />}
                    />
                </Card>
                <Card>
                    <KPI label="Transactions" value={purchaseTransactions.length} />
                </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card
                    title="Spending by Category"
                    subtitle="Where your money goes"
                >
                    {categoryData.length > 0 ? (
                        <ChartPie data={categoryData} />
                    ) : (
                        <div className="h-64 flex items-center justify-center text-text-muted">
                            No spending data available
                        </div>
                    )}
                </Card>

                <Card title="Monthly Spending Trend" subtitle="Last 6 months">
                    {monthlySpending.length > 0 ? (
                        <ChartBar data={monthlySpending} color="#3B82F6" />
                    ) : (
                        <div className="h-64 flex items-center justify-center text-text-muted">
                            No spending data available
                        </div>
                    )}
                </Card>
            </div>

            {/* Detailed Analysis */}
            <div className="grid grid-cols-1 gap-6">
                <Card
                    title="Top Spending Categories">
                    <div className="space-y-3">
                        {categoryData.slice(0, 5).map((category, index) => (
                            <div
                                key={category.name}
                                className="flex items-center justify-between"
                            >
                                <div className="flex items-center space-x-3">
                                    <div
                                        className="w-3 h-3 rounded-full"
                                        style={{
                                            backgroundColor: getCategoryColor(index),
                                        }}
                                    />
                                    <span className="text-text">
                                        {category.name}
                                    </span>
                                </div>
                                <Money amount={category.value} />
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        </div>
    );
}
