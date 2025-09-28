import { useMemo } from "react";
import Card from "../components/Card.jsx";
import ChartPie from "../components/ChartPie.jsx";
import ChartBar from "../components/ChartBar.jsx";
import KPI from "../components/KPI.jsx";
import Money from "../components/Money.jsx";
import { useTransactions } from "../hooks/useTransactions.js";
import { useAuth } from "../hooks/useAuth.js";
import { subMonths, format, startOfMonth, endOfMonth } from "date-fns";
import {
    getAccountByCustomerId,
    getSavingsGoal,
    getUserProfile,
} from "../lib/firestore.js";
import { useEffect, useState } from "react";

export default function Insights() {
    const { user } = useAuth();
    const { transactions } = useTransactions({ pageSize: 1000 });
    const [balance, setBalance] = useState(0);
    const [savingsGoal, setSavingsGoal] = useState(0);
    const [monthSpend, setMonthSpend] = useState(0);
    const [monthIncome, setMonthIncome] = useState(0);

    useEffect(() => {
        let isMounted = true;
        async function hydrate() {
            if (!user) return;
            // balance from accounts/{CustomerID} via profile
            const profile = await getUserProfile(user.uid);
            const customerID = profile?.CustomerID || profile?.customerID;
            if (customerID) {
                const acct = await getAccountByCustomerId(customerID);
                if (isMounted) setBalance(acct?.balance || 0);
            }
            const goal = await getSavingsGoal(user.uid);
            if (isMounted) setSavingsGoal(goal || 0);

            // current month spend/income
            const start = startOfMonth(new Date());
            const end = endOfMonth(new Date());
            const txns = transactions.filter((t) => {
                const d = t.date?.toDate?.() || new Date(t.date);
                return d >= start && d <= end;
            });
            let spend = 0,
                income = 0;
            txns.forEach((t) => {
                const amt =
                    typeof t.amount === "number"
                        ? t.amount
                        : parseFloat(t.amount) || 0;
                const isDebit = t.type === "debit" || amt < 0;
                if (isDebit) spend += Math.abs(amt);
                else income += Math.abs(amt);
            });
            if (isMounted) {
                setMonthSpend(spend);
                setMonthIncome(income);
            }
        }
        hydrate();
        return () => {
            isMounted = false;
        };
    }, [user, transactions]);

    // Category distribution for pie chart
    const categoryData = useMemo(() => {
        const categories = {};
        transactions.forEach((t) => {
            if (t.type === "debit" || t.amount < 0) {
                const category = t.category || "Other";
                categories[category] =
                    (categories[category] || 0) + Math.abs(t.amount);
            }
        });

        return Object.entries(categories)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 6);
    }, [transactions]);

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

        transactions.forEach((t) => {
            if (t.type === "debit" || t.amount < 0) {
                const date = t.date?.toDate?.() || new Date(t.date);
                const monthKey = format(date, "MMM yyyy");
                if (Object.prototype.hasOwnProperty.call(months, monthKey)) {
                    months[monthKey] += Math.abs(t.amount);
                }
            }
        });

        return Object.entries(months).map(([name, value]) => ({ name, value }));
    }, [transactions]);

    // Calculate savings rate
    const savingsRate = useMemo(() => {
        if (!savingsGoal) return 0;
        const monthlySavings = Math.max(0, monthIncome - monthSpend);
        return Math.min(100, (monthlySavings / savingsGoal) * 100);
    }, [monthIncome, monthSpend, savingsGoal]);

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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                    <KPI
                        label="Current Balance"
                        value={<Money amount={balance} />}
                        trend={balance > 0 ? "up" : "down"}
                    />
                </Card>
                <Card>
                    <KPI
                        label="Savings Rate"
                        value={`${savingsRate.toFixed(1)}%`}
                        trend={
                            savingsRate > 20
                                ? "up"
                                : savingsRate > 10
                                ? "neutral"
                                : "down"
                        }
                    />
                </Card>
                <Card>
                    <KPI
                        label="This Month Spend"
                        value={<Money amount={monthSpend} />}
                    />
                </Card>
                <Card>
                    <KPI label="Transactions" value={transactions.length} />
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
                        <ChartBar data={monthlySpending} />
                    ) : (
                        <div className="h-64 flex items-center justify-center text-text-muted">
                            No spending data available
                        </div>
                    )}
                </Card>
            </div>

            {/* Detailed Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card
                    title="Top Spending Categories"
                    subtitle="This month's biggest expenses"
                >
                    <div className="space-y-3">
                        {categoryData.slice(0, 5).map((category) => (
                            <div
                                key={category.name}
                                className="flex items-center justify-between"
                            >
                                <div className="flex items-center space-x-3">
                                    <div
                                        className="w-3 h-3 rounded-full"
                                        style={{
                                            backgroundColor:
                                                "var(--brand-glow)",
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

                <Card
                    title="Financial Health Score"
                    subtitle="Based on your spending patterns"
                >
                    <div className="text-center">
                        <div className="text-4xl font-bold text-text mb-2">
                            {Math.round(
                                Math.max(60, Math.min(95, 70 + savingsRate))
                            )}
                        </div>
                        <p className="text-text-muted mb-4">Overall Score</p>
                        <div className="space-y-2 text-left">
                            <div className="flex justify-between">
                                <span className="text-text-muted">
                                    Savings Rate
                                </span>
                                <span
                                    className={
                                        savingsRate > 20
                                            ? "text-success"
                                            : "text-warning"
                                    }
                                >
                                    {savingsRate > 20
                                        ? "Excellent"
                                        : "Needs Improvement"}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-text-muted">
                                    Spending Consistency
                                </span>
                                <span className="text-success">Good</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-text-muted">
                                    Category Balance
                                </span>
                                <span className="text-success">Healthy</span>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
