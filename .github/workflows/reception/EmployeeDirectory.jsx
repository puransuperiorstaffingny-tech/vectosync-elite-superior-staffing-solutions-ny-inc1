import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Briefcase, Loader2, Users, ArrowLeft } from "lucide-react";
import EmployeeSummary from "./EmployeeSummary";

export default function EmployeeDirectory() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    base44.entities.Employee.list("first_name", 1000).then((list) => {
      setEmployees(list);
      setLoading(false);
    });
  }, []);

  const term = search.trim().toLowerCase();
  const filtered = employees.filter((e) => {
    if (!term) return true;
    const haystack = [
      e.first_name, e.last_name, e.email, e.location, e.department,
      e.sub_department, e.position, e.city, e.state, e.employee_id_number,
    ].filter(Boolean).join(" ").toLowerCase();
    return haystack.includes(term);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4">
      {/* Directory list */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, location, department…"
            className="pl-9"
          />
        </div>
        <p className="text-[11px] text-muted-foreground px-1">{filtered.length} employee{filtered.length === 1 ? "" : "s"}</p>

        <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No employees match your search.</p>
            </div>
          ) : (
            filtered.map((e) => (
              <button
                key={e.id}
                onClick={() => setSelected(e)}
                className={`w-full text-left p-3 rounded-xl border transition-all ${
                  selected?.id === e.id
                    ? "border-primary bg-primary/5 glow-cyan-soft"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                    {(e.first_name?.[0] || "?")}{(e.last_name?.[0] || "")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{e.first_name} {e.last_name}</p>
                    <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground">
                      {e.location && <span className="flex items-center gap-1 truncate"><MapPin className="h-3 w-3" />{e.location}</span>}
                      {e.department && <span className="flex items-center gap-1 truncate"><Briefcase className="h-3 w-3" />{e.department}</span>}
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Profile summary */}
      <div className="rounded-2xl border border-border bg-background/40 p-4 min-h-[400px]">
        {selected ? (
          <div>
            <button
              onClick={() => setSelected(null)}
              className="lg:hidden flex items-center gap-1 text-xs text-muted-foreground mb-3"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to list
            </button>
            <EmployeeSummary employeeId={selected.id} />
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-center p-8">
            <p className="text-sm text-muted-foreground">Select an employee to view their profile summary.</p>
          </div>
        )}
      </div>
    </div>
  );
}