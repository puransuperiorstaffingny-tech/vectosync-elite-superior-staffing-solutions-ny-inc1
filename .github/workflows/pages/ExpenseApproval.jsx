import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  CheckCircle, XCircle, Eye, Printer, Send, Download, Filter,
  DollarSign, Loader2, Receipt, FileText, Check, X, Edit, RefreshCw,
  Plus, Upload, Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import ExportButton from "@/components/ExportButton";

const CATEGORIES = [
  "travel","transportation","petty_cash","meals","supplies","equipment",
  "lodging","fuel","parking","tolls","training","utilities","postage","other"
];

const DEDUCTION_SCHEDULES = [
  { value: "full_next", label: "Full Amount — Next Pay Period" },
  { value: "biweekly_2", label: "2-Week Installments (biweekly)" },
  { value: "custom", label: "Custom Amount Per Pay Period" },
];

const ACCOUNTING_TREATMENTS = [
  { value: "reimburse", label: "Reimburse Employee", description: "Add to net pay as reimbursement" },
  { value: "deduct_from_pay", label: "Deduct from Pay", description: "Subtract from employee's paycheck" },
  { value: "billable_chargeback", label: "Billable Chargeback", description: "Mark as billable to client, no payroll impact" },
  { value: "no_action", label: "No Payroll Action", description: "Approve only, no payroll adjustment" },
];

const EMPTY_FORM = {
  description: "", date: new Date().toISOString().slice(0, 10),
  category: "other", amount: "", invoice_number: "",
  customer_name: "", project: "", billable: false, notes: "",
  receipt_url: "", accounting_treatment: "reimburse",
  deduction_schedule: "full_next", deduction_custom_amount: "",
};

function ExpenseFormDialog({ open, onOpenChange, initial, onSave, employees }) {
  const [form, setForm] = useState(initial || EMPTY_FORM);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setForm(initial || EMPTY_FORM); }, [initial, open]);

  const handleReceipt = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(p => ({ ...p, receipt_url: file_url }));
    setUploading(false);
  };

  const handleSubmit = async (submitNow = false) => {
    setSaving(true);
    const data = { ...form, amount: parseFloat(form.amount) || 0 };
    if (submitNow) data.status = "submitted";
    await onSave(data);
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{initial?.id ? "Edit Expense Report" : "New Expense Report"}</DialogTitle></DialogHeader>
        <div className="space-y-3 py-1">
          {/* Employee selector for admin */}
          {employees && (
            <div>
              <Label>Employee</Label>
              <Select value={form.employee_id || ""} onValueChange={v => {
                const emp = employees.find(e => e.id === v);
                setForm(p => ({ ...p, employee_id: v, employee_name: emp ? `${emp.first_name} ${emp.last_name}` : "", employee_email: emp?.email || "" }));
              }}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Description *</Label>
              <Input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="What was this expense for?" />
            </div>
            <div>
              <Label>Date *</Label>
              <Input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
            </div>
            <div>
              <Label>Amount ($) *</Label>
              <Input type="number" step="0.01" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" />
            </div>
            <div>
              <Label>Category *</Label>
              <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Invoice / Ref #</Label>
              <Input value={form.invoice_number} onChange={e => setForm(p => ({ ...p, invoice_number: e.target.value }))} placeholder="INV-001" />
            </div>
            <div>
              <Label>Customer / Client</Label>
              <Input value={form.customer_name} onChange={e => setForm(p => ({ ...p, customer_name: e.target.value }))} />
            </div>
            <div>
              <Label>Project / Job</Label>
              <Input value={form.project} onChange={e => setForm(p => ({ ...p, project: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <Label>Accounting Treatment</Label>
              <Select value={form.accounting_treatment || "reimburse"} onValueChange={v => setForm(p => ({ ...p, accounting_treatment: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACCOUNTING_TREATMENTS.map(t => (
                    <SelectItem key={t.value} value={t.value}>
                      <div><span className="font-medium">{t.label}</span> <span className="text-muted-foreground text-xs">— {t.description}</span></div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {form.accounting_treatment === "deduct_from_pay" && (
              <>
                <div className="col-span-2">
                  <Label>Deduction Schedule</Label>
                  <Select value={form.deduction_schedule || "full_next"} onValueChange={v => setForm(p => ({ ...p, deduction_schedule: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DEDUCTION_SCHEDULES.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {form.deduction_schedule === "custom" && (
                  <div className="col-span-2">
                    <Label>Custom Amount Per Pay Period ($)</Label>
                    <Input type="number" step="0.01" value={form.deduction_custom_amount} onChange={e => setForm(p => ({ ...p, deduction_custom_amount: e.target.value }))} placeholder="e.g. 50.00" />
                    {form.amount && form.deduction_custom_amount && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Approx. {Math.ceil(parseFloat(form.amount) / parseFloat(form.deduction_custom_amount))} pay periods to recover ${parseFloat(form.amount).toFixed(2)}
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
            <div className="col-span-2">
              <Label>Notes</Label>
              <Input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Additional details..." />
            </div>
            <div className="col-span-2">
              <Label>Receipt</Label>
              {form.receipt_url ? (
                <div className="flex items-center gap-2 mt-1">
                  <a href={form.receipt_url} target="_blank" rel="noopener noreferrer" className="text-primary text-sm underline flex items-center gap-1">
                    <Receipt className="h-3.5 w-3.5" /> View Receipt
                  </a>
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setForm(p => ({ ...p, receipt_url: "" }))}>Remove</Button>
                </div>
              ) : (
                <label className="block mt-1 cursor-pointer">
                  <div className="border-2 border-dashed border-border rounded-lg px-4 py-3 text-center hover:border-primary transition-colors text-sm text-muted-foreground flex items-center justify-center gap-2">
                    {uploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</> : <><Upload className="h-4 w-4" /> Upload receipt</>}
                  </div>
                  <input type="file" accept="image/*,.pdf" onChange={handleReceipt} className="hidden" disabled={uploading} />
                </label>
              )}
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <input type="checkbox" id="billable-admin" checked={form.billable} onChange={e => setForm(p => ({ ...p, billable: e.target.checked }))} className="rounded" />
              <Label htmlFor="billable-admin" className="cursor-pointer font-normal">Billable to client</Label>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button variant="outline" onClick={() => handleSubmit(false)} disabled={saving || !form.description || !form.amount}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save Draft
            </Button>
            <Button onClick={() => handleSubmit(true)} disabled={saving || !form.description || !form.amount} className="gap-1">
              <Send className="h-4 w-4" /> Submit
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const CAT_COLORS = { travel: "bg-blue-50 text-blue-700", meals: "bg-orange-50 text-orange-700", supplies: "bg-purple-50 text-purple-700", equipment: "bg-cyan-50 text-cyan-700", lodging: "bg-teal-50 text-teal-700", fuel: "bg-yellow-50 text-yellow-700", training: "bg-green-50 text-green-700", other: "bg-gray-50 text-gray-700" };

function printExpense(expense) {
  const w = window.open("", "_blank");
  w.document.write(`<html><head><title>Expense Report #${expense.invoice_number || expense.id.slice(0,8)}</title>
    <style>body{font-family:Arial,sans-serif;padding:32px;max-width:700px;margin:0 auto}
    h1{font-size:22px}h2{font-size:16px;color:#475569}table{width:100%;border-collapse:collapse;margin:16px 0}
    th,td{padding:8px 12px;border:1px solid #e2e8f0;text-align:left}th{background:#f8fafc;font-weight:600}
    .amount{font-size:24px;font-weight:700;color:#1e3a8a}
    </style></head><body>
    <h1>Expense Report</h1>
    <h2>${expense.employee_name} &mdash; ${expense.date}</h2>
    ${expense.invoice_number ? `<p>Invoice #: <strong>${expense.invoice_number}</strong></p>` : ""}
    <p class="amount">$${Number(expense.amount).toFixed(2)}</p>
    <table>
      <tr><th>Description</th><td>${expense.description}</td></tr>
      <tr><th>Category</th><td>${expense.category}</td></tr>
      <tr><th>Date</th><td>${expense.date}</td></tr>
      <tr><th>Customer</th><td>${expense.customer_name || "—"}</td></tr>
      <tr><th>Project</th><td>${expense.project || "—"}</td></tr>
      <tr><th>Billable</th><td>${expense.billable ? "Yes" : "No"}</td></tr>
      <tr><th>Status</th><td>${expense.status}</td></tr>
      <tr><th>Employee Notes</th><td>${expense.notes || "—"}</td></tr>
      ${expense.manager_notes ? `<tr><th>Manager Notes</th><td>${expense.manager_notes}</td></tr>` : ""}
      ${expense.reviewed_by ? `<tr><th>Reviewed By</th><td>${expense.reviewed_by}</td></tr>` : ""}
    </table>
    ${expense.receipt_url ? `<p><a href="${expense.receipt_url}">📎 View Receipt</a></p>` : ""}
    </body></html>`);
  w.document.close(); w.print();
}

function ReviewDialog({ expense, onClose, onSave }) {
  const [managerNotes, setManagerNotes] = useState(expense?.manager_notes || "");
  const [treatment, setTreatment] = useState(expense?.accounting_treatment || "reimburse");
  const [deductionSchedule, setDeductionSchedule] = useState(expense?.deduction_schedule || "full_next");
  const [deductionCustomAmount, setDeductionCustomAmount] = useState(expense?.deduction_custom_amount || "");
  const [saving, setSaving] = useState(false);

  const handleAction = async (status) => {
    setSaving(true);
    await onSave(expense.id, status, managerNotes, treatment, deductionSchedule, deductionCustomAmount);
    setSaving(false);
    onClose();
  };

  if (!expense) return null;
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Review Expense — {expense.employee_name}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-1">
          <div className="bg-muted/30 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="text-xl font-bold text-primary">${Number(expense.amount).toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Description</span><span className="font-medium text-right max-w-[55%]">{expense.description}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Category</span><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CAT_COLORS[expense.category]}`}>{expense.category}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span>{expense.date}</span></div>
            {expense.customer_name && <div className="flex justify-between"><span className="text-muted-foreground">Customer</span><span>{expense.customer_name}</span></div>}
            {expense.invoice_number && <div className="flex justify-between"><span className="text-muted-foreground">Invoice #</span><span className="font-mono">{expense.invoice_number}</span></div>}
            {expense.billable && <div className="flex justify-between"><span className="text-muted-foreground">Billable</span><span className="text-green-600 font-medium">Yes</span></div>}
            {expense.notes && <div className="pt-1 border-t border-border"><span className="text-muted-foreground text-xs">Employee Notes:</span><p className="mt-1">{expense.notes}</p></div>}
          </div>
          {expense.receipt_url && (
            <a href={expense.receipt_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary text-sm underline">
              <Receipt className="h-4 w-4" /> View Receipt
            </a>
          )}

          {/* Accounting Treatment */}
          <div className="border border-border rounded-lg p-3 space-y-2">
            <Label className="text-sm font-semibold">Accounting Treatment</Label>
            <p className="text-xs text-muted-foreground">How should this expense be handled in payroll?</p>
            <div className="grid grid-cols-1 gap-2">
              {ACCOUNTING_TREATMENTS.map(t => (
                <label key={t.value} className={`flex items-start gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${treatment === t.value ? "border-primary bg-primary/5" : "border-border hover:bg-muted/30"}`}>
                  <input type="radio" name="treatment" value={t.value} checked={treatment === t.value} onChange={() => setTreatment(t.value)} className="mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{t.label}</p>
                    <p className="text-xs text-muted-foreground">{t.description}</p>
                  </div>
                </label>
              ))}
            </div>
            {treatment === "deduct_from_pay" && (
              <div className="pt-2 border-t border-border space-y-2">
                <Label className="text-xs font-semibold">Deduction Schedule</Label>
                <Select value={deductionSchedule} onValueChange={setDeductionSchedule}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DEDUCTION_SCHEDULES.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                {deductionSchedule === "custom" && (
                  <div>
                    <Label className="text-xs">Custom Amount Per Pay Period ($)</Label>
                    <Input className="h-8 text-sm mt-1" type="number" step="0.01" value={deductionCustomAmount} onChange={e => setDeductionCustomAmount(e.target.value)} placeholder="e.g. 50.00" />
                    {expense.amount && deductionCustomAmount && (
                      <p className="text-xs text-muted-foreground mt-1">
                        ~{Math.ceil(expense.amount / parseFloat(deductionCustomAmount))} pay periods to recover ${Number(expense.amount).toFixed(2)}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <Label>Manager Notes (optional)</Label>
            <Input value={managerNotes} onChange={e => setManagerNotes(e.target.value)} placeholder="Add a note for the employee..." className="mt-1" />
          </div>
          <div className="flex gap-2 pt-1 border-t border-border">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button variant="outline" className="flex-1 border-red-200 text-red-600 hover:bg-red-50 gap-1" onClick={() => handleAction("rejected")} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />} Reject
            </Button>
            <Button className="flex-1 bg-green-600 hover:bg-green-700 gap-1" onClick={() => handleAction("approved")} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Approve &amp; Apply
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ExpenseApproval() {
  const [expenses, setExpenses] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("submitted");
  const [filterEmployee, setFilterEmployee] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [reviewingExpense, setReviewingExpense] = useState(null);
  const [bulkApproving, setBulkApproving] = useState(false);
  const [user, setUser] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editExpense, setEditExpense] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkUpdating, setBulkUpdating] = useState(false);

  const load = async () => {
    setLoading(true);
    const [u, exps, emps] = await Promise.all([
      base44.auth.me(),
      base44.entities.ExpenseReport.list("-date", 300),
      base44.entities.Employee.filter({ status: "active" }, "first_name", 200),
    ]);
    setUser(u);
    setExpenses(exps);
    setAllEmployees(emps);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAdminSave = async (data) => {
    if (editExpense?.id) {
      await base44.entities.ExpenseReport.update(editExpense.id, data);
    } else {
      await base44.entities.ExpenseReport.create(data);
    }
    setEditExpense(null);
    await load();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this expense report?")) return;
    await base44.entities.ExpenseReport.delete(id);
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  const handleReview = async (id, status, managerNotes, treatment, deductionSchedule, deductionCustomAmount) => {
    const data = {
      status,
      accounting_treatment: treatment,
      deduction_schedule: deductionSchedule,
      deduction_custom_amount: deductionCustomAmount ? parseFloat(deductionCustomAmount) : null,
      manager_notes: managerNotes,
      reviewed_by: user?.email,
      reviewed_at: new Date().toISOString(),
    };
    await base44.entities.ExpenseReport.update(id, data);
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, ...data } : e));

    // Auto-apply to payroll when approved
    if (status === "approved") {
      const expense = expenses.find(e => e.id === id);
      await base44.functions.invoke("applyExpenseToPayroll", {
        expense: { ...expense, ...data },
      });
    }
  };

  const bulkApprove = async () => {
    setBulkApproving(true);
    const toApprove = filtered.filter(e => e.status === "submitted");
    for (const exp of toApprove) {
      await base44.entities.ExpenseReport.update(exp.id, { status: "approved", reviewed_by: user?.email, reviewed_at: new Date().toISOString() });
    }
    await load();
    setBulkApproving(false);
  };

  const sendApprovalEmail = async (expense) => {
    const emp = await base44.entities.Employee.filter({ id: expense.employee_id });
    const email = emp[0]?.email || expense.employee_email;
    if (!email) return;
    const body = `<h2>Expense Report ${expense.status === "approved" ? "Approved ✅" : "Rejected ❌"}</h2>
      <p>Hi ${expense.employee_name},</p>
      <p>Your expense report for <strong>${expense.description}</strong> ($${Number(expense.amount).toFixed(2)}) has been <strong>${expense.status}</strong>.</p>
      ${expense.manager_notes ? `<p>Manager notes: ${expense.manager_notes}</p>` : ""}`;
    await base44.integrations.Core.SendEmail({ to: email, subject: `Expense Report ${expense.status}`, body });
  };

  const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleSelectAll = () => setSelectedIds(prev => prev.length === filtered.length ? [] : filtered.map(e => e.id));

  const bulkApproveSelected = async () => {
    setBulkUpdating(true);
    await Promise.all(selectedIds.map(id => base44.entities.ExpenseReport.update(id, { status: "approved", reviewed_by: user?.email, reviewed_at: new Date().toISOString() })));
    setSelectedIds([]);
    setBulkUpdating(false);
    await load();
  };

  const bulkDeleteSelected = async () => {
    if (!window.confirm(`Delete ${selectedIds.length} selected expense reports?`)) return;
    setBulkUpdating(true);
    await Promise.all(selectedIds.map(id => base44.entities.ExpenseReport.delete(id)));
    setSelectedIds([]);
    setBulkUpdating(false);
    await load();
  };

  const employees = [...new Map(expenses.map(e => [e.employee_id, e.employee_name])).entries()];

  const filtered = expenses.filter(e => {
    if (filterStatus !== "all" && e.status !== filterStatus) return false;
    if (filterEmployee !== "all" && e.employee_id !== filterEmployee) return false;
    if (filterCategory !== "all" && e.category !== filterCategory) return false;
    if (dateFrom && e.date < dateFrom) return false;
    if (dateTo && e.date > dateTo) return false;
    return true;
  });

  const totalFiltered = filtered.reduce((s, e) => s + (e.amount || 0), 0);
  const pendingCount = expenses.filter(e => e.status === "submitted").length;
  const approvedTotal = expenses.filter(e => e.status === "approved").reduce((s, e) => s + (e.amount || 0), 0);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Expense Approval Dashboard" description="Review, approve, or reject employee expense reports">
        <Button onClick={() => { setEditExpense(null); setFormOpen(true); }} className="gap-2"><Plus className="h-4 w-4" /> Add Expense</Button>
        <Button variant="outline" onClick={load} className="gap-2"><RefreshCw className="h-4 w-4" /> Refresh</Button>
        {pendingCount > 0 && (
          <Button variant="outline" onClick={bulkApprove} disabled={bulkApproving} className="gap-2">
            {bulkApproving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 text-green-600" />}
            Approve All Pending ({pendingCount})
          </Button>
        )}
        <ExportButton
          data={filtered}
          filename="expense_reports"
          columns={[
            { label: "Employee", key: "employee_name" },
            { label: "Date", key: "date" },
            { label: "Description", key: "description" },
            { label: "Category", key: "category" },
            { label: "Amount", key: "amount" },
            { label: "Invoice #", key: "invoice_number" },
            { label: "Customer", key: "customer_name" },
            { label: "Project", key: "project" },
            { label: "Billable", key: "billable" },
            { label: "Status", key: "status" },
            { label: "Manager Notes", key: "manager_notes" },
          ]}
        />
      </PageHeader>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Pending Review", value: pendingCount + " reports", color: "text-amber-600", bg: "border-amber-200" },
          { label: "Approved Total", value: `$${approvedTotal.toFixed(2)}`, color: "text-green-600", bg: "" },
          { label: "Total Reports", value: expenses.length, color: "text-primary", bg: "" },
          { label: "Billable Expenses", value: `$${expenses.filter(e=>e.billable && e.status==="approved").reduce((s,e)=>s+(e.amount||0),0).toFixed(2)}`, color: "text-blue-600", bg: "" },
        ].map(s => (
          <div key={s.label} className={`bg-card rounded-xl border ${s.bg || "border-border"} p-4`}>
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-lg font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterEmployee} onValueChange={setFilterEmployee}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All Employees" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Employees</SelectItem>
            {employees.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {["travel","meals","supplies","equipment","lodging","fuel","training","other"].map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-40" placeholder="From" />
        <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-40" placeholder="To" />
        <span className="text-sm text-muted-foreground ml-1">{filtered.length} records · ${totalFiltered.toFixed(2)}</span>
      </div>

      {/* Bulk Toolbar */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 bg-primary/5 border border-primary/20 rounded-lg px-4 py-2">
          <CheckCircle className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-primary">{selectedIds.length} selected</span>
          <div className="flex items-center gap-2 ml-2">
            <Button size="sm" className="h-8 text-xs gap-1" onClick={bulkApproveSelected} disabled={bulkUpdating}>
              {bulkUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Approve Selected
            </Button>
            <Button size="sm" variant="destructive" className="h-8 text-xs gap-1" onClick={bulkDeleteSelected} disabled={bulkUpdating}>
              <Trash2 className="h-3 w-3" /> Delete Selected
            </Button>
            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setSelectedIds([])}>Clear</Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/30 border-b border-border">
                <th className="px-4 py-3 w-10">
                  <div
                    className={`h-4 w-4 rounded border-2 flex items-center justify-center cursor-pointer transition-colors ${selectedIds.length === filtered.length && filtered.length > 0 ? 'bg-primary border-primary' : 'border-input'}`}
                    onClick={toggleSelectAll}
                  >
                    {selectedIds.length === filtered.length && filtered.length > 0 && <Check className="h-2.5 w-2.5 text-white" />}
                  </div>
                </th>
                {["Employee", "Date", "Description", "Category", "Amount", "Treatment", "Invoice #", "Customer", "Billable", "Payroll Applied", "Status", "Actions"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(exp => (
                <tr key={exp.id} className={`border-b border-border last:border-0 hover:bg-muted/10 ${selectedIds.includes(exp.id) ? 'bg-primary/5' : ''}`}>
                  <td className="px-4 py-3">
                    <div
                      className={`h-4 w-4 rounded border-2 flex items-center justify-center cursor-pointer transition-colors ${selectedIds.includes(exp.id) ? 'bg-primary border-primary' : 'border-input'}`}
                      onClick={() => toggleSelect(exp.id)}
                    >
                      {selectedIds.includes(exp.id) && <Check className="h-2.5 w-2.5 text-white" />}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium whitespace-nowrap">{exp.employee_name}</td>
                  <td className="px-4 py-3 text-sm whitespace-nowrap">{exp.date}</td>
                  <td className="px-4 py-3 text-sm max-w-[180px] truncate">{exp.description}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CAT_COLORS[exp.category] || CAT_COLORS.other}`}>{exp.category}</span>
                  </td>
                  <td className="px-4 py-3 text-sm font-bold">${Number(exp.amount || 0).toFixed(2)}</td>
                  <td className="px-4 py-3">
                   <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${
                     exp.accounting_treatment === "reimburse" ? "bg-green-50 text-green-700" :
                     exp.accounting_treatment === "deduct_from_pay" ? "bg-red-50 text-red-700" :
                     exp.accounting_treatment === "billable_chargeback" ? "bg-blue-50 text-blue-700" :
                     "bg-gray-50 text-gray-600"
                   }`}>
                     {exp.accounting_treatment === "reimburse" ? "Reimburse" :
                      exp.accounting_treatment === "deduct_from_pay" ? "Deduct" :
                      exp.accounting_treatment === "billable_chargeback" ? "Billable" :
                      exp.accounting_treatment === "no_action" ? "No Action" : "—"}
                   </span>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{exp.invoice_number || "—"}</td>
                  <td className="px-4 py-3 text-xs">{exp.customer_name || "—"}</td>
                  <td className="px-4 py-3 text-xs">{exp.billable ? <span className="text-green-600 font-medium">Yes</span> : "No"}</td>
                  <td className="px-4 py-3 text-xs">
                   {exp.payroll_applied
                     ? <span className="text-green-600 font-medium flex items-center gap-1"><Check className="h-3 w-3" /> Applied</span>
                     : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={exp.status} /></td>
                  <td className="px-4 py-3">
                   <div className="flex items-center gap-1">
                     {exp.receipt_url && (
                       <a href={exp.receipt_url} target="_blank" rel="noopener noreferrer">
                         <Button variant="ghost" size="icon" className="h-7 w-7" title="View Receipt"><Receipt className="h-3.5 w-3.5" /></Button>
                       </a>
                     )}
                     <Button variant="ghost" size="icon" className="h-7 w-7" title="Edit" onClick={() => { setEditExpense(exp); setFormOpen(true); }}><Edit className="h-3.5 w-3.5" /></Button>
                     <Button variant="ghost" size="icon" className="h-7 w-7" title="Print" onClick={() => printExpense(exp)}><Printer className="h-3.5 w-3.5" /></Button>
                     {exp.status !== "draft" && (
                       <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600" title="Send Email" onClick={() => sendApprovalEmail(exp)}><Send className="h-3.5 w-3.5" /></Button>
                     )}
                     {exp.status === "submitted" && (
                       <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" title="Review" onClick={() => setReviewingExpense(exp)}>
                         <Eye className="h-3.5 w-3.5" />
                       </Button>
                     )}
                     {["approved","rejected"].includes(exp.status) && (
                       <Button variant="ghost" size="icon" className="h-7 w-7" title="Re-review" onClick={() => setReviewingExpense(exp)}>
                         <RefreshCw className="h-3.5 w-3.5" />
                       </Button>
                     )}
                     <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" title="Delete" onClick={() => handleDelete(exp.id)}>
                       <Trash2 className="h-3.5 w-3.5" />
                     </Button>
                   </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={13} className="px-4 py-12 text-center text-sm text-muted-foreground">No expense reports found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {reviewingExpense && (
        <ReviewDialog
          expense={reviewingExpense}
          onClose={() => setReviewingExpense(null)}
          onSave={handleReview}
        />
      )}

      <ExpenseFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editExpense}
        onSave={handleAdminSave}
        employees={allEmployees}
      />
    </div>
  );
}