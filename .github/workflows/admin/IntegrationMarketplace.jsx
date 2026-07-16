import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Mail, FileSpreadsheet, Table2, Calendar, MessageSquare, Bot, Sparkles, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

// Compatible, automation-friendly integrations for this payroll/staffing workflow.
const CATALOG = [
  { key: "gmail", name: "Gmail", category: "Email", icon: Mail, desc: "Send payroll & invoice emails from your Gmail.", color: "text-red-500" },
  { key: "outlook", name: "Outlook", category: "Email", icon: Mail, desc: "Send notifications via your Outlook mailbox.", color: "text-blue-500" },
  { key: "googlesheets", name: "Google Sheets", category: "Spreadsheets", icon: Table2, desc: "Export timesheets & payroll to Sheets.", color: "text-green-600" },
  { key: "excel", name: "Microsoft Excel", category: "Spreadsheets", icon: FileSpreadsheet, desc: "Sync reports to Excel workbooks.", color: "text-emerald-600" },
  { key: "googlecalendar", name: "Google Calendar", category: "Scheduling", icon: Calendar, desc: "Sync shifts, pay dates & deadlines.", color: "text-sky-500" },
  { key: "slack", name: "Slack", category: "Messaging", icon: MessageSquare, desc: "Post approvals & alerts to a channel.", color: "text-violet-500" },
  { key: "gemini", name: "Gemini AI", category: "AI", icon: Sparkles, desc: "AI assistance across your workflow.", color: "text-amber-500" },
  { key: "ai_helper", name: "AI Admin Helper", category: "AI", icon: Bot, desc: "Built-in assistant for data & actions.", color: "text-primary" },
];

export default function IntegrationMarketplace() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [mine, setMine] = useState([]); // AdminIntegration records for this admin
  const [busy, setBusy] = useState(null);

  const load = async () => {
    if (!user?.email) return;
    setLoading(true);
    const recs = await base44.entities.AdminIntegration.filter({ admin_email: user.email });
    setMine(recs);
    setLoading(false);
  };
  useEffect(() => { load(); }, [user?.email]);

  const recFor = (key) => mine.find(m => m.integration_key === key);

  const toggle = async (item) => {
    setBusy(item.key);
    const existing = recFor(item.key);
    const nextEnabled = existing ? !existing.enabled : true;
    if (existing) {
      await base44.entities.AdminIntegration.update(existing.id, { enabled: nextEnabled });
    } else {
      await base44.entities.AdminIntegration.create({
        admin_email: user.email,
        integration_key: item.key,
        integration_name: item.name,
        category: item.category,
        enabled: true,
      });
    }
    // Log to builder audit (profile scope — affects only this admin's workspace)
    await base44.functions.invoke("logIntegrationAction", {
      action: nextEnabled ? "enabled" : "disabled",
      integration_name: item.name,
      category: item.category,
      scope: "profile",
      details: `${user.email} ${nextEnabled ? "enabled" : "disabled"} ${item.name} for their workspace.`,
    });
    toast.success(`${item.name} ${nextEnabled ? "enabled" : "disabled"} for your workspace`);
    setBusy(null);
    load();
  };

  if (loading) return <div className="flex items-center justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-xs text-muted-foreground">
        These integrations enhance <strong>your own workspace only</strong> — enabling or disabling them never changes the core system or other admins' setups. Only compatible, automation-ready services are listed.
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {CATALOG.map(item => {
          const rec = recFor(item.key);
          const on = !!rec?.enabled;
          const Icon = item.icon;
          return (
            <div key={item.key} className={`bg-card border rounded-xl p-4 flex flex-col gap-3 transition-colors ${on ? "border-primary/50" : "border-border"}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="bg-muted rounded-lg p-2"><Icon className={`h-5 w-5 ${item.color}`} /></div>
                  <div>
                    <p className="font-semibold text-sm">{item.name}</p>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{item.category}</p>
                  </div>
                </div>
                {busy === item.key
                  ? <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  : <Switch checked={on} onCheckedChange={() => toggle(item)} />}
              </div>
              <p className="text-xs text-muted-foreground flex-1">{item.desc}</p>
              {on && <span className="text-[11px] text-green-600 font-medium flex items-center gap-1"><Check className="h-3 w-3" /> Active in your workspace</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}