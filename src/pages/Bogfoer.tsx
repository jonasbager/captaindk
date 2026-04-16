import { useState } from "react";
import { motion } from "framer-motion";
import { Send, Paperclip, Check, Pencil } from "lucide-react";
import { chatMessages, formatAmount } from "@/lib/demo-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function BookingCard({ booking }: { booking: any }) {
  return (
    <div className="border border-border/50 rounded bg-background/50 p-4 space-y-3 max-w-sm">
      <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Konteringsforslag</div>
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
      <div className="flex gap-2 pt-1">
        <Button size="sm" className="gap-1.5 text-xs">
          <Check className="h-3 w-3" /> Godkend
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5 text-xs">
          <Pencil className="h-3 w-3" /> Ret
        </Button>
      </div>
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

  return (
    <div className="flex h-[calc(100vh-2.75rem)]">
      {/* Chat area */}
      <div className="flex-[7] flex flex-col border-r border-border/30">
        <div className="flex-1 overflow-auto p-6 space-y-4">
          {chatMessages.map((msg, i) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.25 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] rounded px-4 py-3 text-sm ${
                  msg.role === "user"
                    ? "bg-accent text-foreground"
                    : "bg-card border border-border/40"
                }`}
              >
                {msg.content && <p>{msg.content}</p>}
                {"booking" in msg && msg.booking && <BookingCard booking={msg.booking} />}
                {"hasAttachment" in msg && msg.hasAttachment && (
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <Paperclip className="h-3 w-3" />
                    <span>kvittering_elgiganten.pdf</span>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
        <div className="border-t border-border/30 p-4">
          <div className="flex gap-2">
            <Button variant="outline" size="icon" className="shrink-0">
              <Paperclip className="h-4 w-4" />
            </Button>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Beskriv en postering eller stil et spørgsmål..."
              className="bg-background"
            />
            <Button size="icon" className="shrink-0">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Context panel */}
      <div className="flex-[3] p-4 overflow-auto">
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
            <p className="text-sm">H1 2025 — <span className="text-primary text-xs">Indberettet</span></p>
            <p className="text-sm">H2 2025 — <span className="text-warning text-xs">Åben</span></p>
          </div>
          <div className="border border-border/40 rounded p-3 space-y-2">
            <p className="text-xs text-muted-foreground">Seneste posteringer — Småanskaffelser</p>
            <div className="text-xs space-y-1 text-muted-foreground">
              <p>2025-03-22 · Logitech mus · <span className="font-mono">-499,00 kr</span></p>
              <p>2025-02-10 · Skærmstativ · <span className="font-mono">-1.299,00 kr</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
