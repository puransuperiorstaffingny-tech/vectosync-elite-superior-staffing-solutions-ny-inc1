import { useState } from "react";
import { Users, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { base44 } from "@/api/base44Client";

const FIELDS = [
  { key: "status", label: "Status", type: "select", options: ["active", "inactive", "terminated"] },
  { key: "department", label: "Department", type: "text" },
  { key: "position", label: "Position / Title", type: "text" },
  { key: "location", label: "Location", type: "text" },
  { key: "pay_type", label: "Pay Type", type: "select", options: ["hourly", "salaried"] },
  { key: "hourly_rate", label: "Hourly Rate ($)", type: "number" },
  { key: "annual_salary", label: "Annual Salary ($)", type: "number" },
  { key: "overtime_eligible", label: "Overtime Eligible", type: "select", options: ["true", "false"] },
  { key: "overtime_rate_multiplier", label: "OT Multiplier", type: "number" },
  { key: "weekly_hours_threshold", label: "Weekly Hours Threshold", type: "number" },
  { key: "tax_federal_pct", label: "Federal Tax %", type: "number" },
  { key: "tax_state_pct", label: "State Tax %", type: "number" },
  { key: "tax_local_pct", label: "Local Tax %", type: "number" },
  { key: "deduction_401k_pct", label: "401(k) %", type: "number" },
  { key: "deduction_health", label: "Health Insurance ($)", type: "number" },
  { key: "deduction_other", label: "Other Deduction ($)", type: "number" },
];

export default function BulkEmployeeEdit({ open, onOpenChange, selectedIds, employees, onDone }) {
  const [changes, setChanges] = useState({}); // { fieldKey: value }
  const [saving, setSaving] = useState(false);

  const selectedEmployees = employees.filter(e => selectedIds.includes(e.id));

  const toggleField = (key) => {
    setChanges(prev => {
      const next = { ...prev };
      if (key in next) {
        delete next[key];
      } else {
        next[key] = "";
      }
      return next;
    });
  };

  const setFieldValue = (key, value) => {
    setChanges(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    const activeChanges = Object.fromEntries(
      Object.entries(changes).filter(([, v]) => v !== "" && v !== undefined)
    );
    if (Object.keys(activeChanges).length === 0) return;

    setSaving(true);

    // Coerce types
    const payload = {};
    Object.entries(activeChanges).forEach(([key, val]) => {
      const field = FIELDS.find(f => f.key === key);
      if (field?.type === "number") payload[key] = Number(val);
      else if (key === "overtime_eligible") payload[key] = val === "true";
      else payload[key] = val;
    });

    await Promise.all(selectedIds.map(id => base44.entities.Employee.update(id, payload)));
    setSaving(false);
    setChanges({});
    onDone?.();
    onOpenChange(false);
  };

  const activeCount = Object.keys(changes).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Bulk Edit — {selectedIds.length} Employee{selectedIds.length !== 1 ? "s" : ""}
          </DialogTitle>
        </DialogHeader>

        <div className="py-2 space-y-4">
          {/* Selected employee names */}
          <div className="bg-muted/40 rounded-lg px-4 py-3 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Applying to: </span>
            {selectedEmployees.slice(0, 5).map(e => `${e.first_name} ${e.last_name}`).join(", ")}
            {selectedEmployees.length > 5 && ` and ${selectedEmployees.length - 5} more`}
          </div>

          <p className="text-sm text-muted-foreground">
            Check the fields you want to update. Only checked fields will be changed — all other employee data stays the same.
          </p>

          <div className="space-y-3">
            {FIELDS.map(field => {
              const isActive = field.key in changes;
              return (
                <div
                  key={field.key}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors cursor-pointer ${isActive ? "border-primary bg-primary/5" : "border-border hover:bg-muted/20"}`}
                >
                  {/* Checkbox */}
                  <div
                    className={`h-5 w-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${isActive ? "bg-primary border-primary" : "border-input"}`}
                    onClick={() => toggleField(field.key)}
                  >
                    {isActive && <Check className="h-3 w-3 text-white" />}
                  </div>

                  {/* Label */}
                  <div className="w-44 flex-shrink-0" onClick={() => toggleField(field.key)}>
                    <Label className={`cursor-pointer ${isActive ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                      {field.label}
                    </Label>
                  </div>

                  {/* Input */}
                  <div className="flex-1">
                    {field.type === "select" ? (
                      <Select
                        value={changes[field.key] || ""}
                        onValueChange={v => { if (!isActive) toggleField(field.key); setFieldValue(field.key, v); }}
                        disabled={!isActive}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          {field.options.map(o => (
                            <SelectItem key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        type={field.type}
                        className="h-8"
                        disabled={!isActive}
                        value={changes[field.key] || ""}
                        onChange={e => setFieldValue(field.key, e.target.value)}
                        placeholder={isActive ? `Enter ${field.label.toLowerCase()}` : "—"}
                        onClick={() => { if (!isActive) toggleField(field.key); }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={saving || activeCount === 0}
              className="gap-2"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {saving ? "Applying..." : `Apply ${activeCount} Change${activeCount !== 1 ? "s" : ""} to ${selectedIds.length} Employee${selectedIds.length !== 1 ? "s" : ""}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}