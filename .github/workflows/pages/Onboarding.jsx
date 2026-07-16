import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Plus, CheckCircle2, Circle, Loader2, Trash2, Edit2,
  ChevronDown, ChevronRight, ClipboardList, Search, Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/PageHeader";

const CATEGORY_COLORS = {
  training: "bg-blue-100 text-blue-700 border-blue-200",
  document: "bg-yellow-100 text-yellow-700 border-yellow-200",
  equipment: "bg-orange-100 text-orange-700 border-orange-200",
  system_access: "bg-purple-100 text-purple-700 border-purple-200",
  orientation: "bg-green-100 text-green-700 border-green-200",
  other: "bg-gray-100 text-gray-700 border-gray-200",
};

const CATEGORY_LABELS = {
  training: "Training", document: "Document", equipment: "Equipment",
  system_access: "System Access", orientation: "Orientation", other: "Other"
};

const PRIORITY_COLORS = {
  high: "bg-red-100 text-red-700 border-red-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  low: "bg-gray-100 text-gray-600 border-gray-200"
};

const TASK_TEMPLATES = [
  { task_name: "Complete W-4 Tax Withholding Form", category: "document", priority: "high" },
  { task_name: "Sign Employee Handbook Acknowledgment", category: "document", priority: "high" },
  { task_name: "Sign Non-Disclosure Agreement", category: "document", priority: "high" },
  { task_name: "Complete Safety & Compliance Training", category: "training", priority: "high" },
  { task_name: "Set up Direct Deposit / Banking Info", category: "document", priority: "medium" },
  { task_name: "Receive and configure work equipment", category: "equipment", priority: "medium" },
  { task_name: "Get system access credentials (Email, Apps)", category: "system_access", priority: "high" },
  { task_name: "Complete HR Orientation Session", category: "orientation", priority: "medium" },
  { task_name: "Meet with direct manager / team", category: "orientation", priority: "medium" },
  { task_name: "Review company policies and PTO guide", category: "training", priority: "low" },
];

const emptyForm = {
  employee_id: "", task_name: "", category: "training",
  description: "", due_date: "", priority: "medium", notes: ""
};

export default function Onboarding() {
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterEmp, setFilterEmp] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [bulkEmpId, setBulkEmpId] = useState("");
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [selectedTemplates, setSelectedTemplates] = useState([]);
  const [expandedEmps, setExpandedEmps] = useState({});

  useEffect(() => {
    Promise.all([
      base44.entities.OnboardingTask.list("-created_date", 200),
      base44.entities.Employee.filter({ status: "active" }),
    ]).then(([t, e]) => { setTasks(t); setEmployees(e); setLoading(false); });
  }, []);

  const reload = () => base44.entities.OnboardingTask.list("-created_date", 200).then(setTasks);

  const openNew = () => { setForm(emptyForm); setEditTask(null); setDialogOpen(true); };
  const openEdit = (task) => { setForm({ ...task }); setEditTask(task); setDialogOpen(true); };

  const handleSave = async () => {
    setSaving(true);
    const emp = employees.find(e => e.id === form.employee_id);
    const payload = { ...form, employee_name: emp ? `${emp.first_name} ${emp.last_name}` : form.employee_name };
    if (editTask) await base44.entities.OnboardingTask.update(editTask.id, payload);
    else await base44.entities.OnboardingTask.create(payload);
    setSaving(false);
    setDialogOpen(false);
    reload();
  };

  const toggleComplete = async (task) => {
    const now = new Date().toISOString();
    const update = task.completed
      ? { completed: false, completed_at: null }
      : { completed: true, completed_at: now };
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, ...update } : t));
    await base44.entities.OnboardingTask.update(task.id, update);
  };

  const deleteTask = async (id) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    await base44.entities.OnboardingTask.delete(id);
  };

  const handleBulkAssign = async () => {
    if (!bulkEmpId || selectedTemplates.length === 0) return;
    setSaving(true);
    const emp = employees.find(e => e.id === bulkEmpId);
    const empName = emp ? `${emp.first_name} ${emp.last_name}` : "";
    const items = selectedTemplates.map(tpl => ({ ...tpl, employee_id: bulkEmpId, employee_name: empName }));
    await base44.entities.OnboardingTask.bulkCreate(items);
    setSaving(false);
    setBulkDialogOpen(false);
    setSelectedTemplates([]);
    setBulkEmpId("");
    reload();
  };

  // Group by employee
  const filtered = tasks.filter(t => {
    const empMatch = filterEmp === "all" || t.employee_id === filterEmp;
    const statusMatch = filterStatus === "all" || (filterStatus === "done" ? t.completed : !t.completed);
    const searchMatch = !search || t.task_name.toLowerCase().includes(search.toLowerCase()) || t.employee_name?.toLowerCase().includes(search.toLowerCase());
    return empMatch && statusMatch && searchMatch;
  });

  const grouped = filtered.reduce((acc, t) => {
    const key = t.employee_id;
    if (!acc[key]) acc[key] = { name: t.employee_name, tasks: [] };
    acc[key].tasks.push(t);
    return acc;
  }, {});

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Onboarding Tasks" description="Track new hire checklists and completion progress">
        <Button variant="outline" onClick={() => setBulkDialogOpen(true)} className="gap-2">
          <ClipboardList className="h-4 w-4" /> Assign Checklist
        </Button>
        <Button onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" /> Add Task
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Tasks", value: tasks.length, color: "text-foreground" },
          { label: "Completed", value: tasks.filter(t => t.completed).length, color: "text-green-600" },
          { label: "Pending", value: tasks.filter(t => !t.completed).length, color: "text-amber-600" },
          { label: "Employees", value: new Set(tasks.map(t => t.employee_id)).size, color: "text-primary" },
        ].map(s => (
          <div key={s.label} className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9 w-52" placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterEmp} onValueChange={setFilterEmp}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All Employees" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Employees</SelectItem>
            {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="done">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grouped task list */}
      <div className="space-y-4">
        {Object.keys(grouped).length === 0 ? (
          <div className="bg-card rounded-xl border border-border py-16 text-center">
            <ClipboardList className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No onboarding tasks yet. Use "Assign Checklist" to get started.</p>
          </div>
        ) : Object.entries(grouped).map(([empId, group]) => {
          const done = group.tasks.filter(t => t.completed).length;
          const total = group.tasks.length;
          const pct = total ? Math.round((done / total) * 100) : 0;
          const isExpanded = expandedEmps[empId] !== false;
          return (
            <div key={empId} className="bg-card rounded-xl border border-border overflow-hidden">
              <button
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-muted/10 transition-colors"
                onClick={() => setExpandedEmps(p => ({ ...p, [empId]: !isExpanded }))}
              >
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                  {group.name?.split(" ").map(n => n[0]).join("").slice(0, 2)}
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-sm">{group.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 max-w-32 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground">{done}/{total} complete ({pct}%)</span>
                  </div>
                </div>
                {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              </button>

              {isExpanded && (
                <div className="border-t border-border divide-y divide-border">
                  {group.tasks.map(task => (
                    <div key={task.id} className={`flex items-center gap-3 px-5 py-3 hover:bg-muted/10 ${task.completed ? "opacity-60" : ""}`}>
                      <button onClick={() => toggleComplete(task)} className="shrink-0">
                        {task.completed
                          ? <CheckCircle2 className="h-5 w-5 text-green-600" />
                          : <Circle className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${task.completed ? "line-through text-muted-foreground" : ""}`}>{task.task_name}</p>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[task.category] || ""}`}>{CATEGORY_LABELS[task.category] || task.category}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${PRIORITY_COLORS[task.priority] || ""}`}>{task.priority}</span>
                          {task.due_date && <span className="text-xs text-muted-foreground">Due {task.due_date}</span>}
                        </div>
                        {task.description && <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(task)}><Edit2 className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteTask(task.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add/Edit Task Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editTask ? "Edit Task" : "New Onboarding Task"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
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
              <Label>Task Name *</Label>
              <Input className="mt-1" value={form.task_name} onChange={e => setForm(p => ({ ...p, task_name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm(p => ({ ...p, priority: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Due Date</Label>
              <Input type="date" className="mt-1" value={form.due_date || ""} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} />
            </div>
            <div>
              <Label>Description</Label>
              <textarea className="mt-1 w-full border border-input rounded-md px-3 py-2 text-sm bg-transparent resize-none h-16 focus:outline-none focus:ring-1 focus:ring-ring"
                value={form.description || ""} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.employee_id || !form.task_name}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editTask ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Assign Checklist Dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Assign Onboarding Checklist</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Select Employee *</Label>
              <Select value={bulkEmpId} onValueChange={setBulkEmpId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Choose employee" /></SelectTrigger>
                <SelectContent>
                  {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Select Tasks to Assign</p>
              <div className="space-y-1.5 max-h-72 overflow-y-auto border border-border rounded-lg divide-y divide-border">
                {TASK_TEMPLATES.map((tpl, i) => {
                  const isSelected = selectedTemplates.some(t => t.task_name === tpl.task_name);
                  return (
                    <label key={i} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-muted/20">
                      <div
                        className={`h-5 w-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? "bg-primary border-primary" : "border-input"}`}
                        onClick={() => setSelectedTemplates(prev => isSelected ? prev.filter(t => t.task_name !== tpl.task_name) : [...prev, tpl])}
                      >
                        {isSelected && <CheckCircle2 className="h-3 w-3 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{tpl.task_name}</p>
                        <div className="flex gap-1.5 mt-0.5">
                          <span className={`text-xs px-1.5 py-0.5 rounded-full border ${CATEGORY_COLORS[tpl.category]}`}>{CATEGORY_LABELS[tpl.category]}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full border ${PRIORITY_COLORS[tpl.priority]}`}>{tpl.priority}</span>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{selectedTemplates.length} tasks selected</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedTemplates(TASK_TEMPLATES)}>Select All</Button>
              <Button variant="outline" size="sm" onClick={() => setSelectedTemplates([])}>Clear</Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleBulkAssign} disabled={saving || !bulkEmpId || selectedTemplates.length === 0} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Assign {selectedTemplates.length} Tasks
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}