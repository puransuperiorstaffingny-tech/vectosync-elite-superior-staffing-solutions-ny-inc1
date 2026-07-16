import { CheckCircle2, ListChecks, MapPin, PlayCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// Course-style lesson view: video player (or screenshot fallback) + steps + complete button.
export default function LessonPlayer({ section, index, videoUrl, completed, onToggleComplete, saving }) {
  if (!section) return null;
  const title = section.title.replace(/^\d+\.\s*/, "");
  const poster = section.images?.[0]?.url;

  return (
    <div className="space-y-5">
      {/* Player */}
      <div className="rounded-2xl overflow-hidden border border-border bg-black shadow-lg">
        {videoUrl ? (
          <video
            key={videoUrl}
            src={videoUrl}
            poster={poster}
            controls
            playsInline
            className="w-full aspect-video bg-black"
          />
        ) : poster ? (
          <div className="relative">
            <img src={poster} alt={title} className="w-full aspect-video object-cover opacity-95" />
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 gap-2">
              <PlayCircle className="h-12 w-12 text-white/80" />
              <span className="text-xs text-white/80 font-medium">Visual walkthrough — narrated video coming soon</span>
            </div>
          </div>
        ) : (
          <div className="w-full aspect-video flex items-center justify-center bg-slate-900 text-slate-400 text-sm gap-2">
            <PlayCircle className="h-10 w-10" /> Lesson reference
          </div>
        )}
      </div>

      {/* Title + complete */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center shrink-0 shadow">
            <span className="text-amber-400 text-sm font-bold">{index + 1}</span>
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-foreground leading-tight">{title}</h2>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><ListChecks className="h-3.5 w-3.5" />{section.content.length} steps</span>
              {videoUrl && <span className="flex items-center gap-1"><PlayCircle className="h-3.5 w-3.5 text-amber-500" />Video lesson</span>}
            </div>
          </div>
        </div>
        <Button
          onClick={onToggleComplete}
          disabled={saving}
          variant={completed ? "outline" : "default"}
          className="shrink-0"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          {completed ? "Completed" : "Mark complete"}
        </Button>
      </div>

      {/* Caption */}
      {section.images?.[0]?.caption && (
        <p className="text-xs text-muted-foreground italic flex items-start gap-1.5 -mt-2">
          <MapPin className="h-3 w-3 mt-0.5 shrink-0 text-amber-500" />
          <span>{section.images[0].caption}</span>
        </p>
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