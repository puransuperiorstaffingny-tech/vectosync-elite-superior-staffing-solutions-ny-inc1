import { Image as ImageIcon, ListChecks, MapPin } from "lucide-react";

// Detailed view of a single training section: large screenshots + numbered walkthrough steps.
export default function TrainingDetail({ section, index }) {
  if (!section) return null;
  const title = section.title.replace(/^\d+\.\s*/, "");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="h-11 w-11 rounded-xl bg-slate-900 flex items-center justify-center shrink-0 shadow">
          <span className="text-amber-400 text-base font-bold">{index + 1}</span>
        </div>
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-foreground leading-tight">{title}</h2>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><ListChecks className="h-3.5 w-3.5" />{section.content.length} steps</span>
            {section.images.length > 0 && (
              <span className="flex items-center gap-1"><ImageIcon className="h-3.5 w-3.5" />{section.images.length} visual{section.images.length > 1 ? "s" : ""}</span>
            )}
          </div>
        </div>
      </div>

      {/* Screenshots */}
      {section.images.length > 0 && (
        <div className={`gap-4 ${section.images.length > 1 ? "grid grid-cols-1 lg:grid-cols-2" : ""}`}>
          {section.images.map((img, i) => (
            <figure key={i} className="space-y-2">
              <div className="rounded-xl overflow-hidden border border-border shadow-md bg-white">
                <img src={img.url} alt={img.caption} className="w-full h-auto" loading="lazy" />
              </div>
              <figcaption className="text-xs text-muted-foreground italic leading-tight px-1 flex items-start gap-1.5">
                <MapPin className="h-3 w-3 mt-0.5 shrink-0 text-amber-500" />
                <span>{img.caption}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      {/* Steps */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-muted/40 flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-amber-600" />
          <span className="text-sm font-semibold">Step-by-step walkthrough</span>
        </div>
        <ol className="p-5 space-y-3">
          {section.content.map((point, i) => (
            <li key={i} className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-amber-700 text-xs font-bold">{i + 1}</span>
              </div>
              <p className="text-sm text-foreground leading-relaxed flex-1 min-w-0">{point}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}