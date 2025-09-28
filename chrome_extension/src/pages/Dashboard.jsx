import { useState, useMemo } from "react";
import Card from "../components/Card.jsx";
import Kpi from "../components/KPI.jsx";
import Money from "../components/Money.jsx";
import Pill from "../components/Pill.jsx";
import ChartLineBand from "../components/ChartLineBand.jsx";
import { useAccounts } from "../hooks/useAccounts.js";
import { useSimulation } from "../hooks/useSimulation.js";
import { useTransactions } from "../hooks/useTransactions.js";
import { useAppStore } from "../store/useAppStore.js";
import { ShoppingCart, TrendingUp, AlertTriangle } from "lucide-react";

export default function Dashboard() {
    const { totalBalance } = useAccounts();
    const { transactions } = useTransactions({ pageSize: 1000 });
    const {
        pendingPurchaseAmount,
        setPendingPurchaseAmount,
        appliedRecommendations,
        applyRecommendation,
    } = useAppStore();
    const [purchaseInput, setPurchaseInput] = useState(
        pendingPurchaseAmount || 500
    );

    // Calculate estimated monthly income/expenses from recent transactions
    const estimatedMonthlyStats = useMemo(() => {
        if (!transactions.length) {
            return { incomeMean: 5000, expenseMean: 3500 }; // defaults
        }

        const now = new Date();
        const threeMonthsAgo = new Date(
            now.getFullYear(),
            now.getMonth() - 3,
            now.getDate()
        );

        const recentTransactions = transactions.filter((t) => {
            const transactionDate = t.date?.toDate?.() || new Date(t.date);
            return transactionDate >= threeMonthsAgo;
        });

        const totalIncome = recentTransactions
            .filter((t) => t.type === "credit" || t.amount > 0)
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);

        const totalExpenses = recentTransactions
            .filter((t) => t.type === "debit" || t.amount < 0)
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);

        const monthsOfData = Math.max(
            1,
            (now - threeMonthsAgo) / (1000 * 60 * 60 * 24 * 30)
        );

        return {
            incomeMean: Math.max(1000, totalIncome / monthsOfData),
            expenseMean: Math.max(500, totalExpenses / monthsOfData),
        };
    }, [transactions]);

    const { simulation, loading } = useSimulation({
        purchaseAmount: pendingPurchaseAmount,
        horizonMonths: 12,
        volatility: 0.15,
        incomeMean: estimatedMonthlyStats.incomeMean,
        expenseMean: estimatedMonthlyStats.expenseMean,
    });

    const handleSetPurchase = () => {
        setPendingPurchaseAmount(purchaseInput);
    };

    const recommendations = simulation?.outputs?.recommendations || [];
    const topRecommendations = recommendations.slice(0, 3);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-text">
                        Welcome back
                    </h1>
                    <p className="text-text-muted">
                        Here&apos;s your financial overview
                    </p>
                </div>
                <div className="flex items-center space-x-4">
                    <Money
                        amount={totalBalance}
                        className="text-2xl font-bold"
                    />
                    <span className="text-text-muted">Total Balance</span>
                </div>
            </div>

            {/* Purchase Input */}
            <Card
                title="Financial Twin Simulator"
                subtitle="See the long-term impact of your purchase decisions"
            >
                <div className="flex items-center space-x-4">
                    <div className="flex-1">
                        <label
                            htmlFor="purchaseAmount"
                            className="block text-sm font-medium text-text mb-2"
                        >
                            Purchase Amount
                        </label>
                        <input
                            id="purchaseAmount"
                            type="number"
                            value={purchaseInput}
                            onChange={(e) =>
                                setPurchaseInput(Number(e.target.value))
                            }
                            className="input w-full"
                            placeholder="Enter purchase amount..."
                        />
                    </div>
                    <button
                        onClick={handleSetPurchase}
                        className="btn-primary mt-6"
                        disabled={loading}
                    >
                        {loading ? "Simulating..." : "Run Simulation"}
                    </button>
                </div>
            </Card>

            {/* Financial Twin Results */}
            {pendingPurchaseAmount > 0 && simulation && (
                <>
                    {/* Balance Projection Chart */}
                    <Card
                        title="Balance Projection"
                        subtitle="12-month outlook with uncertainty bands"
                    >
                        <ChartLineBand data={simulation.outputs.series} />
                    </Card>

                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card>
                            <Kpi
                                label="Balance in 6 months"
                                value={
                                    <Money
                                        amount={
                                            simulation.outputs.series[5]?.p50 ||
                                            0
                                        }
                                        className="text-2xl font-bold"
                                    />
                                }
                                trend={
                                    simulation.outputs.series[5]?.p50 >
                                    totalBalance
                                        ? "up"
                                        : "down"
                                }
                            />
                        </Card>

                        <Card>
                            <Kpi
                                label="Balance in 12 months"
                                value={
                                    <Money
                                        amount={
                                            simulation.outputs.series[11]
                                                ?.p50 || 0
                                        }
                                        className="text-2xl font-bold"
                                    />
                                }
                                trend={
                                    simulation.outputs.series[11]?.p50 >
                                    totalBalance
                                        ? "up"
                                        : "down"
                                }
                            />
                        </Card>

                        <Card>
                            <Kpi
                                label="Shortfall Risk"
                                value={`${Math.round(
                                    simulation.outputs.series[11]?.p10 < 0
                                        ? 25
                                        : 5
                                )}%`}
                                trend={
                                    simulation.outputs.series[11]?.p10 < 0
                                        ? "down"
                                        : "up"
                                }
                            />
                        </Card>
                    </div>

                    {/* Impact Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card title="Debt & Goals Impact">
                            <div className="space-y-3">
                                {simulation.outputs.debtImpactMonths > 0 && (
                                    <div className="flex items-center space-x-3">
                                        <AlertTriangle
                                            className="text-warning"
                                            size={20}
                                        />
                                        <span className="text-text">
                                            Debt payoff delayed by{" "}
                                            {
                                                simulation.outputs
                                                    .debtImpactMonths
                                            }{" "}
                                            months
                                        </span>
                                    </div>
                                )}
                                {simulation.outputs.goalDelays?.length > 0 ? (
                                    simulation.outputs.goalDelays.map(
                                        (delay) => (
                                            <Pill
                                                key={`${
                                                    delay.label || "goal"
                                                }-${delay.delay}`}
                                                variant="warning"
                                            >
                                                Goal delayed: {delay.delay}{" "}
                                                months
                                            </Pill>
                                        )
                                    )
                                ) : (
                                    <div className="flex items-center space-x-3">
                                        <TrendingUp
                                            className="text-success"
                                            size={20}
                                        />
                                        <span className="text-text-muted">
                                            No significant goal delays
                                        </span>
                                    </div>
                                )}
                            </div>
                        </Card>

                        <Card
                            title="Smart Alternatives"
                            subtitle="Consider these money-saving options"
                        >
                            <div className="space-y-3">
                                {topRecommendations.length > 0 ? (
                                    topRecommendations.map((rec) => (
                                        <div
                                            key={rec.id}
                                            className="flex items-center justify-between p-3 bg-surface rounded-lg"
                                        >
                                            <div>
                                                <p className="font-medium text-text">
                                                    Reduce {rec.label}
                                                </p>
                                                <p className="text-sm text-text-muted">
                                                    Save{" "}
                                                    <Money
                                                        amount={rec.monthlySave}
                                                    />{" "}
                                                    monthly
                                                </p>
                                            </div>
                                            <button
                                                onClick={() =>
                                                    applyRecommendation(rec)
                                                }
                                                disabled={appliedRecommendations.includes(
                                                    rec.id
                                                )}
                                                className={`px-3 py-1 rounded-md text-sm font-medium ${
                                                    appliedRecommendations.includes(
                                                        rec.id
                                                    )
                                                        ? "bg-success/20 text-success"
                                                        : "btn-primary"
                                                }`}
                                            >
                                                {appliedRecommendations.includes(
                                                    rec.id
                                                )
                                                    ? "Applied"
                                                    : "Apply"}
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-text-muted">
                                        No specific recommendations available
                                    </p>
                                )}
                            </div>
                        </Card>
                    </div>
                </>
            )}

            {/* Default state when no purchase amount */}
            {pendingPurchaseAmount === 0 && (
                <Card title="Get Started" className="text-center">
                    <ShoppingCart
                        className="mx-auto mb-4 text-text"
                        size={48}
                    />
                    <h3 className="text-lg font-semibold text-text mb-2">
                        Simulate Your Next Purchase
                    </h3>
                    <p className="text-text-muted mb-4">
                        Enter a purchase amount above to see its long-term
                        financial impact and discover smart alternatives.
                    </p>
                </Card>
            )}
        </div>
    );
}
