import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { History, Loader2, Plug, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const ACTION_COLORS = {
  enabled: "bg-green-100 text-green-700",
  disabled: "bg-red-100 text-red-700",
  configured: "bg-blue-100 text-blue-700",
  updated: "bg-amber-100 text-amber-700",
};

export default function BuilderAuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const recs = await base44.entities.IntegrationLog.list("-created_date", 200);
    setLogs(recs);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><History className="h-4 w-4 text-primary" /><h3 className="font-semibold text-sm">Integration & Update Audit Log</h3></div>
        <Button size="sm" variant="outline" onClick={load} className="gap-1"><RefreshCw className="h-3.5 w-3.5" /> Refresh</Button>
      </div>
      <p className="text-xs text-muted-foreground">Every integration change made by any admin is recorded here so builders always know what was updated and by whom.</p>

      {loading ? (
        <div className="flex items-center justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground bg-card border border-border rounded-xl text-sm">No integration activity recorded yet.</div>
      ) : (
        <div className="space-y-2">
          {logs.map(log => (
            <div key={log.id} className="bg-card border border-border rounded-xl p-3 flex items-start gap-3">
              <div className="bg-muted rounded-lg p-2 mt-0.5"><Plug className="h-4 w-4 text-muted-foreground" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-sm">{log.integration_name}</span>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${ACTION_COLORS[log.action] || "bg-gray-100 text-gray-700"}`}>{log.action}</span>
                  {log.scope && <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{log.scope}</span>}
                </div>
                {log.details && <p className="text-xs text-muted-foreground mt-0.5">{log.details}</p>}
                <p className="text-[11px] text-muted-foreground mt-1">
                  by {log.admin_name || log.admin_email} · {new Date(log.created_date).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}