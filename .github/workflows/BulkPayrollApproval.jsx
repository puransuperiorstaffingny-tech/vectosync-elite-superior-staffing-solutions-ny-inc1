import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, XCircle, Clock, Loader2, ChevronDown, ChevronUp } from "lucide-react";

/**
 * Bulk approval panel for pending payroll time entries, shown on the Payroll Dashboard.
 * Select multiple entries and approve/reject them all in one click.
 */
export default function BulkPayrollApproval() {
  const [entries, setEntries] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const load = async () => {
    setLoading(true);
    const pending = await base44.entities.TimeEntry.filter({ status: "pending" }, "-date", 500);
    setEntries(pending);
    setSelected(new Set());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggle = (id) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === entries.length) setSelected(new Set());
    else setSelected(new Set(entries.map(e => e.id)));
  };

  const bulkUpdate = async (status) => {
    setProcessing(true);
    await Promise.all(Array.from(selected).map(id => base44.entities.TimeEntry.update(id, { status })));
    setProcessing(false);
    load();
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-5 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading pending entries...
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-2 text-sm text-muted-foreground">
        <CheckCircle2 className="h-4 w-4 text-green-600" /> No pending time entries — all caught up.
      </div>
    );
  }

  return (
    <div className="bg-card border border-cyan-500/20 rounded-xl shadow-[0_2px_18px_-6px_hsla(190,85%,45%,0.25)] overflow-hidden">
      <div className="px-5 py-3 flex items-center justify-between bg-muted/30 border-b border-border">
        <button className="flex items-center gap-2" onClick={() => setCollapsed(c => !c)}>
          <Clock className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Pending Approvals ({entries.length})</h3>
          {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </button>
        {selected.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-primary">{selected.size} selected</span>
            <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" disabled={processing} onClick={() => bulkUpdate("rejected")}>
              <XCircle className="h-3.5 w-3.5" /> Reject
            </Button>
            <Button size="sm" className="h-8 gap-1 text-xs" disabled={processing} onClick={() => bulkUpdate("approved")}>
              {processing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Approve ({selected.size})
            </Button>
          </div>
        )}
      </div>

      {!collapsed && (
        <div className="max-h-72 overflow-y-auto">
          <div className="px-5 py-2 flex items-center gap-3 border-b border-border bg-muted/10">
            <Checkbox checked={selected.size === entries.length && entries.length > 0} onCheckedChange={toggleAll} />
            <span className="text-xs font-medium text-muted-foreground">Select all</span>
          </div>
          {entries.map(entry => (
            <div key={entry.id} className={`px-5 py-2.5 flex items-center gap-3 border-b border-border last:border-0 hover:bg-muted/10 ${selected.has(entry.id) ? "bg-primary/5" : ""}`}>
              <Checkbox checked={selected.has(entry.id)} onCheckedChange={() => toggle(entry.id)} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{entry.employee_name}</p>
                <p className="text-xs text-muted-foreground">{entry.date} · {(entry.total_hours || 0).toFixed(1)}h{entry.location_name ? ` · ${entry.location_name}` : ""}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}