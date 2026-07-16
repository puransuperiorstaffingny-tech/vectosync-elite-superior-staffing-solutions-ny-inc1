import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export default function ClientForm({ open, onOpenChange, client, onSave }) {
  const [form, setForm] = useState(
    client || {
      company_name: "",
      contact_name: "",
      email: "",
      phone: "",
      client_code: "",
      address_line1: "",
      city: "",
      state: "",
      zip_code: "",
      billing_rate: "",
      payment_terms: "net_30",
      status: "active",
      notes: "",
    }
  );
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    setSaving(true);
    await onSave({ ...form, billing_rate: parseFloat(form.billing_rate) || 0 });
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{client ? "Edit Client" : "New Client"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label>Company / Client Name *</Label>
            <Input value={form.company_name} onChange={(e) => set("company_name", e.target.value)} />
          </div>
          <div>
            <Label>Primary Contact</Label>
            <Input value={form.contact_name} onChange={(e) => set("contact_name", e.target.value)} />
          </div>
          <div>
            <Label>Client Code</Label>
            <Input value={form.client_code} onChange={(e) => set("client_code", e.target.value)} />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label>Address</Label>
            <Input value={form.address_line1} onChange={(e) => set("address_line1", e.target.value)} placeholder="Street address" />
          </div>
          <div>
            <Label>City</Label>
            <Input value={form.city} onChange={(e) => set("city", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>State</Label>
              <Input value={form.state} onChange={(e) => set("state", e.target.value)} />
            </div>
            <div>
              <Label>Zip</Label>
              <Input value={form.zip_code} onChange={(e) => set("zip_code", e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Billing Rate ($/hr)</Label>
            <Input type="number" value={form.billing_rate} onChange={(e) => set("billing_rate", e.target.value)} />
          </div>
          <div>
            <Label>Payment Terms</Label>
            <Select value={form.payment_terms} onValueChange={(v) => set("payment_terms", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="due_on_receipt">Due on Receipt</SelectItem>
                <SelectItem value="net_15">Net 15</SelectItem>
                <SelectItem value="net_30">Net 30</SelectItem>
                <SelectItem value="net_45">Net 45</SelectItem>
                <SelectItem value="net_60">Net 60</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="prospect">Prospect</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving || !form.company_name}>
            {saving ? "Saving..." : client ? "Update Client" : "Create Client"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}