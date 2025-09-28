import { Search, Calendar, DollarSign } from "lucide-react";
import PropTypes from "prop-types";

export default function FilterBar({ filters, onFiltersChange }) {
    const handleFilterChange = (key, value) => {
        onFiltersChange({ ...filters, [key]: value });
    };

    return (
        <div className="bg-card rounded-2xl p-4 mb-6 border border-border">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="relative">
                    <Search
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted"
                        size={18}
                    />
                    <input
                        type="text"
                        placeholder="Search merchant..."
                        className="input pl-10 w-full"
                        value={filters.search || ""}
                        onChange={(e) =>
                            handleFilterChange("search", e.target.value)
                        }
                    />
                </div>

                <div>
                    <select
                        className="input w-full"
                        value={filters.category || ""}
                        onChange={(e) =>
                            handleFilterChange("category", e.target.value)
                        }
                    >
                        <option value="">All Categories</option>
                        <option value="dining">Dining</option>
                        <option value="coffee">Coffee</option>
                        <option value="subscription">Subscriptions</option>
                        <option value="transportation">Transportation</option>
                        <option value="entertainment">Entertainment</option>
                        <option value="shopping">Shopping</option>
                    </select>
                </div>

                <div className="relative">
                    <Calendar
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted"
                        size={18}
                    />
                    <input
                        type="date"
                        className="input pl-10 w-full"
                        value={filters.startDate || ""}
                        onChange={(e) =>
                            handleFilterChange("startDate", e.target.value)
                        }
                    />
                </div>

                <div className="relative">
                    <Calendar
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted"
                        size={18}
                    />
                    <input
                        type="date"
                        className="input pl-10 w-full"
                        value={filters.endDate || ""}
                        onChange={(e) =>
                            handleFilterChange("endDate", e.target.value)
                        }
                    />
                </div>

                <div className="relative">
                    <DollarSign
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted"
                        size={18}
                    />
                    <input
                        type="number"
                        placeholder="Min amount"
                        className="input pl-10 w-full"
                        value={filters.minAmount || ""}
                        onChange={(e) =>
                            handleFilterChange("minAmount", e.target.value)
                        }
                    />
                </div>

                <div className="relative">
                    <DollarSign
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted"
                        size={18}
                    />
                    <input
                        type="number"
                        placeholder="Max amount"
                        className="input pl-10 w-full"
                        value={filters.maxAmount || ""}
                        onChange={(e) =>
                            handleFilterChange("maxAmount", e.target.value)
                        }
                    />
                </div>
            </div>
        </div>
    );
}

FilterBar.propTypes = {
    filters: PropTypes.object.isRequired,
    onFiltersChange: PropTypes.func.isRequired,
};
