import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { formatAmountShort, formatAmount } from "@/lib/demo-data";
import { Badge } from "@/components/ui/badge";

interface VatLine {
  date: string;
  description: string;
  amount: number;
  type: "salg" | "køb";
}

interface VatPeriod {
  id: string;
  label: string;
  start: string;
  end: string;
  salesVat: number;
  purchaseVat: number;
  netVat: number;
  status: "åben" | "indberettet" | "betalt";
  deadline?: string;
  lines: VatLine[];
}

const vatPeriods: VatPeriod[] = [
  {
    id: "h1-2024", label: "H1 2024", start: "2024-01-01", end: "2024-06-30",
    salesVat: 48200, purchaseVat: 18340, netVat: 29860, status: "betalt",
    lines: [
      { date: "2024-01-15", description: "Faktura #2024-001 — Konsulenthonorar", amount: 12500, type: "salg" },
      { date: "2024-02-10", description: "Faktura #2024-005 — Webdesign", amount: 8750, type: "salg" },
      { date: "2024-03-20", description: "Adobe Creative Cloud", amount: -1123, type: "køb" },
      { date: "2024-04-05", description: "Faktura #2024-012 — Rådgivning", amount: 15200, type: "salg" },
      { date: "2024-05-18", description: "Kontorartikler", amount: -3450, type: "køb" },
      { date: "2024-06-30", description: "Faktura #2024-018 — Udvikling", amount: 11750, type: "salg" },
    ],
  },
  {
    id: "h2-2024", label: "H2 2024", start: "2024-07-01", end: "2024-12-31",
    salesVat: 54700, purchaseVat: 21120, netVat: 33580, status: "betalt",
    lines: [
      { date: "2024-07-10", description: "Faktura #2024-022 — Projektledelse", amount: 18500, type: "salg" },
      { date: "2024-08-22", description: "Software licenser", amount: -4200, type: "køb" },
      { date: "2024-09-15", description: "Faktura #2024-028 — Design", amount: 14300, type: "salg" },
      { date: "2024-10-05", description: "Kontorindretning", amount: -8750, type: "køb" },
      { date: "2024-11-20", description: "Faktura #2024-035 — Konsulenthonorar", amount: 21900, type: "salg" },
    ],
  },
  {
    id: "h1-2025", label: "H1 2025", start: "2025-01-01", end: "2025-06-30",
    salesVat: 62400, purchaseVat: 24850, netVat: 37550, status: "indberettet", deadline: "2025-09-01",
    lines: [
      { date: "2025-01-12", description: "Faktura #2025-001 — Webdesign", amount: 22000, type: "salg" },
      { date: "2025-02-03", description: "GitHub Pro plan", amount: -183, type: "køb" },
      { date: "2025-03-18", description: "Faktura #2025-044 — Webdesign", amount: 18500, type: "salg" },
      { date: "2025-04-07", description: "Faktura #2025-046 — Konsulenthonorar", amount: 45000, type: "salg" },
      { date: "2025-04-15", description: "Elgiganten — Skærm", amount: -3499, type: "køb" },
      { date: "2025-05-10", description: "Kontorland — Kontorartikler", amount: -1287, type: "køb" },
    ],
  },
  {
    id: "h2-2025", label: "H2 2025", start: "2025-07-01", end: "2025-12-31",
    salesVat: 18250, purchaseVat: 19507, netVat: -1257, status: "åben", deadline: "2026-03-01",
    lines: [
      { date: "2025-07-15", description: "Faktura #2025-048 — Rådgivning", amount: 12500, type: "salg" },
      { date: "2025-08-20", description: "Adobe Creative Cloud", amount: -449, type: "køb" },
      { date: "2025-09-10", description: "DSB — Transport", amount: -342, type: "køb" },
      { date: "2025-10-01", description: "Proshop — USB-hub", amount: -2199, type: "køb" },
      { date: "2025-10-22", description: "Faktura #2025-052 — Design", amount: 5750, type: "salg" },
    ],
  },
];

const statusStyle: Record<string, string> = {
  åben: "bg-warning/15 text-warning border-warning/20",
  indberettet: "bg-info/15 text-info border-info/20",
  betalt: "bg-primary/15 text-primary border-primary/20",
};

export default function Moms() {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-lg font-semibold">
        Momsperioder
      </motion.h1>

      <div className="grid gap-4">
        {vatPeriods.map((period, i) => (
          <motion.div
            key={period.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="border border-border/50 rounded"
          >
            <button
              onClick={() => setExpanded(expanded === period.id ? null : period.id)}
              className="w-full p-4 text-left"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-sm font-semibold">{period.label}</h2>
                  <span className="text-xs text-muted-foreground font-mono">{period.start} → {period.end}</span>
                </div>
                <div className="flex items-center gap-3">
                  {period.deadline && period.status !== "betalt" && (
                    <span className="text-[10px] text-muted-foreground">Frist: {period.deadline}</span>
                  )}
                  <Badge variant="outline" className={`text-[10px] ${statusStyle[period.status]}`}>
                    {period.status}
                  </Badge>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${
                    expanded === period.id ? "rotate-180" : ""
                  }`} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Salgsmoms</p>
                  <p className="font-mono text-sm">{formatAmountShort(period.salesVat)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Købsmoms</p>
                  <p className="font-mono text-sm">{formatAmountShort(period.purchaseVat)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Nettomoms</p>
                  <p className={`font-mono text-sm font-semibold ${period.netVat >= 0 ? "" : "text-destructive"}`}>
                    {formatAmountShort(period.netVat)}
                  </p>
                </div>
              </div>
            </button>

            <AnimatePresence>
              {expanded === period.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="border-t border-border/30 p-4">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-muted-foreground border-b border-border/20">
                          <th className="text-left pb-2 font-medium">Dato</th>
                          <th className="text-left pb-2 font-medium">Beskrivelse</th>
                          <th className="text-center pb-2 font-medium">Type</th>
                          <th className="text-right pb-2 font-medium">Momsbeløb</th>
                        </tr>
                      </thead>
                      <tbody>
                        {period.lines.map((line, j) => (
                          <tr key={j} className="border-b border-border/10">
                            <td className="py-2 font-mono text-xs text-muted-foreground">{line.date}</td>
                            <td className="py-2">{line.description}</td>
                            <td className="py-2 text-center">
                              <Badge variant="outline" className={`text-[10px] ${
                                line.type === "salg" ? "bg-primary/10 text-primary border-primary/20" : "bg-info/10 text-info border-info/20"
                              }`}>
                                {line.type === "salg" ? "Salgsmoms" : "Købsmoms"}
                              </Badge>
                            </td>
                            <td className={`py-2 text-right font-mono ${line.amount >= 0 ? "text-primary" : ""}`}>
                              {formatAmount(Math.abs(line.amount * 0.25))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
