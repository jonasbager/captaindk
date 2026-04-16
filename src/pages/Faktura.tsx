import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, Send, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatAmount } from "@/lib/format";

interface InvoiceLine {
  id: number;
  description: string;
  quantity: number;
  price: number;
  vatRate: number;
}

const existingInvoices = [
  { id: "2026-047", customer: "Acme ApS", date: "2026-04-12", due: "2026-05-12", total: 28500, status: "sendt" as const },
  { id: "2026-046", customer: "TechCorp A/S", date: "2026-04-07", due: "2026-05-07", total: 45000, status: "betalt" as const },
  { id: "2026-045", customer: "Designbureauet IVS", date: "2026-03-25", due: "2026-04-25", total: 32000, status: "forfalden" as const },
  { id: "2026-044", customer: "Webshop Nordic", date: "2026-03-18", due: "2026-04-18", total: 18500, status: "betalt" as const },
  { id: "2026-043", customer: "StartupDK ApS", date: "2026-03-05", due: "2026-04-05", total: 12500, status: "betalt" as const },
];

const statusColors: Record<string, string> = {
  kladde: "bg-muted/50 text-muted-foreground border-muted",
  sendt: "bg-info/15 text-info border-info/20",
  betalt: "bg-primary/15 text-primary border-primary/20",
  forfalden: "bg-destructive/15 text-destructive border-destructive/20",
};

const customers = ["Acme ApS", "TechCorp A/S", "Designbureauet IVS", "Webshop Nordic", "StartupDK ApS"];

export default function Faktura() {
  const [showCreate, setShowCreate] = useState(false);
  const [customer, setCustomer] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("2026-04-16");
  const [dueDate, setDueDate] = useState("2026-05-16");
  const [lines, setLines] = useState<InvoiceLine[]>([
    { id: 1, description: "", quantity: 1, price: 0, vatRate: 25 },
  ]);

  const addLine = () => {
    setLines((prev) => [...prev, { id: Date.now(), description: "", quantity: 1, price: 0, vatRate: 25 }]);
  };

  const removeLine = (id: number) => {
    if (lines.length <= 1) return;
    setLines((prev) => prev.filter((l) => l.id !== id));
  };

  const updateLine = (id: number, field: keyof InvoiceLine, value: string | number) => {
    setLines((prev) => prev.map((l) => l.id === id ? { ...l, [field]: value } : l));
  };

  const subtotal = lines.reduce((sum, l) => sum + l.quantity * l.price, 0);
  const totalVat = lines.reduce((sum, l) => sum + l.quantity * l.price * (l.vatRate / 100), 0);
  const total = subtotal + totalVat;

  const nextInvoiceNumber = "2026-048";

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Fakturaer</h1>
        <Button size="sm" className="text-xs gap-1.5" onClick={() => setShowCreate(!showCreate)}>
          <Plus className="h-3 w-3" /> Ny faktura
        </Button>
      </motion.div>

      {showCreate && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="border border-border/50 rounded p-5 space-y-5"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Opret faktura</h2>
            <span className="text-xs font-mono text-muted-foreground">#{nextInvoiceNumber}</span>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Kunde</Label>
              <Select value={customer} onValueChange={setCustomer}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Vælg kunde..." />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                  <SelectItem value="__new">+ Opret ny kunde</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Fakturadato</Label>
              <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className="h-8 text-sm bg-background font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Forfaldsdato</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-8 text-sm bg-background font-mono" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_80px_100px_80px_32px] gap-2 text-xs text-muted-foreground font-medium">
              <span>Beskrivelse</span>
              <span>Antal</span>
              <span>Pris</span>
              <span>Moms</span>
              <span></span>
            </div>
            {lines.map((line) => (
              <div key={line.id} className="grid grid-cols-[1fr_80px_100px_80px_32px] gap-2">
                <Input
                  value={line.description}
                  onChange={(e) => updateLine(line.id, "description", e.target.value)}
                  placeholder="Beskrivelse..."
                  className="h-8 text-sm bg-background"
                />
                <Input
                  type="number"
                  value={line.quantity}
                  onChange={(e) => updateLine(line.id, "quantity", parseInt(e.target.value) || 0)}
                  className="h-8 text-sm bg-background font-mono"
                />
                <Input
                  type="number"
                  value={line.price}
                  onChange={(e) => updateLine(line.id, "price", parseFloat(e.target.value) || 0)}
                  className="h-8 text-sm bg-background font-mono"
                />
                <Select value={String(line.vatRate)} onValueChange={(v) => updateLine(line.id, "vatRate", parseInt(v))}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25%</SelectItem>
                    <SelectItem value="0">0%</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeLine(line.id)}>
                  <Trash2 className="h-3 w-3 text-muted-foreground" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" className="text-xs gap-1" onClick={addLine}>
              <Plus className="h-3 w-3" /> Tilføj linje
            </Button>
          </div>

          <div className="border-t border-border/30 pt-4 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-mono">{formatAmount(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Moms</span>
              <span className="font-mono">{formatAmount(totalVat)}</span>
            </div>
            <div className="flex justify-between font-semibold text-base pt-1 border-t border-border/20">
              <span>Total</span>
              <span className="font-mono text-primary">{formatAmount(total)}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <Button size="sm" className="text-xs gap-1.5">
              <Send className="h-3 w-3" /> Send via email
            </Button>
            <Button size="sm" variant="outline" className="text-xs gap-1.5">
              <Download className="h-3 w-3" /> Download PDF
            </Button>
          </div>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <div className="border border-border/50 rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30 text-xs text-muted-foreground">
                <th className="text-left p-3 font-medium">Faktura</th>
                <th className="text-left p-3 font-medium">Kunde</th>
                <th className="text-left p-3 font-medium">Dato</th>
                <th className="text-left p-3 font-medium">Forfald</th>
                <th className="text-right p-3 font-medium">Beløb</th>
                <th className="text-center p-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {existingInvoices.map((inv, i) => (
                <motion.tr
                  key={inv.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="border-b border-border/20 hover:bg-accent/20 transition-colors cursor-pointer"
                >
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-mono text-xs">#{inv.id}</span>
                    </div>
                  </td>
                  <td className="p-3">{inv.customer}</td>
                  <td className="p-3 font-mono text-xs text-muted-foreground">{inv.date}</td>
                  <td className="p-3 font-mono text-xs text-muted-foreground">{inv.due}</td>
                  <td className="p-3 text-right font-mono text-primary">{formatAmount(inv.total)}</td>
                  <td className="p-3 text-center">
                    <Badge variant="outline" className={`text-[10px] ${statusColors[inv.status]}`}>
                      {inv.status}
                    </Badge>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
