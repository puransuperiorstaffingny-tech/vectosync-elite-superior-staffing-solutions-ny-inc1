import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { CheckCircle2, UserPlus, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import EmployeeSummary from "./EmployeeSummary";
import QueryNotes from "./QueryNotes";

const categoryStyles = "bg-primary/10 text-primary";

export default function QueryDetail({ query, agents, currentUser, onUpdate }) {
  if (!query) {
    return (
      <div className="h-full flex items-center justify-center text-center p-8">
        <div>
          <p className="text-sm text-muted-foreground">Select a query from the queue to view details.</p>
        </div>
      </div>
    );
  }

  const patch = async (data) => {
    const updated = await base44.entities.ReceptionQuery.update(query.id, data);
    onUpdate(updated);
  };

  const addNote = async (text) => {
    const note = {
      text,
      author: currentUser?.full_name || currentUser?.email || "Agent",
      created_at: new Date().toISOString(),
    };
    await patch({ notes: [...(query.notes || []), note] });
  };

  const assign = async (email) => {
    const agent = agents.find((a) => a.email === email);
    await patch({ assigned_to: email, assigned_to_name: agent?.full_name || email, status: query.status === "new" ? "pending" : query.status });
  };

  const resolve = async () => {
    await patch({ status: "resolved", resolved_at: new Date().toISOString(), resolved_by: currentUser?.full_name || currentUser?.email || "Agent" });
  };

  const reopen = async () => {
    await patch({ status: "pending", resolved_at: "", resolved_by: "" });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="p-4 rounded-xl bg-card border border-border">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-bold truncate">{query.subject}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${categoryStyles}`}>{query.category}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide bg-muted text-muted-foreground">{query.priority} priority</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide bg-muted text-muted-foreground">{query.status}</span>
            </div>
          </div>
        </div>
        {query.description && <p className="text-sm text-muted-foreground mt-3 whitespace-pre-wrap">{query.description}</p>}

        {/* Front desk tools */}
        <div className="flex flex-col sm:flex-row gap-2 mt-4">
          <div className="flex-1">
            <Select value={query.assigned_to || ""} onValueChange={assign}>
              <SelectTrigger className="text-xs">
                <UserPlus className="h-3.5 w-3.5 mr-1" />
                <SelectValue placeholder="Assign to agent" />
              </SelectTrigger>
              <SelectContent>
                {agents.map((a) => (
                  <SelectItem key={a.id} value={a.email}>{a.full_name || a.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {query.status === "resolved" ? (
            <Button variant="outline" onClick={reopen}>
              <RotateCcw className="h-4 w-4" /> Reopen
            </Button>
          ) : (
            <Button onClick={resolve}>
              <CheckCircle2 className="h-4 w-4" /> Mark Resolved
            </Button>
          )}
        </div>
        {query.status === "resolved" && query.resolved_by && (
          <p className="text-[11px] text-muted-foreground mt-2">
            Resolved by {query.resolved_by}{query.resolved_at ? ` · ${format(new Date(query.resolved_at), "MMM d, h:mm a")}` : ""}
          </p>
        )}
      </div>

      {/* Employee summary */}
      {(query.employee_id || query.employee_email) && (
        <EmployeeSummary employeeId={query.employee_id} employeeEmail={query.employee_email} />
      )}

      {/* Notes */}
      <QueryNotes notes={query.notes} onAddNote={addNote} />
    </div>
  );
}