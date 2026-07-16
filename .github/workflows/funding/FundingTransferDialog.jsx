import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const EMPTY = {
  transfer_date: new Date().toISOString().slice(0, 10),
  amount: "",
  method: "wire",
  reference_number: "",
  status: "sent",
  notes: "",
};

export default function FundingTransferDialog({ open, onOpenChange, record, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (record) {
      setForm({ ...EMPTY, ...record, amount: record.amount ?? "" });
    } else {
      setForm(EMPTY);
    }
  }, [record, open]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.amount) return;
    setSaving(true);
    const me = await base44.auth.me();
    const payload = {
      transfer_date: form.transfer_date,
      amount: parseFloat(form.amount) || 0,
      method: form.method,
      reference_number: form.reference_number,
      status: form.status,
      notes: form.notes,
      performed_by: me?.email,
    };
    if (record?.id) {
      await base44.entities.RapidFunding.update(record.id, payload);
    } else {
      await base44.entities.RapidFunding.create(payload);
    }
    setSaving(false);
    onSaved?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{record ? "Edit funding transfer" : "Log funding transfer to Rapid"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-2">
          <div>
            <Label>Transfer Date</Label>
            <Input type="date" className="mt-1" value={form.transfer_date} onChange={(e) => set("transfer_date", e.target.value)} />
          </div>
          <div>
            <Label>Amount Sent ($)</Label>
            <Input type="number" step="0.01" className="mt-1" value={form.amount} onChange={(e) => set("amount", e.target.value)} placeholder="0.00" />
          </div>
          <div>
            <Label>Method</Label>
            <Select value={form.method} onValueChange={(v) => set("method", v)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="wire">Wire</SelectItem>
                <SelectItem value="ach">ACH</SelectItem>
                <SelectItem value="rapid_debit">Rapid Debit</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>Reference / Confirmation #</Label>
            <Input className="mt-1" value={form.reference_number} onChange={(e) => set("reference_number", e.target.value)} placeholder="Bank confirmation or trace #" />
          </div>
          <div className="col-span-2">
            <Label>Notes</Label>
            <Textarea className="mt-1" value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="e.g. Funds for week ending 06/20 payroll" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !form.amount}>{saving ? "Saving..." : "Save Transfer"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}