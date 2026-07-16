import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Plus, Star, Loader2, Trash2, Edit2, Eye, ChevronDown, ChevronRight, BarChart2, Lock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/PageHeader";

const COMPETENCIES = [
  { key: "rating_quality", label: "Quality of Work" },
  { key: "rating_productivity", label: "Productivity" },
  { key: "rating_teamwork", label: "Teamwork" },
  { key: "rating_communication", label: "Communication" },
  { key: "rating_reliability", label: "Reliability & Attendance" },
];

const STATUS_COLORS = {
  draft: "bg-gray-100 text-gray-600 border-gray-200",
  submitted: "bg-blue-100 text-blue-700 border-blue-200",
  acknowledged: "bg-green-100 text-green-700 border-green-200",
};

function StarRating({ value, onChange, readonly = false }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          disabled={readonly}
          onClick={() => onChange && onChange(n)}
          className={`transition-colors ${readonly ? "cursor-default" : "hover:text-yellow-500"}`}
        >
          <Star className={`h-5 w-5 ${n <= (value || 0) ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground"}`} />
        </button>
      ))}
      {value ? <span className="text-sm text-muted-foreground ml-1">{value}/5</span> : null}
    </div>
  );
}

const emptyForm = {
  employee_id: "", review_cycle: "", reviewer_name: "", reviewer_email: "",
  status: "draft", overall_rating: 0,
  rating_quality: 0, rating_productivity: 0, rating_teamwork: 0,
  rating_communication: 0, rating_reliability: 0,
  strengths: "", areas_for_improvement: "", goals_next_period: "",
  additional_notes: "", review_date: new Date().toISOString().slice(0, 10),
};

export default function PerformanceReviews() {
  const [reviews, setReviews] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editReview, setEditReview] = useState(null);
  const [viewReview, setViewReview] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filterEmp, setFilterEmp] = useState("all");
  const [filterCycle, setFilterCycle] = useState("all");

  useEffect(() => {
    Promise.all([
      base44.entities.PerformanceReview.list("-created_date", 200),
      base44.entities.Employee.filter({ status: "active" }),
    ]).then(([r, e]) => { setReviews(r); setEmployees(e); setLoading(false); });
  }, []);

  const reload = () => base44.entities.PerformanceReview.list("-created_date", 200).then(setReviews);

  const openNew = () => { setForm(emptyForm); setEditReview(null); setDialogOpen(true); };
  const openEdit = (rev) => { setForm({ ...rev }); setEditReview(rev); setDialogOpen(true); };
  const openView = (rev) => { setViewReview(rev); setViewOpen(true); };

  const handleSave = async () => {
    setSaving(true);
    const emp = employees.find(e => e.id === form.employee_id);
    const ratings = COMPETENCIES.map(c => form[c.key] || 0).filter(r => r > 0);
    const autoOverall = ratings.length ? Math.round((ratings.reduce((s, r) => s + r, 0) / ratings.length) * 10) / 10 : 0;
    const payload = {
      ...form,
      employee_name: emp ? `${emp.first_name} ${emp.last_name}` : form.employee_name,
      overall_rating: autoOverall || form.overall_rating,
    };
    if (editReview) await base44.entities.PerformanceReview.update(editReview.id, payload);
    else await base44.entities.PerformanceReview.create(payload);
    setSaving(false);
    setDialogOpen(false);
    reload();
  };

  const deleteReview = async (id) => {
    if (!window.confirm("Delete this performance review? This cannot be undone.")) return;
    setReviews(prev => prev.filter(r => r.id !== id));
    await base44.entities.PerformanceReview.delete(id);
  };

  const cycles = [...new Set(reviews.map(r => r.review_cycle).filter(Boolean))];
  const filtered = reviews.filter(r => {
    const empOk = filterEmp === "all" || r.employee_id === filterEmp;
    const cycleOk = filterCycle === "all" || r.review_cycle === filterCycle;
    return empOk && cycleOk;
  });

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Performance Reviews" description="Admin-only: create review cycles and rate employee competencies">
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
          <Lock className="h-3.5 w-3.5 text-amber-600" />
          <span className="text-xs text-amber-700 font-medium">Admin Only</span>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" /> New Review
        </Button>
      </PageHeader>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Reviews", value: reviews.length },
          { label: "Submitted", value: reviews.filter(r => r.status === "submitted").length },
          { label: "Draft", value: reviews.filter(r => r.status === "draft").length },
          { label: "Avg Rating", value: reviews.length ? (reviews.reduce((s, r) => s + (r.overall_rating || 0), 0) / reviews.length).toFixed(1) + " / 5" : "—" },
        ].map(s => (
          <div key={s.label} className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-2xl font-bold mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={filterEmp} onValueChange={setFilterEmp}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All Employees" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Employees</SelectItem>
            {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterCycle} onValueChange={setFilterCycle}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All Cycles" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Cycles</SelectItem>
            {cycles.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Reviews list */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <BarChart2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No reviews yet. Click "New Review" to create one.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase px-5 py-3">Employee</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase px-4 py-3 hidden sm:table-cell">Review Cycle</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase px-4 py-3 hidden md:table-cell">Reviewer</th>
                  <th className="text-center text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Rating</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Status</th>
                  <th className="text-right text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(rev => (
                  <tr key={rev.id} className="border-b border-border last:border-0 hover:bg-muted/10 transition-colors">
                    <td className="px-5 py-3 font-medium">{rev.employee_name}</td>
                    <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">{rev.review_cycle}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{rev.reviewer_name || "—"}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center">
                        <StarRating value={rev.overall_rating} readonly />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${STATUS_COLORS[rev.status] || ""}`}>{rev.status}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openView(rev)}><Eye className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(rev)}><Edit2 className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteReview(rev.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editReview ? "Edit Review" : "New Performance Review"}</DialogTitle></DialogHeader>
          <div className="space-y-5 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Employee *</Label>
                <Select value={form.employee_id} onValueChange={v => setForm(p => ({ ...p, employee_id: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select employee" /></SelectTrigger>
                  <SelectContent>
                    {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Review Cycle *</Label>
                <Input className="mt-1" placeholder="e.g. Q2 2026, Annual 2025" value={form.review_cycle} onChange={e => setForm(p => ({ ...p, review_cycle: e.target.value }))} />
              </div>
              <div>
                <Label>Reviewer Name</Label>
                <Input className="mt-1" value={form.reviewer_name} onChange={e => setForm(p => ({ ...p, reviewer_name: e.target.value }))} />
              </div>
              <div>
                <Label>Reviewer Email</Label>
                <Input className="mt-1" type="email" value={form.reviewer_email} onChange={e => setForm(p => ({ ...p, reviewer_email: e.target.value }))} />
              </div>
              <div>
                <Label>Review Date</Label>
                <Input className="mt-1" type="date" value={form.review_date || ""} onChange={e => setForm(p => ({ ...p, review_date: e.target.value }))} />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="acknowledged">Acknowledged</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Competency Ratings */}
            <div className="border border-border rounded-xl p-4 space-y-4">
              <p className="font-semibold text-sm">Competency Ratings</p>
              {COMPETENCIES.map(comp => (
                <div key={comp.key} className="flex items-center justify-between gap-4">
                  <Label className="text-sm font-normal min-w-0 flex-1">{comp.label}</Label>
                  <StarRating value={form[comp.key]} onChange={v => setForm(p => ({ ...p, [comp.key]: v }))} />
                </div>
              ))}
              <p className="text-xs text-muted-foreground">Overall rating will be auto-calculated from competencies.</p>
            </div>

            {/* Qualitative feedback */}
            <div className="space-y-3">
              {[
                { key: "strengths", label: "Strengths" },
                { key: "areas_for_improvement", label: "Areas for Improvement" },
                { key: "goals_next_period", label: "Goals for Next Period" },
                { key: "additional_notes", label: "Additional Notes (Confidential)" },
              ].map(({ key, label }) => (
                <div key={key}>
                  <Label>{label}</Label>
                  <textarea
                    className="mt-1 w-full border border-input rounded-md px-3 py-2 text-sm bg-transparent resize-none h-20 focus:outline-none focus:ring-1 focus:ring-ring"
                    value={form[key] || ""}
                    onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.employee_id || !form.review_cycle}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editReview ? "Update" : "Save Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        {viewReview && (
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Review — {viewReview.employee_name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Cycle:</span> <strong>{viewReview.review_cycle}</strong></div>
                <div><span className="text-muted-foreground">Date:</span> {viewReview.review_date || "—"}</div>
                <div><span className="text-muted-foreground">Reviewer:</span> {viewReview.reviewer_name || "—"}</div>
                <div><span className="text-muted-foreground">Status:</span> <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${STATUS_COLORS[viewReview.status]}`}>{viewReview.status}</span></div>
              </div>

              <div className="border border-border rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm">Overall Rating</p>
                  <StarRating value={viewReview.overall_rating} readonly />
                </div>
                {COMPETENCIES.map(comp => (
                  <div key={comp.key} className="flex items-center justify-between gap-4">
                    <span className="text-sm text-muted-foreground">{comp.label}</span>
                    <StarRating value={viewReview[comp.key]} readonly />
                  </div>
                ))}
              </div>

              {[
                { key: "strengths", label: "Strengths" },
                { key: "areas_for_improvement", label: "Areas for Improvement" },
                { key: "goals_next_period", label: "Goals for Next Period" },
                { key: "additional_notes", label: "Additional Notes" },
              ].filter(({ key }) => viewReview[key]).map(({ key, label }) => (
                <div key={key}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{viewReview[key]}</p>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewOpen(false)}>Close</Button>
              <Button onClick={() => { setViewOpen(false); openEdit(viewReview); }}>
                <Edit2 className="h-4 w-4 mr-1" /> Edit
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}