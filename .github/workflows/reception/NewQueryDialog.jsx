import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";

export default function NewQueryDialog({ open, onOpenChange, onCreated }) {
  const [employees, setEmployees] = useState([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    employee_id: "",
    subject: "",
    category: "general",
    priority: "normal",
    description: "",
  });

  useEffect(() => {
    if (open) {
      base44.entities.Employee.list("first_name", 500).then(setEmployees);
      setForm({ employee_id: "", subject: "", category: "general", priority: "normal", description: "" });
    }
  }, [open]);

  const submit = async () => {
    if (!form.subject.trim() || saving) return;
    setSaving(true);
    try {
      const emp = employees.find((e) => e.id === form.employee_id);
      const created = await base44.entities.ReceptionQuery.create({
        subject: form.subject.trim(),
        category: form.category,
        priority: form.priority,
        description: form.description.trim(),
        status: "new",
        employee_id: emp?.id || "",
        employee_name: emp ? `${emp.first_name} ${emp.last_name}` : "",
        employee_email: emp?.email || "",
        notes: [],
      });
      onCreated(created);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Front Desk Query</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Employee</Label>
            <Select value={form.employee_id} onValueChange={(v) => setForm((f) => ({ ...f, employee_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Select employee (optional)" /></SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Subject *</Label>
            <Input value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} placeholder="e.g. Missing paycheck" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["payroll", "timecard", "benefits", "scheduling", "document", "general", "other"].map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["low", "normal", "high", "urgent"].map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="What does the employee need?" className="min-h-[70px]" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!form.subject.trim() || saving}>{saving ? "Creating…" : "Create Query"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}