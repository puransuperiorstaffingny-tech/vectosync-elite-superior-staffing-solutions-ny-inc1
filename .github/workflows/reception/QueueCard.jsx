import { Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";

const priorityStyles = {
  low: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  normal: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  high: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  urgent: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

export default function QueueCard({ query, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-xl border transition-all ${
        active
          ? "border-primary bg-primary/5 glow-cyan-soft"
          : "border-border bg-card hover:border-primary/40"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold truncate flex-1">{query.subject}</p>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${priorityStyles[query.priority] || priorityStyles.normal}`}>
          {query.priority}
        </span>
      </div>
      <p className="text-xs text-muted-foreground truncate mt-1">
        {query.employee_name || "Unassigned employee"}
        {query.category ? ` · ${query.category}` : ""}
      </p>
      <div className="flex items-center justify-between mt-2 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {query.created_date ? format(new Date(query.created_date), "MMM d, h:mm a") : "—"}
        </span>
        {query.assigned_to_name ? (
          <span className="font-medium text-foreground/70 truncate max-w-[100px]">{query.assigned_to_name}</span>
        ) : (
          <span className="flex items-center gap-1 text-amber-600">
            <AlertCircle className="h-3 w-3" /> Unassigned
          </span>
        )}
      </div>
    </button>
  );
}