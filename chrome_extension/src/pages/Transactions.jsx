import { useState } from "react";
import Card from "../components/Card.jsx";
import FilterBar from "../components/FilterBar.jsx";
import TransactionRow from "../components/TransactionRow.jsx";
import { useTransactions } from "../hooks/useTransactions.js";
import { useAuth } from "../hooks/useAuth.js";
import { Loader2, Plus } from "lucide-react";

export default function Transactions() {
    const { user } = useAuth();
    const [filters, setFilters] = useState({});
    const { groupedTransactions, loading, hasMore, loadMore } = useTransactions(
        {
            pageSize: 50,
            filters,
        }
    );

    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Card title="Sign In Required" className="max-w-md text-center">
                    <p className="text-text-muted">
                        Please sign in to view your transactions.
                    </p>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-text">
                        Transactions
                    </h1>
                    <p className="text-text-muted">
                        Track and analyze your spending patterns
                    </p>
                </div>
                <button className="btn-primary flex items-center space-x-2">
                    <Plus size={18} />
                    <span>Add Transaction</span>
                </button>
            </div>

            {/* Filters */}
            <FilterBar filters={filters} onFiltersChange={setFilters} />

            {/* Transactions List */}
            <div className="space-y-6">
                {Object.entries(groupedTransactions).length > 0 ? (
                    Object.entries(groupedTransactions).map(
                        ([month, transactions]) => (
                            <Card key={month}>
                                <div className="sticky top-0 z-10 -mx-6 -mt-6 px-6 py-3 bg-card/80 backdrop-blur border-b border-border">
                                    <h3 className="text-lg font-semibold text-text">
                                        {month}
                                    </h3>
                                </div>
                                <div className="space-y-0">
                                    {transactions.map((transaction, index) => (
                                        <TransactionRow
                                            key={`${transaction.id || index}`}
                                            transaction={transaction}
                                        />
                                    ))}
                                </div>
                            </Card>
                        )
                    )
                ) : loading ? (
                    <Card className="text-center py-12">
                        <Loader2
                            className="mx-auto mb-4 text-text animate-spin"
                            size={48}
                        />
                        <p className="text-text-muted">
                            Loading transactions...
                        </p>
                    </Card>
                ) : (
                    <Card className="text-center py-12">
                        <h3 className="text-lg font-semibold text-text mb-2">
                            No Transactions Found
                        </h3>
                        <p className="text-text-muted mb-4">
                            {Object.keys(filters).length > 0
                                ? "Try adjusting your filters to see more results."
                                : "Start by adding your first transaction."}
                        </p>
                        <button className="btn-primary">Add Transaction</button>
                    </Card>
                )}

                {/* Load More Button */}
                {hasMore && (
                    <div className="text-center">
                        <button
                            onClick={loadMore}
                            disabled={loading}
                            className="btn-secondary flex items-center space-x-2 mx-auto"
                        >
                            {loading && (
                                <Loader2 className="animate-spin" size={16} />
                            )}
                            <span>Load More</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
