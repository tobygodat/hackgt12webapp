import { format } from "date-fns";
import Money from "./Money.jsx";
import Pill from "./Pill.jsx";

export default function TransactionRow({ transaction }) {
  const { merchant, category, amount, date, type } = transaction;
  const isDebit = type === "debit" || amount < 0;

  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-b-0">
      <div className="flex-1">
        <div className="flex items-center space-x-3">
          <div>
            <p className="font-medium text-text">{merchant}</p>
            <p className="text-sm text-text-muted">
              {format(date?.toDate?.() || new Date(date), "MMM d, yyyy")}
            </p>
          </div>
        </div>
      </div>
      <div className="flex items-center space-x-3">
        <Pill variant="default">{category}</Pill>
        <Money
          amount={Math.abs(amount)}
          className={`font-semibold ${isDebit ? "text-danger" : "text-success"}`}
          showSign={!isDebit}
        />
      </div>
    </div>
  );
}