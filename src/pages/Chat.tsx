import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Paperclip, Sparkles, Receipt, FileText, Camera, Anchor, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "@/hooks/useCompany";
import { useAuth } from "@/hooks/useAuth";
import { supabase, SUPABASE_URL } from "@/integrations/supabase/client";
import { MessageCard, type StructuredCardData } from "@/components/MessageCard";
import { formatAmount, stripMarkdown } from "@/lib/format";

interface Msg {
  id?: string;
  role: "user" | "assistant" | "system";
  content: string;
  structured_data?: StructuredCardData | null;
}

const CHAT_URL = `${SUPABASE_URL}/functions/v1/captain-chat`;

export default function Chat() {
  const { toast } = useToast();
  const { company } = useCompany();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [counts, setCounts] = useState({ docs: 0, tx: 0 });
  const [undoneIds, setUndoneIds] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleUndo = async (entryId: string) => {
    const { error } = await supabase.from("journal_entries").delete().eq("id", entryId);
    if (error) {
      toast({ title: "Kunne ikke fortryde", description: error.message, variant: "destructive" });
      return;
    }
    setUndoneIds((prev) => new Set(prev).add(entryId));
    toast({ title: "Fortrudt", description: "Bogføringen er slettet." });
  };

  // Load history + context counts
  useEffect(() => {
    if (!company) return;
    (async () => {
      const [{ data: msgs }, docs, tx] = await Promise.all([
        supabase
          .from("chat_messages")
          .select("id, role, content, structured_data")
          .eq("company_id", company.id)
          .order("created_at", { ascending: true })
          .limit(100),
        supabase.from("documents").select("id", { count: "exact", head: true }).eq("company_id", company.id).eq("status", "pending"),
        supabase.from("transactions").select("id", { count: "exact", head: true }).eq("company_id", company.id).is("matched_document_id", null),
      ]);
      if (msgs) {
        setMessages(
          msgs.map((m) => ({
            id: m.id,
            role: m.role as Msg["role"],
            content: m.content,
            structured_data: (m.structured_data as unknown as StructuredCardData) ?? null,
          }))
        );
      }
      setCounts({ docs: docs.count ?? 0, tx: tx.count ?? 0 });
    })();
  }, [company]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const persist = async (role: "user" | "assistant", content: string, structured_data: StructuredCardData | null = null) => {
    if (!company || !user) return;
    await supabase.from("chat_messages").insert({
      company_id: company.id,
      user_id: user.id,
      role,
      content,
      structured_data: structured_data as any,
    });
  };

  const send = async (text?: string) => {
    const value = (text ?? input).trim();
    if (!value || loading || !company) return;
    setInput("");
    const userMsg: Msg = { role: "user", content: value };
    setMessages((p) => [...p, userMsg]);
    setLoading(true);
    persist("user", value);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Ikke logget ind");

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })) }),
      });
      if (resp.status === 429) throw new Error("For mange forespørgsler. Prøv igen om lidt.");

      // captain-chat v2 returnerer JSON: { content, structured_data } eller { error }
      const data = await resp.json();
      if (!resp.ok || data.error) throw new Error(data.error || "Kunne ikke kontakte Captain");

      const assistantMsg: Msg = {
        role: "assistant",
        content: data.content || "",
        structured_data: data.structured_data ?? null,
      };
      setMessages((p) => [...p, assistantMsg]);
      if (assistantMsg.content || assistantMsg.structured_data) {
        persist("assistant", assistantMsg.content, assistantMsg.structured_data);
      }
    } catch (err: any) {
      toast({ title: "Fejl", description: err.message, variant: "destructive" });
      setMessages((p) => p.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    { label: "Ny udgift", icon: Receipt, prompt: "Jeg har en ny udgift jeg vil bogføre: " },
    { label: "Ny faktura", icon: FileText, prompt: "Lav en ny faktura til " },
    { label: "Scan bilag", icon: Camera, prompt: "Jeg vil uploade et bilag" },
  ];

  return (
    <div className="flex h-[calc(100vh-2.75rem)]">
      {/* Chat column */}
      <div className="flex-1 flex flex-col min-w-0">
        <div ref={scrollRef} className="flex-1 overflow-auto px-4 md:px-8 py-6">
          <div className="max-w-2xl mx-auto space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-16">
                <Anchor className="h-8 w-8 mx-auto mb-4 text-primary/60" />
                <h1 className="text-lg font-semibold mb-1">God morgen{company?.name ? `, ${company.name.split(" ")[0]}` : ""}</h1>
                <p className="text-sm text-muted-foreground">Hvad skal vi sætte kurs mod i dag?</p>
              </div>
            )}
            <AnimatePresence initial={false}>
              {messages.map((m, i) => (
                <motion.div
                  key={m.id ?? i}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[85%] space-y-2 ${m.role === "user" ? "" : "w-full"}`}>
                    {m.content && (
                      <div className={`text-sm leading-relaxed whitespace-pre-wrap ${
                        m.role === "user"
                          ? "bg-primary/10 text-foreground rounded-lg px-3 py-2"
                          : ""
                      }`}>
                        {m.content ? stripMarkdown(m.content) : (loading && i === messages.length - 1 ? <Loader2 className="h-3 w-3 animate-spin inline" /> : null)}
                      </div>
                    )}
                    {m.structured_data && (
                      <MessageCard
                        data={m.structured_data}
                        onUndo={handleUndo}
                        undone={
                          m.structured_data.kind === "posting" && m.structured_data.entry_id
                            ? undoneIds.has(m.structured_data.entry_id)
                            : false
                        }
                      />
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {loading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex justify-start"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
            )}
          </div>
        </div>

        <div className="border-t border-border/30 px-4 md:px-8 py-3">
          <div className="max-w-2xl mx-auto space-y-2">
            <div className="flex gap-1.5 flex-wrap">
              {quickActions.map((q) => (
                <button
                  key={q.label}
                  onClick={() => setInput(q.prompt)}
                  className="text-[11px] px-2 py-1 rounded border border-border/40 hover:border-border/80 text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                >
                  <q.icon className="h-3 w-3" /> {q.label}
                </button>
              ))}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2 items-end">
              <Button type="button" variant="outline" size="icon" className="shrink-0 h-9 w-9">
                <Paperclip className="h-4 w-4" />
              </Button>
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
                className="text-sm resize-none min-h-[36px] max-h-32 bg-background"
              />
              <Button type="submit" size="icon" disabled={loading || !input.trim()} className="shrink-0 h-9 w-9">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Context panel — desktop only */}
      <aside className="hidden lg:flex w-[340px] border-l border-border/30 flex-col">
        <div className="px-5 py-4 border-b border-border/30">
          <p className="text-xs text-muted-foreground">Virksomhed</p>
          <p className="text-sm font-medium mt-0.5">{company?.name ?? "—"}</p>
          {company?.cvr && <p className="text-[11px] font-mono text-muted-foreground">CVR {company.cvr}</p>}
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <p className="text-xs text-muted-foreground mb-2">Indbakke</p>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Bilag uden match</span><span className="font-mono">{counts.docs}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Tx uden bilag</span><span className="font-mono">{counts.tx}</span></div>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-2">Forslag</p>
            <div className="flex flex-col gap-1.5">
              {[
                "Hvad har jeg brugt på software i år?",
                "Vis min momsstatus",
                "Lav en faktura",
              ].map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-left text-xs text-muted-foreground hover:text-foreground border border-border/30 hover:border-border/60 rounded px-2 py-1.5 flex items-center gap-1.5 transition-colors"
                >
                  <Sparkles className="h-3 w-3" /> {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
