import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import ReactMarkdown from "react-markdown";
import { Bot, Send, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const AGENT = "admin_helper";

export default function AdminHelperChat() {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef();

  useEffect(() => {
    (async () => {
      const conv = await base44.agents.createConversation({
        agent_name: AGENT,
        metadata: { name: "Admin Helper Session" },
      });
      setConversation(conv);
      setMessages(conv.messages || []);
    })();
  }, []);

  useEffect(() => {
    if (!conversation?.id) return;
    const unsub = base44.agents.subscribeToConversation(conversation.id, (data) => {
      setMessages(data.messages || []);
    });
    return () => unsub();
  }, [conversation?.id]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!input.trim() || !conversation) return;
    setSending(true);
    const text = input.trim();
    setInput("");
    await base44.agents.addMessage(conversation, { role: "user", content: text });
    setSending(false);
  };

  return (
    <div className="bg-card border border-border rounded-xl flex flex-col" style={{ height: "62vh" }}>
      <div className="border-b border-border p-3 flex items-center gap-2">
        <div className="bg-primary/10 rounded-lg p-1.5"><Bot className="h-4 w-4 text-primary" /></div>
        <div>
          <p className="text-sm font-semibold">AI Admin Helper</p>
          <p className="text-[11px] text-muted-foreground">Reads your data, searches the web & can take actions on your behalf.</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-10 text-muted-foreground text-sm flex flex-col items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Ask me anything about employees, payroll, invoices, timesheets, scheduling — or have me create & update records for you.
          </div>
        )}
        {messages.map((m, i) => {
          const isUser = m.role === "user";
          if (!m.content && !(m.tool_calls?.length)) return null;
          return (
            <div key={i} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${isUser ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                {isUser ? (
                  <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                ) : (
                  <ReactMarkdown className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                    {m.content || "_Working..._"}
                  </ReactMarkdown>
                )}
                {m.tool_calls?.length > 0 && (
                  <p className="text-[11px] opacity-70 mt-1 italic">Used {m.tool_calls.length} tool(s)…</p>
                )}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div className="border-t border-border p-3 flex gap-2">
        <Input
          placeholder="Ask the AI Admin Helper..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          disabled={!conversation}
        />
        <Button size="icon" onClick={send} disabled={sending || !input.trim() || !conversation}>
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}