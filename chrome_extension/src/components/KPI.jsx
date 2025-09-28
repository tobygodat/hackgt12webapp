import PropTypes from "prop-types";

export default function KPI({ label, value, change, trend, className = "" }) {
    let trendColor = "text-text-muted";
    if (trend === "up") trendColor = "text-success";
    else if (trend === "down") trendColor = "text-danger";

    return (
        <div className={`p-4 ${className}`}>
            <div className="flex items-center justify-between">
                <span className="text-sm text-text-muted">{label}</span>
                {change && (
                    <span className={`text-sm ${trendColor}`}>
                        {change > 0 ? "+" : ""}
                        {change}%
                    </span>
                )}
            </div>
            <div className="mt-2">
                <span className="text-2xl font-bold text-text">{value}</span>
            </div>
        </div>
    );
}

KPI.propTypes = {
    label: PropTypes.string.isRequired,
    value: PropTypes.node.isRequired,
    change: PropTypes.number,
    trend: PropTypes.oneOf(["up", "down", "neutral"]),
    className: PropTypes.string,
};
