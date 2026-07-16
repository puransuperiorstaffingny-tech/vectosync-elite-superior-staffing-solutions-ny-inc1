import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, CreditCard } from "lucide-react";

function empToCard(emp) {
  return {
    first_name: emp.first_name || "",
    middle_name: emp.middle_name || "",
    last_name: emp.last_name || "",
    card_id: (emp.paycard_id || "").toString().trim().slice(0, 10),
    address_line1: emp.address_line1 || "",
    address_line2: emp.address_line2 || "",
    city: emp.city || "",
    state: emp.state || "",
    zip: (emp.zip_code || "").toString().replace(/\D/g, ""),
    country: "US",
    dob: (emp.dob || "").toString().replace(/\D/g, "").slice(0, 8),
    ssn: (emp.ssn_full || emp.ssn_last4 || "").toString().replace(/\D/g, "").slice(0, 9),
    employee_id: emp.employee_id_number || "",
    email: emp.email || "",
    phone: emp.phone || "",
  };
}

function enrollIssues(emp) {
  const issues = [];
  const ssn = (emp.ssn_full || emp.ssn_last4 || "").toString().replace(/\D/g, "");
  const cardId = (emp.paycard_id || "").toString().trim();
  const dob = (emp.dob || "").toString().replace(/\D/g, "");
  if (!emp.first_name || !emp.last_name) issues.push("name");
  if (ssn.length !== 9) issues.push("full 9-digit SSN");
  if (cardId.length !== 10) issues.push("10-digit Paycard ID");
  if (dob.length !== 8) issues.push("date of birth");
  if (!emp.address_line1 || !emp.city || !emp.state) issues.push("address");
  return issues;
}

export default function ApiEnrollDialog({ open, onOpenChange, employees, onEnrolled }) {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState([]);

  const run = async () => {
    setRunning(true);
    setResults([]);
    const out = [];

    for (const emp of employees) {
      const issues = enrollIssues(emp);
      if (issues.length > 0) {
        out.push({
          id: emp.id,
          name: `${emp.first_name} ${emp.last_name}`,
          ok: false,
          message: `Missing: ${issues.join(", ")} — fix on the employee record first`,
        });
        setResults([...out]);
        continue;
      }

      try {
        const res = await base44.functions.invoke("enrollRapidCard", { card: empToCard(emp) });
        const data = res.data || {};

        if (data.success) {
          if (data.cardNumber) {
            try {
              await base44.entities.Employee.update(emp.id, {
                paycard_id: data.cardNumber.replace(/[^0-9]/g, ""),
              });
            } catch (saveErr) {
              console.warn("Could not save cardNumber back to employee:", saveErr.message);
            }
          }
          out.push({
            id: emp.id,
            name: `${emp.first_name} ${emp.last_name}`,
            ok: true,
            message: `Card issued: ${data.cardNumber || "success"}`,
          });
        } else {
          out.push({
            id: emp.id,
            name: `${emp.first_name} ${emp.last_name}`,
            ok: false,
            message: data.error || "Failed",
          });
        }
      } catch (e) {
        const msg = e?.response?.data?.error || e.message || "Request failed";
        out.push({
          id: emp.id,
          name: `${emp.first_name} ${emp.last_name}`,
          ok: false,
          message: msg,
        });
      }

      setResults([...out]);
    }

    // Write audit log entry to RapidExportLog
    try {
      const me = await base44.auth.me();
      const successCount = out.filter(r => r.ok).length;
      const failCount = out.filter(r => !r.ok).length;
      await base44.entities.RapidExportLog.create({
        export_type: "api_enroll",
        record_count: employees.length,
        ready_count: successCount,
        status: failCount === 0 ? "generated" : successCount === 0 ? "failed" : "needs_attention",
        notes: `API enrollment: ${successCount} succeeded, ${failCount} failed`,
        performed_by: me?.email || "",
      });
    } catch { /* audit log is best-effort */ }

    setRunning(false);
    if (onEnrolled) onEnrolled();
  };

  const done = results.length === employees.length && !running;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Enroll {employees.length} card{employees.length === 1 ? "" : "s"} via Rapid API
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Registers each selected employee with Rapid (Instant Issue) and returns the new card number.
          The card number is automatically saved to the employee record.
        </p>

        {results.length > 0 && (
          <div className="max-h-64 overflow-y-auto border border-border rounded-lg divide-y divide-border">
            {results.map((r) => (
              <div key={r.id} className="flex items-start gap-2 p-2.5 text-sm">
                {r.ok
                  ? <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  : <XCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                }
                <div className="min-w-0">
                  <div className="font-medium">{r.name}</div>
                  <div className={`text-xs ${r.ok ? "text-muted-foreground" : "text-destructive"} break-words`}>
                    {r.message}
                  </div>
                </div>
              </div>
            ))}
            {running && (
              <div className="flex items-center gap-2 p-2.5 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Processing…
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={running}>
            {done ? "Close" : "Cancel"}
          </Button>
          {!done && (
            <Button onClick={run} disabled={running || employees.length === 0} className="gap-2">
              {running
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <CreditCard className="h-4 w-4" />
              }
              Enroll Now
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}