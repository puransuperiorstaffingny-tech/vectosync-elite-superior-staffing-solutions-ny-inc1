import { useState } from "react";
import { Image, ChevronDown, ChevronUp } from "lucide-react";

// Collapsible manual section: header with number badge, optional screenshots, numbered steps.
export default function SectionCard({ section, index }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card w-full shadow-sm hover:shadow-md transition-shadow">
      <button
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted/40 transition-colors gap-3"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-slate-900 flex items-center justify-center shrink-0">
            <span className="text-amber-400 text-sm font-bold">{index + 1}</span>
          </div>
          <span className="font-semibold text-sm leading-snug truncate">{section.title.replace(/^\d+\.\s*/, "")}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {section.images.length > 0 && (
            <span className="text-xs text-muted-foreground hidden sm:flex items-center gap-1">
              <Image className="h-3 w-3" />{section.images.length}
            </span>
          )}
          <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
            {section.content.length} steps
          </span>
          {open
            ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
            : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-border">
          {section.images.length > 0 && (
            <div className={`p-4 bg-slate-50 ${section.images.length > 1 ? "grid grid-cols-1 sm:grid-cols-2 gap-4" : ""}`}>
              {section.images.map((img, i) => (
                <figure key={i} className="space-y-2">
                  <div className="rounded-lg overflow-hidden border border-border shadow bg-white">
                    <img src={img.url} alt={img.caption} className="w-full h-auto" loading="lazy" />
                  </div>
                  <figcaption className="text-xs text-muted-foreground text-center italic leading-tight px-1">
                    {img.caption}
                  </figcaption>
                </figure>
              ))}
            </div>
          )}

          <ol className="p-5 space-y-2.5">
            {section.content.map((point, i) => (
              <li key={i} className="flex items-start gap-3">
                <div className="h-5 w-5 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-amber-700 text-xs font-bold">{i + 1}</span>
                </div>
                <p className="text-sm text-foreground leading-relaxed flex-1 min-w-0">{point}</p>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}