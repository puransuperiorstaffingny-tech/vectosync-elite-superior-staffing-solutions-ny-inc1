import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StickyNote, Send } from "lucide-react";
import { format } from "date-fns";

export default function QueryNotes({ notes = [], onAddNote, saving }) {
  const [text, setText] = useState("");

  const submit = async () => {
    const trimmed = text.trim();
    if (!trimmed || saving) return;
    await onAddNote(trimmed);
    setText("");
  };

  return (
    <div className="p-4 rounded-xl bg-card border border-border">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5">
        <StickyNote className="h-3.5 w-3.5" /> Notes
      </p>

      <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
        {notes.length === 0 ? (
          <p className="text-xs text-muted-foreground">No notes yet.</p>
        ) : (
          notes.map((n, i) => (
            <div key={i} className="p-2.5 rounded-lg bg-muted/40 text-xs">
              <p className="whitespace-pre-wrap">{n.text}</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                {n.author || "Agent"} · {n.created_at ? format(new Date(n.created_at), "MMM d, h:mm a") : ""}
              </p>
            </div>
          ))
        )}
      </div>

      <div className="space-y-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a note for this query…"
          className="text-sm min-h-[70px]"
        />
        <Button size="sm" onClick={submit} disabled={!text.trim() || saving} className="w-full">
          <Send className="h-3.5 w-3.5" /> {saving ? "Saving…" : "Add Note"}
        </Button>
      </div>
    </div>
  );
}