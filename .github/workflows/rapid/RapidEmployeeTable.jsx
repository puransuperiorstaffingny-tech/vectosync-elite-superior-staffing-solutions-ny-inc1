import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { missingRequired } from "./rapidExport";

export default function RapidEmployeeTable({ rows, selected, onToggle, onToggleAll }) {
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r._id));

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-3 w-10">
                <Checkbox checked={allSelected} onCheckedChange={onToggleAll} />
              </th>
              <th className="p-3 font-semibold">Name</th>
              <th className="p-3 font-semibold">Address</th>
              <th className="p-3 font-semibold">City / State / Zip</th>
              <th className="p-3 font-semibold">Phone</th>
              <th className="p-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const missing = missingRequired(r.row);
              const isSel = selected.has(r._id);
              return (
                <tr key={r._id} className="border-t border-border hover:bg-muted/30">
                  <td className="p-3">
                    <Checkbox checked={isSel} onCheckedChange={() => onToggle(r._id)} />
                  </td>
                  <td className="p-3 font-medium">{r.row["First Name"]} {r.row["Last Name"]}</td>
                  <td className="p-3 text-muted-foreground">{r.row["Address Line 1"] || "—"}</td>
                  <td className="p-3 text-muted-foreground">
                    {[r.row["City"], r.row["State"], r.row["Zip"]].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="p-3 text-muted-foreground">{r.row["Phone"] || "—"}</td>
                  <td className="p-3">
                    {missing.length === 0 ? (
                      <Badge className="bg-emerald-500/15 text-emerald-600 border-0">Ready</Badge>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-600 text-xs">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Missing: {missing.join(", ")}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No employees found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}