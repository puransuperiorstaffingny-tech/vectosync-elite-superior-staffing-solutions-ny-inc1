import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const TYPE_STYLES = {
  shift: "bg-sky-100 text-sky-700 border-sky-200",
  pay: "bg-green-100 text-green-700 border-green-200",
  deadline: "bg-amber-100 text-amber-700 border-amber-200",
};

function ymd(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }

export default function MonthCalendar({ cursor, setCursor, eventsByDate }) {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const startDay = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = ymd(new Date());

  const cells = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  const monthLabel = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">{monthLabel}</h3>
        <div className="flex gap-1">
          <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setCursor(new Date(year, month - 1, 1))}><ChevronLeft className="h-4 w-4" /></Button>
          <Button size="sm" variant="outline" className="h-8" onClick={() => setCursor(new Date())}>Today</Button>
          <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setCursor(new Date(year, month + 1, 1))}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-muted-foreground mb-1">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => <div key={d}>{d}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((date, i) => {
          if (!date) return <div key={i} className="min-h-[78px] rounded-lg" />;
          const key = ymd(date);
          const evts = eventsByDate[key] || [];
          const isToday = key === todayStr;
          return (
            <div key={i} className={`min-h-[78px] rounded-lg border p-1 text-left ${isToday ? "border-primary bg-primary/5" : "border-border"}`}>
              <div className={`text-[11px] font-semibold mb-0.5 ${isToday ? "text-primary" : "text-muted-foreground"}`}>{date.getDate()}</div>
              <div className="space-y-0.5">
                {evts.slice(0, 3).map((e, idx) => (
                  <div key={idx} className={`text-[10px] leading-tight truncate rounded border px-1 py-0.5 ${TYPE_STYLES[e.type]}`} title={e.label}>
                    {e.label}
                  </div>
                ))}
                {evts.length > 3 && <div className="text-[10px] text-muted-foreground">+{evts.length - 3} more</div>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3 mt-4 text-[11px]">
        <Legend className="bg-sky-400" label="Shifts" />
        <Legend className="bg-green-500" label="Pay Dates" />
        <Legend className="bg-amber-400" label="Deadlines" />
      </div>
    </div>
  );
}

function Legend({ className, label }) {
  return <span className="flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-full ${className}`} /> {label}</span>;
}