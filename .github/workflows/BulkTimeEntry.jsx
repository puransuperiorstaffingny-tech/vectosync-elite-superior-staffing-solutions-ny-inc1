import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Trash2, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

export default function BulkTimeEntry({ open, onOpenChange, employees, onComplete }) {
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [rows, setRows] = useState([
    { date: new Date().toISOString().slice(0, 10), clock_in: "09:00", clock_out: "17:00", break_minutes: 30, location_name: "", notes: "" }
  ]);
  const [saving, setSaving] = useState(false);

  const calcHours = (clockIn, clockOut, breakMin) => {
    if (!clockIn || !clockOut) return 0;
    const [inH, inM] = clockIn.split(":").map(Number);
    const [outH, outM] = clockOut.split(":").map(Number);
    const totalMin = (outH * 60 + outM) - (inH * 60 + inM) - (breakMin || 0);
    return Math.max(0, Math.round((totalMin / 60) * 100) / 100);
  };

  const toggleEmployee = (id) => {
    setSelectedEmployees(prev =>
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    );
  };

  const addRow = () => {
    setRows(prev => [...prev, { date: "", clock_in: "09:00", clock_out: "17:00", break_minutes: 30, location_name: "", notes: "" }]);
  };

  const removeRow = (i) => setRows(prev => prev.filter((_, idx) => idx !== i));

  const updateRow = (i, field, value) => {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
  };

  const handleSave = async () => {
    if (!selectedEmployees.length || !rows.length) return;
    setSaving(true);
    const toCreate = [];
    for (const empId of selectedEmployees) {
      const emp = employees.find(e => e.id === empId);
      for (const row of rows) {
        if (!row.date) continue;
        toCreate.push({
          employee_id: empId,
          employee_name: emp ? `${emp.first_name} ${emp.last_name}` : "Unknown",
          date: row.date,
          clock_in: row.clock_in,
          clock_out: row.clock_out,
          break_minutes: Number(row.break_minutes),
          total_hours: calcHours(row.clock_in, row.clock_out, row.break_minutes),
          location_name: row.location_name,
          notes: row.notes,
          entry_method: "manual",
          status: "pending",
        });
      }
    }
    await base44.entities.TimeEntry.bulkCreate(toCreate);
    setSaving(false);
    onOpenChange(false);
    setSelectedEmployees([]);
    setRows([{ date: new Date().toISOString().slice(0, 10), clock_in: "09:00", clock_out: "17:00", break_minutes: 30, location_name: "", notes: "" }]);
    onComplete();
  };

  const totalEntries = selectedEmployees.length * rows.filter(r => r.date).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Bulk Time Entry</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Employee Selection */}
          <div>
            <Label className="text-sm font-semibold mb-2 block">Select Employees ({selectedEmployees.length} selected)</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 border border-border rounded-lg p-3 max-h-44 overflow-y-auto bg-muted/10">
              {employees.map(emp => (
                <label key={emp.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/30 rounded px-2 py-1">
                  <Checkbox
                    checked={selectedEmployees.includes(emp.id)}
                    onCheckedChange={() => toggleEmployee(emp.id)}
                  />
                  <span>{emp.first_name} {emp.last_name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Date Rows */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-semibold">Date Rows ({rows.length} rows)</Label>
              <Button variant="outline" size="sm" onClick={addRow} className="gap-1">
                <Plus className="h-3.5 w-3.5" /> Add Row
              </Button>
            </div>
            <div className="space-y-2">
              {rows.map((row, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-end bg-muted/10 rounded-lg p-2 border border-border">
                  <div className="col-span-2">
                    <Label className="text-xs">Date</Label>
                    <Input type="date" value={row.date} onChange={e => updateRow(i, "date", e.target.value)} className="h-8 text-xs" />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Clock In</Label>
                    <Input type="time" value={row.clock_in} onChange={e => updateRow(i, "clock_in", e.target.value)} className="h-8 text-xs" />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Clock Out</Label>
                    <Input type="time" value={row.clock_out} onChange={e => updateRow(i, "clock_out", e.target.value)} className="h-8 text-xs" />
                  </div>
                  <div className="col-span-1">
                    <Label className="text-xs">Break</Label>
                    <Input type="number" value={row.break_minutes} onChange={e => updateRow(i, "break_minutes", e.target.value)} className="h-8 text-xs" placeholder="min" />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Location</Label>
                    <Input value={row.location_name} onChange={e => updateRow(i, "location_name", e.target.value)} className="h-8 text-xs" placeholder="Optional" />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Notes</Label>
                    <Input value={row.notes} onChange={e => updateRow(i, "notes", e.target.value)} className="h-8 text-xs" placeholder="Optional" />
                  </div>
                  <div className="col-span-1 flex items-end justify-end">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeRow(i)} disabled={rows.length === 1}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {totalEntries > 0 && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm text-center font-medium text-primary">
              Will create <strong>{totalEntries}</strong> time entries ({selectedEmployees.length} employees × {rows.filter(r => r.date).length} rows)
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !selectedEmployees.length || !rows.some(r => r.date)} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {saving ? "Creating..." : `Create ${totalEntries} Entries`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}