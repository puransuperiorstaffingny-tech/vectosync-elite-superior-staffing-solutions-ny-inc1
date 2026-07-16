import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { missingRequired } from "@/components/rapid/rapidExport";

// Shows which selected employees are missing Rapid-required fields before upload.
export default function RapidValidationBanner({ rows, selected }) {
  const target = selected.size ? rows.filter((r) => selected.has(r._id)) : rows;
  const flagged = target
    .map((r) => ({ name: `${r.row["First Name"]} ${r.row["Last Name"]}`.trim() || "Unnamed", missing: missingRequired(r.row) }))
    .filter((r) => r.missing.length > 0);

  if (target.length === 0) return null;

  if (flagged.length === 0) {
    return (
      <Card className="border-emerald-500/30 bg-emerald-500/5">
        <CardContent className="py-3 text-sm flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          All {target.length} selected employee{target.length === 1 ? "" : "s"} have the required fields — ready to export &amp; upload.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-500/40 bg-amber-500/5">
      <CardContent className="py-3 text-sm space-y-2">
        <div className="flex items-center gap-2 font-medium text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {flagged.length} employee{flagged.length === 1 ? "" : "s"} missing required fields — fix on the employee record before uploading to Rapid.
        </div>
        <ul className="space-y-1 pl-6 list-disc text-muted-foreground">
          {flagged.map((r, i) => (
            <li key={i}>
              <span className="text-foreground">{r.name}</span> — missing: {r.missing.join(", ")}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}