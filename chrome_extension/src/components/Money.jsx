import PropTypes from "prop-types";

export default function Money({ amount, className = "", showSign = false }) {
    const formatAmount = (amount) => {
        const absAmount = Math.abs(amount);
        if (absAmount >= 1000000) {
            return `${(absAmount / 1000000).toFixed(1)}M`;
        }
        if (absAmount >= 1000) {
            return `${(absAmount / 1000).toFixed(1)}K`;
        }
        return absAmount.toFixed(0);
    };

    const sign = amount >= 0 ? "+" : "-";
    const colorClass = amount >= 0 ? "text-success" : "text-danger";

    return (
        <span className={`${showSign ? colorClass : ""} ${className}`}>
            {showSign && sign}${formatAmount(amount)}
        </span>
    );
}

Money.propTypes = {
    amount: PropTypes.number.isRequired,
    className: PropTypes.string,
    showSign: PropTypes.bool,
};
