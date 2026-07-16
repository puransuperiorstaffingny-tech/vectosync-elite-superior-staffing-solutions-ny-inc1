import { CheckCircle2, PlayCircle, Circle } from "lucide-react";

// Course playlist: list of lessons with video/completed indicators.
export default function LessonPlaylist({ sections, videos, completedIds, activeIdx, onSelect, lessonId }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden lg:max-h-[70vh] lg:overflow-y-auto">
      {sections.map((sec, idx) => {
        const isActive = idx === activeIdx;
        const done = completedIds.has(lessonId(idx));
        const hasVideo = !!videos[idx];
        return (
          <button
            key={idx}
            onClick={() => onSelect(idx)}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left border-b border-border last:border-b-0 transition-colors ${
              isActive ? "bg-amber-50" : "hover:bg-muted/40"
            }`}
          >
            {done
              ? <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
              : hasVideo
                ? <PlayCircle className={`h-5 w-5 shrink-0 ${isActive ? "text-amber-500" : "text-slate-400"}`} />
                : <Circle className="h-5 w-5 text-slate-300 shrink-0" />}
            <span className={`text-sm leading-snug flex-1 min-w-0 ${isActive ? "font-semibold text-foreground" : "text-foreground"}`}>
              <span className="text-muted-foreground mr-1">{idx + 1}.</span>
              {sec.title.replace(/^\d+\.\s*/, "")}
            </span>
            {hasVideo && (
              <span className="text-[10px] font-semibold text-amber-600 bg-amber-100 rounded px-1.5 py-0.5 shrink-0">VIDEO</span>
            )}
          </button>
        );
      })}
    </div>
  );
}