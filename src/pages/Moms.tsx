import { motion } from "framer-motion";
import { formatAmountShort } from "@/lib/demo-data";
import { Badge } from "@/components/ui/badge";

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
}

const vatPeriods: VatPeriod[] = [
  { id: "h1-2024", label: "H1 2024", start: "2024-01-01", end: "2024-06-30", salesVat: 48200, purchaseVat: 18340, netVat: 29860, status: "betalt" },
  { id: "h2-2024", label: "H2 2024", start: "2024-07-01", end: "2024-12-31", salesVat: 54700, purchaseVat: 21120, netVat: 33580, status: "betalt" },
  { id: "h1-2025", label: "H1 2025", start: "2025-01-01", end: "2025-06-30", salesVat: 62400, purchaseVat: 24850, netVat: 37550, status: "indberettet", deadline: "2025-09-01" },
  { id: "h2-2025", label: "H2 2025", start: "2025-07-01", end: "2025-12-31", salesVat: 18250, purchaseVat: 19507, netVat: -1257, status: "åben", deadline: "2026-03-01" },
];

const statusStyle: Record<string, string> = {
  åben: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  indberettet: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  betalt: "bg-primary/15 text-primary border-primary/20",
};

export default function Moms() {
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
            className="border border-border/50 rounded p-4"
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
          </motion.div>
        ))}
      </div>
    </div>
  );
}
