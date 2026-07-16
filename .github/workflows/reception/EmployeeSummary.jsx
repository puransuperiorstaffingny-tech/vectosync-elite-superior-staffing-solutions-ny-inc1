import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Mail, Phone, MapPin, Briefcase, DollarSign, Clock, CalendarClock, Receipt } from "lucide-react";
import { format } from "date-fns";

export default function EmployeeSummary({ employeeId, employeeEmail }) {
  const [employee, setEmployee] = useState(null);
  const [recentEntries, setRecentEntries] = useState([]);
  const [recentPay, setRecentPay] = useState([]);
  const [upcomingShifts, setUpcomingShifts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      let emp = null;
      if (employeeId) {
        const list = await base44.entities.Employee.filter({ id: employeeId });
        emp = list[0] || null;
      } else if (employeeEmail) {
        const list = await base44.entities.Employee.filter({ email: employeeEmail });
        emp = list[0] || null;
      }
      if (cancelled) return;
      setEmployee(emp);

      if (emp) {
        const [entries, pay, shifts] = await Promise.all([
          base44.entities.TimeEntry.filter({ employee_id: emp.id }, "-date", 2),
          base44.entities.PayrollItem.filter({ employee_id: emp.id }, "-created_date", 2),
          base44.entities.Shift.filter({ employee_id: emp.id }, "date", 20),
        ]);
        if (cancelled) return;
        const today = format(new Date(), "yyyy-MM-dd");
        setRecentEntries(entries);
        setRecentPay(pay);
        setUpcomingShifts(shifts.filter((s) => s.date >= today && s.status !== "cancelled").slice(0, 3));
      } else {
        setRecentEntries([]);
        setRecentPay([]);
        setUpcomingShifts([]);
      }
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [employeeId, employeeEmail]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-slate-200 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="p-4 rounded-xl border border-dashed border-border text-sm text-muted-foreground text-center">
        No matching employee record found for this query.
      </div>
    );
  }

  const transactions = [
    ...recentEntries.map((e) => ({
      key: `t-${e.id}`,
      icon: Clock,
      label: `Time entry · ${e.total_hours != null ? `${e.total_hours}h` : "—"}`,
      sub: e.date ? format(new Date(e.date), "MMM d, yyyy") : "",
      status: e.status,
    })),
    ...recentPay.map((p) => ({
      key: `p-${p.id}`,
      icon: DollarSign,
      label: `Payroll · ${p.net_pay != null ? `$${Number(p.net_pay).toFixed(2)} net` : "—"}`,
      sub: p.period_end ? format(new Date(p.period_end), "MMM d, yyyy") : "",
      status: null,
    })),
  ].slice(0, 2);

  return (
    <div className="space-y-4">
      {/* Key details */}
      <div className="p-4 rounded-xl bg-card border border-border">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
            {(employee.first_name?.[0] || "?")}{(employee.last_name?.[0] || "")}
          </div>
          <div className="min-w-0">
            <p className="font-semibold truncate">{employee.first_name} {employee.last_name}</p>
            <p className="text-xs text-muted-foreground truncate">{employee.position || "—"} · {employee.status}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {employee.email && <Detail icon={Mail} text={employee.email} />}
          {employee.phone && <Detail icon={Phone} text={employee.phone} />}
          {employee.department && <Detail icon={Briefcase} text={employee.department} />}
          {(employee.city || employee.state) && <Detail icon={MapPin} text={[employee.city, employee.state].filter(Boolean).join(", ")} />}
          <Detail icon={DollarSign} text={employee.pay_type === "salaried" ? `Salaried${employee.annual_salary ? ` · $${employee.annual_salary}/yr` : ""}` : `Hourly${employee.hourly_rate ? ` · $${employee.hourly_rate}/hr` : ""}`} />
        </div>
      </div>

      {/* Recent transactions */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
          <Receipt className="h-3.5 w-3.5" /> Recent Transactions
        </p>
        {transactions.length === 0 ? (
          <p className="text-xs text-muted-foreground">No recent activity.</p>
        ) : (
          <div className="space-y-2">
            {transactions.map((t) => (
              <div key={t.key} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/40 text-xs">
                <t.icon className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="flex-1 font-medium">{t.label}</span>
                <span className="text-muted-foreground">{t.sub}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
          <CalendarClock className="h-3.5 w-3.5" /> Upcoming
        </p>
        {upcomingShifts.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nothing scheduled.</p>
        ) : (
          <div className="space-y-2">
            {upcomingShifts.map((s) => (
              <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/40 text-xs">
                <CalendarClock className="h-4 w-4 text-accent flex-shrink-0" />
                <span className="flex-1 font-medium">{s.start_time}–{s.end_time} {s.location_name ? `· ${s.location_name}` : ""}</span>
                <span className="text-muted-foreground">{s.date ? format(new Date(s.date), "MMM d") : ""}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Detail({ icon: Icon, text }) {
  return (
    <div className="flex items-center gap-1.5 text-muted-foreground">
      <Icon className="h-3.5 w-3.5 flex-shrink-0" />
      <span className="truncate text-foreground/80">{text}</span>
    </div>
  );
}