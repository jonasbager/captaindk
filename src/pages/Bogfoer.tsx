import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Paperclip, Check, Pencil, CheckCircle } from "lucide-react";
import { chatMessages as initialMessages, formatAmount } from "@/lib/demo-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface BookingData {
  date: string;
  amountInclVat: number;
  amountExclVat: number;
  vat: number;
  account: string;
  counterAccount: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "system";
  content: string;
  booking?: BookingData;
  hasAttachment?: boolean;
  approved?: boolean;
}

const demoResponses: { trigger: RegExp; response: ChatMessage }[] = [
  {
    trigger: /faktura|invoice/i,
    response: {
      id: "", role: "system", content: "",
      booking: { date: new Date().toLocaleDateString("da-DK", { day: "numeric", month: "long", year: "numeric" }), amountInclVat: 12500, amountExclVat: 10000, vat: 2500, account: "1000 — Nettoomsætning", counterAccount: "Debitorer" },
    },
  },
  {
    trigger: /frokost|restaurant|mad/i,
    response: {
      id: "", role: "system", content: "",
      booking: { date: new Date().toLocaleDateString("da-DK", { day: "numeric", month: "long", year: "numeric" }), amountInclVat: 450, amountExclVat: 360, vat: 90, account: "3670 — Repræsentation", counterAccount: "Bankkonto" },
    },
  },
  {
    trigger: /software|licens|abonnement/i,
    response: {
      id: "", role: "system", content: "",
      booking: { date: new Date().toLocaleDateString("da-DK", { day: "numeric", month: "long", year: "numeric" }), amountInclVat: 299, amountExclVat: 239.20, vat: 59.80, account: "3630 — Software", counterAccount: "Bankkonto" },
    },
  },
];

const fallbackResponse: ChatMessage = {
  id: "", role: "system", content: "Jeg har ikke nok information til at lave et konteringsforslag. Kan du beskrive købet mere detaljeret — f.eks. hvad det var, beløbet og hvor det blev købt?",
};

function BookingCard({ booking, approved, onApprove }: { booking: BookingData; approved?: boolean; onApprove: () => void }) {
  return (
    <div className={`border rounded bg-background/50 p-4 space-y-3 max-w-sm transition-colors ${
      approved ? "border-primary/40 bg-primary/5" : "border-border/50"
    }`}>
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Konteringsforslag</div>
        {approved && <CheckCircle className="h-4 w-4 text-primary" />}
      </div>
      <div className="space-y-2 text-sm">
        <Row label="Dato" value={booking.date} />
        <Row label="Beløb inkl. moms" value={formatAmount(booking.amountInclVat)} mono />
        <Row label="Beløb ekskl. moms" value={formatAmount(booking.amountExclVat)} mono />
        <Row label="Moms (25%)" value={formatAmount(booking.vat)} mono />
        <div className="border-t border-border/30 pt-2">
          <Row label="Konto" value={booking.account} />
          <Row label="Modkonto" value={booking.counterAccount} />
        </div>
      </div>
      {!approved && (
        <div className="flex gap-2 pt-1">
          <Button size="sm" className="gap-1.5 text-xs" onClick={onApprove}>
            <Check className="h-3 w-3" /> Godkend
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs">
            <Pencil className="h-3 w-3" /> Ret
          </Button>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? "font-mono" : ""}>{value}</span>
    </div>
  );
}

export default function Bogfoer() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(
    initialMessages.map((m) => ({ ...m, approved: m.id === "c2" ? false : undefined }))
  );
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;

    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    setTimeout(() => {
      const matched = demoResponses.find((r) => r.trigger.test(text));
      const response: ChatMessage = matched
        ? { ...matched.response, id: `s-${Date.now()}`, approved: false }
        : { ...fallbackResponse, id: `s-${Date.now()}` };
      setMessages((prev) => [...prev, response]);
    }, 600);
  };

  const handleApprove = (msgId: string) => {
    setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, approved: true } : m));
    setTimeout(() => {
      setMessages((prev) => [...prev, {
        id: `s-${Date.now()}`,
        role: "system",
        content: "Postering godkendt og bogført ✓",
      }]);
    }, 300);
  };

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-2.75rem)]">
      <div className="flex-[7] flex flex-col border-r border-border/30">
        <div ref={scrollRef} className="flex-1 overflow-auto p-6 space-y-4">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className="max-w-[75%]">
                  {msg.role === "system" && (
                    <p className="text-[10px] text-muted-foreground mb-1 font-medium">Nav</p>
                  )}
                  <div
                    className={`rounded px-4 py-3 text-sm ${
                      msg.role === "user"
                        ? "bg-accent text-foreground"
                        : "bg-card border border-border/40"
                    }`}
                  >
                    {msg.content && <p>{msg.content}</p>}
                    {msg.booking && (
                      <BookingCard
                        booking={msg.booking}
                        approved={msg.approved}
                        onApprove={() => handleApprove(msg.id)}
                      />
                    )}
                    {msg.hasAttachment && (
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <Paperclip className="h-3 w-3" />
                        <span>kvittering_elgiganten.pdf</span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        <div className="border-t border-border/30 p-4">
          <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
            <Button type="button" variant="outline" size="icon" className="shrink-0">
              <Paperclip className="h-4 w-4" />
            </Button>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Beskriv en postering eller stil et spørgsmål..."
              className="bg-background"
            />
            <Button type="submit" size="icon" className="shrink-0">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>

      <div className="flex-[3] p-4 overflow-auto hidden md:block">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Kontekst</h3>
        <div className="space-y-4">
          <div className="border border-border/40 rounded p-3 space-y-2">
            <p className="text-xs text-muted-foreground">Relevante konti</p>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="font-mono text-xs">3615</span>
                <span>Småanskaffelser</span>
              </div>
              <div className="flex justify-between">
                <span className="font-mono text-xs">3620</span>
                <span>Kontorartikler</span>
              </div>
              <div className="flex justify-between">
                <span className="font-mono text-xs">3630</span>
                <span>Software</span>
              </div>
            </div>
          </div>
          <div className="border border-border/40 rounded p-3 space-y-2">
            <p className="text-xs text-muted-foreground">Momsperiode</p>
            <p className="text-sm">H2 2025 — <span className="text-primary text-xs">Betalt</span></p>
            <p className="text-sm">H1 2026 — <span className="text-warning text-xs">Åben</span></p>
          </div>
          <div className="border border-border/40 rounded p-3 space-y-2">
            <p className="text-xs text-muted-foreground">Seneste posteringer — Småanskaffelser</p>
            <div className="text-xs space-y-1 text-muted-foreground">
              <p>2026-03-22 · Logitech mus · <span className="font-mono">-499,00 kr</span></p>
              <p>2026-02-10 · Skærmstativ · <span className="font-mono">-1.299,00 kr</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
