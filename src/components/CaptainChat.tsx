import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Loader2, Anchor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { SUPABASE_URL } from "@/integrations/supabase/client";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const CHAT_URL = `${SUPABASE_URL}/functions/v1/captain-chat`;

export function CaptainChat() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const userMsg: Msg = { role: "user", content: text };
    setMessages((p) => [...p, userMsg]);
    setLoading(true);

    try {
      const { data: { session } } = await (await import("@/integrations/supabase/client")).supabase.auth.getSession();
      if (!session) throw new Error("Ikke logget ind");

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ messages: [...messages, userMsg] }),
      });

      if (resp.status === 429) throw new Error("For mange forespørgsler. Prøv igen om lidt.");
      if (resp.status === 402) throw new Error("AI-credits opbrugt.");
      if (!resp.ok || !resp.body) throw new Error("Kunne ikke kontakte Captain");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let assistantSoFar = "";
      let streamDone = false;

      // Add empty assistant placeholder
      setMessages((p) => [...p, { role: "assistant", content: "" }]);

      const upsert = (chunk: string) => {
        assistantSoFar += chunk;
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content: assistantSoFar };
          return copy;
        });
      };

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let nl: number;
        while ((nl = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, nl);
          textBuffer = textBuffer.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") { streamDone = true; break; }
          try {
            const parsed = JSON.parse(json);
            const c = parsed.choices?.[0]?.delta?.content;
            if (c) upsert(c);
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (err: any) {
      toast({ title: "Fejl", description: err.message, variant: "destructive" });
      setMessages((p) => p.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-4 right-4 z-50 h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
        aria-label="Captain assistent"
      >
        {open ? <X className="h-5 w-5" /> : <Anchor className="h-5 w-5" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ duration: 0.18 }}
            className="fixed bottom-20 right-4 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-6rem)] bg-background border border-border rounded-lg shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-border/30 flex items-center gap-2">
              <Anchor className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Captain</h3>
              <span className="text-[10px] text-muted-foreground ml-auto">AI-assistent</span>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  <Anchor className="h-6 w-6 mx-auto mb-2 opacity-40" />
                  <p>Spørg mig om bogføring, moms eller status på dine bilag ⚓</p>
                </div>
              )}
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`text-sm whitespace-pre-wrap leading-relaxed ${
                    m.role === "user"
                      ? "ml-6 bg-primary/10 text-foreground rounded-lg px-3 py-2"
                      : "mr-6 text-foreground"
                  }`}
                >
                  {m.content || (loading && i === messages.length - 1 ? <Loader2 className="h-3 w-3 animate-spin inline" /> : null)}
                </div>
              ))}
            </div>

            <div className="border-t border-border/30 p-2 flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder="Spørg Captain..."
                rows={1}
                className="text-sm resize-none min-h-[36px] max-h-32"
              />
              <Button size="icon" onClick={send} disabled={loading || !input.trim()} className="shrink-0">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
