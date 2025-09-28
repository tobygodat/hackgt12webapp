export default function Card({ children, className = "", title, subtitle, ...props }) {
  return (
    <div className={`card ${className}`} {...props}>
      {title && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-text">{title}</h3>
          {subtitle && <p className="text-sm text-text-muted mt-1">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
}