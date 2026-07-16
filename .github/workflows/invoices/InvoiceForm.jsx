import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";

const blankItem = () => ({ description: "", quantity: 1, rate: 0, amount: 0 });

export default function InvoiceForm({ open, onOpenChange, invoice, clients, onSave }) {
  const [form, setForm] = useState(
    invoice || {
      invoice_number: `INV-${Date.now().toString().slice(-6)}`,
      client_id: "",
      client_name: "",
      client_email: "",
      issue_date: new Date().toISOString().slice(0, 10),
      due_date: "",
      status: "draft",
      line_items: [blankItem()],
      tax_rate: 0,
      notes: "",
    }
  );
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const pickClient = (id) => {
    const c = clients.find((x) => x.id === id);
    setForm((p) => ({ ...p, client_id: id, client_name: c?.company_name || "", client_email: c?.email || "" }));
  };

  const updateItem = (idx, k, v) => {
    setForm((p) => {
      const items = [...p.line_items];
      items[idx] = { ...items[idx], [k]: v };
      const q = parseFloat(items[idx].quantity) || 0;
      const r = parseFloat(items[idx].rate) || 0;
      items[idx].amount = q * r;
      return { ...p, line_items: items };
    });
  };

  const addItem = () => setForm((p) => ({ ...p, line_items: [...p.line_items, blankItem()] }));
  const removeItem = (idx) => setForm((p) => ({ ...p, line_items: p.line_items.filter((_, i) => i !== idx) }));

  const subtotal = form.line_items.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
  const taxAmount = subtotal * ((parseFloat(form.tax_rate) || 0) / 100);
  const total = subtotal + taxAmount;

  const handleSubmit = async () => {
    setSaving(true);
    await onSave({
      ...form,
      subtotal,
      tax_amount: taxAmount,
      total,
      line_items: form.line_items.map((i) => ({
        description: i.description,
        quantity: parseFloat(i.quantity) || 0,
        rate: parseFloat(i.rate) || 0,
        amount: parseFloat(i.amount) || 0,
      })),
    });
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{invoice ? "Edit Invoice" : "New Invoice"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Invoice Number</Label>
            <Input value={form.invoice_number} onChange={(e) => set("invoice_number", e.target.value)} />
          </div>
          <div>
            <Label>Client *</Label>
            <Select value={form.client_id} onValueChange={pickClient}>
              <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
              <SelectContent>
                {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Issue Date</Label>
            <Input type="date" value={form.issue_date} onChange={(e) => set("issue_date", e.target.value)} />
          </div>
          <div>
            <Label>Due Date</Label>
            <Input type="date" value={form.due_date} onChange={(e) => set("due_date", e.target.value)} />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tax Rate %</Label>
            <Input type="number" value={form.tax_rate} onChange={(e) => set("tax_rate", e.target.value)} />
          </div>
        </div>

        {/* Line items */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Line Items</Label>
            <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={addItem}>
              <Plus className="h-3 w-3" /> Add Item
            </Button>
          </div>
          {form.line_items.map((item, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 items-center">
              <Input className="col-span-6" placeholder="Description" value={item.description} onChange={(e) => updateItem(idx, "description", e.target.value)} />
              <Input className="col-span-2" type="number" placeholder="Qty" value={item.quantity} onChange={(e) => updateItem(idx, "quantity", e.target.value)} />
              <Input className="col-span-2" type="number" placeholder="Rate" value={item.rate} onChange={(e) => updateItem(idx, "rate", e.target.value)} />
              <span className="col-span-1 text-xs font-medium text-right">${(item.amount || 0).toFixed(0)}</span>
              <Button size="icon" variant="ghost" className="col-span-1 h-7 w-7 text-destructive" onClick={() => removeItem(idx)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="ml-auto w-full sm:w-64 space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>${taxAmount.toFixed(2)}</span></div>
          <div className="flex justify-between font-bold text-primary border-t border-border pt-1"><span>Total</span><span>${total.toFixed(2)}</span></div>
        </div>

        <div>
          <Label>Notes / Terms</Label>
          <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving || !form.client_name}>
            {saving ? "Saving..." : invoice ? "Update Invoice" : "Create Invoice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}