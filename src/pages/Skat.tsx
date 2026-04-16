import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Check, ChevronDown, ChevronUp, Building2 } from "lucide-react";
import { formatAmountShort } from "@/lib/format";
import { useCompany } from "@/hooks/useCompany";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function Skat() {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState<number | null>(null);

  const copyAll = () => {
    const text = taxRubrikker.map((r) => `Rubrik ${r.number}: ${formatAmountShort(r.amount)}`).join("\n");
    navigator.clipboard.writeText(text);
    toast({ title: "Kopieret", description: "Alle rubrik-værdier kopieret til udklipsholder" });
  };

  const copySingle = (r: typeof taxRubrikker[0]) => {
    navigator.clipboard.writeText(formatAmountShort(r.amount));
    toast({ title: "Kopieret", description: `Rubrik ${r.number}: ${formatAmountShort(r.amount)}` });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <Building2 className="h-5 w-5" /> Oplysningsskema
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {company.name} · CVR {company.cvr} · Regnskabsår 2025
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-primary" />
            <span className="text-primary">Klar til indberetning</span>
          </span>
          <Button size="sm" className="text-xs gap-1.5" onClick={copyAll}>
            <Copy className="h-3 w-3" /> Kopier alle værdier
          </Button>
        </div>
      </motion.div>

      <div className="border border-border/50 rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/30 text-xs text-muted-foreground">
              <th className="text-left p-3 font-medium w-24">Rubrik</th>
              <th className="text-left p-3 font-medium">Feltnavn</th>
              <th className="text-right p-3 font-medium">Beløb</th>
              <th className="text-center p-3 font-medium w-16"></th>
            </tr>
          </thead>
          <tbody>
            {taxRubrikker.map((r, i) => (
              <motion.tr
                key={r.number}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.04 }}
                className="border-b border-border/20 group"
              >
                <td colSpan={4} className="p-0">
                  <div
                    className="flex items-center p-3 hover:bg-accent/30 transition-colors cursor-pointer"
                    onClick={() => setExpanded(expanded === r.number ? null : r.number)}
                  >
                    <span className="font-mono text-xs text-muted-foreground w-24">{r.number}</span>
                    <span className="flex-1">{r.name}</span>
                    <span className={`font-mono text-sm mr-4 ${r.amount >= 0 ? "text-primary" : "text-destructive"}`}>
                      {formatAmountShort(r.amount)}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 mr-2"
                      onClick={(e) => { e.stopPropagation(); copySingle(r); }}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    {expanded === r.number ? (
                      <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </div>
                  {expanded === r.number && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      className="px-3 pb-3 overflow-hidden"
                    >
                      <div className="bg-background/50 border border-border/30 rounded p-3 text-xs text-muted-foreground ml-24">
                        {r.explanation}
                      </div>
                    </motion.div>
                  )}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
