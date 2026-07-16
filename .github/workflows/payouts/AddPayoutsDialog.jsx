import { useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";

export default function AddPayoutsDialog({ open, onOpenChange, run, employees, existingEmployeeIds, onAdded }) {
  const [amounts, setAmounts] = useState({});
  const [selected, setSelected] = useState({});
  const [saving, setSaving] = useState(false);

  const available = employees.filter((e) => !existingEmployeeIds.includes(e.id));

  const toggle = (id) => setSelected((s) => ({ ...s, [id]: !s[id] }));
  const setAmt = (id, v) => setAmounts((a) => ({ ...a, [id]: v }));

  const save = async () => {
    const rows = available
      .filter((e) => selected[e.id] && Number(amounts[e.id]) > 0)
      .map((e) => ({
        payroll_run_id: run.id,
        employee_id: e.id,
        employee_name: `${e.first_name} ${e.last_name}`,
        employee_email: e.email,
        amount: Number(amounts[e.id]),
        status: "pending",
      }));
    if (rows.length === 0) return;
    setSaving(true);
    try {
      await base44.entities.Payout.bulkCreate(rows);
      onAdded();
      onOpenChange(false);
      setAmounts({}); setSelected({});
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Add Employees to Payroll Run</DialogTitle></DialogHeader>
        <div className="max-h-96 overflow-y-auto space-y-2">
          {available.length === 0 && (
            <p className="text-sm text-muted-foreground py-6 text-center">All employees are already in this run.</p>
          )}
          {available.map((e) => (
            <div key={e.id} className="flex items-center gap-3 rounded-lg border p-2">
              <Checkbox checked={!!selected[e.id]} onCheckedChange={() => toggle(e.id)} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{e.first_name} {e.last_name}</p>
                <p className="text-xs text-muted-foreground truncate">{e.email}</p>
              </div>
              <div className="relative w-28">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input
                  className="pl-5"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amounts[e.id] || ""}
                  onChange={(ev) => setAmt(e.id, ev.target.value)}
                />
              </div>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Add to Run
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}