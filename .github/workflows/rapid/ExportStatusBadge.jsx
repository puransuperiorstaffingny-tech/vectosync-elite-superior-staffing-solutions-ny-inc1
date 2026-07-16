import { CheckCircle2, Clock, AlertTriangle, XCircle } from "lucide-react";

const MAP = {
  generated: { label: "Generated", cls: "bg-sky-100 text-sky-700 border-sky-200", icon: Clock },
  uploaded: { label: "Uploaded", cls: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  needs_attention: { label: "Needs Attention", cls: "bg-amber-100 text-amber-700 border-amber-200", icon: AlertTriangle },
  failed: { label: "Failed", cls: "bg-red-100 text-red-700 border-red-200", icon: XCircle },
};

export default function ExportStatusBadge({ status }) {
  const s = MAP[status] || MAP.generated;
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${s.cls}`}>
      <Icon className="h-3 w-3" /> {s.label}
    </span>
  );
}