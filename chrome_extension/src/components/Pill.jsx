export default function Pill({
    children,
    variant = "default",
    className = "",
}) {
    const variants = {
        default: "bg-surface text-text-muted",
        primary: "bg-surfaceAlt text-text",
        success: "bg-success/20 text-success",
        warning: "bg-warning/20 text-warning",
        danger: "bg-danger/20 text-danger",
    };

    return (
        <span
            className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${variants[variant]} ${className}`}
        >
            {children}
        </span>
    );
}
