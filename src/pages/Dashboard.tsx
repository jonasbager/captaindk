import { motion } from "framer-motion";
import { ArrowRight, FileWarning, CreditCard, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { company, kpiData, inboxCounts, recentEntries, formatAmountShort, formatAmount } from "@/lib/demo-data";
import { Badge } from "@/components/ui/badge";

const fadeIn = (delay: number) => ({
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, delay },
});

const statusColors: Record<string, string> = {
  godkendt: "bg-primary/15 text-primary border-primary/20",
  "ai-forslag": "bg-info/15 text-info border-info/20",
  afventer: "bg-warning/15 text-warning border-warning/20",
};

export default function Dashboard() {
  const kpis = [
    { label: "Omsætning YTD", value: kpiData.revenueYTD, positive: true },
    { label: "Resultat YTD", value: kpiData.resultYTD, positive: true },
    { label: "Skyldig moms", value: kpiData.vatOwed, positive: kpiData.vatOwed >= 0 },
    { label: "Banksaldo", value: kpiData.bankBalance, positive: true },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <motion.div {...fadeIn(0)}>
        <div className="flex items-baseline gap-3 flex-wrap">
          <h1 className="text-lg font-semibold">{company.name}</h1>
          <span className="text-xs font-mono text-muted-foreground">CVR {company.cvr}</span>
          <span className="text-xs text-muted-foreground">· Regnskabsår {company.fiscalYear}</span>
        </div>
      </motion.div>

      {/* KPI Cards — responsive */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((kpi, i) => (
          <motion.div key={kpi.label} {...fadeIn(0.05 * (i + 1))}
            className="border border-border/50 rounded bg-card p-4"
          >
            <p className="text-xs text-muted-foreground mb-1">{kpi.label}</p>
            <p className={`text-xl font-mono font-semibold ${kpi.positive ? "text-primary" : "text-destructive"}`}>
              {formatAmountShort(kpi.value)}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Indbakke section — responsive */}
      <motion.div {...fadeIn(0.25)} className="border border-border/50 rounded bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Indbakke</h2>
          <Link to="/indbakke" className="text-xs text-primary hover:underline flex items-center gap-1">
            Åbn indbakke <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link to="/indbakke" className="flex items-center gap-3 p-3 rounded border border-border/30 hover:border-border/60 transition-colors">
            <FileWarning className="h-4 w-4 text-warning" />
            <div>
              <p className="text-2xl font-mono font-semibold">{inboxCounts.unmatchedDocuments}</p>
              <p className="text-xs text-muted-foreground">Bilag uden match</p>
            </div>
          </Link>
          <Link to="/indbakke" className="flex items-center gap-3 p-3 rounded border border-border/30 hover:border-border/60 transition-colors">
            <CreditCard className="h-4 w-4 text-destructive" />
            <div>
              <p className="text-2xl font-mono font-semibold">{inboxCounts.unmatchedTransactions}</p>
              <p className="text-xs text-muted-foreground">Transaktioner uden bilag</p>
            </div>
          </Link>
          <Link to="/indbakke" className="flex items-center gap-3 p-3 rounded border border-border/30 hover:border-border/60 transition-colors">
            <Sparkles className="h-4 w-4 text-info" />
            <div>
              <p className="text-2xl font-mono font-semibold">{inboxCounts.pendingSuggestions}</p>
              <p className="text-xs text-muted-foreground">AI-forslag venter</p>
            </div>
          </Link>
        </div>
      </motion.div>

      {/* Recent entries — responsive table */}
      <motion.div {...fadeIn(0.35)}>
        <h2 className="text-sm font-semibold mb-3">Seneste posteringer</h2>
        <div className="border border-border/50 rounded overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-border/30 text-xs text-muted-foreground">
                <th className="text-left p-3 font-medium">Dato</th>
                <th className="text-left p-3 font-medium">Beskrivelse</th>
                <th className="text-left p-3 font-medium">Konto</th>
                <th className="text-right p-3 font-medium">Beløb</th>
                <th className="text-center p-3 font-medium">Status</th>
                <th className="text-center p-3 font-medium">Bilag</th>
              </tr>
            </thead>
            <tbody>
              {recentEntries.map((entry) => (
                <tr key={entry.id} className="border-b border-border/20 hover:bg-accent/30 transition-colors">
                  <td className="p-3 font-mono text-xs text-muted-foreground">{entry.date}</td>
                  <td className="p-3">{entry.description}</td>
                  <td className="p-3 text-xs text-muted-foreground font-mono">{entry.accountNumber}</td>
                  <td className={`p-3 text-right font-mono text-sm ${entry.amount >= 0 ? "text-primary" : "text-foreground"}`}>
                    {formatAmount(entry.amount)}
                  </td>
                  <td className="p-3 text-center">
                    <Badge variant="outline" className={`text-[10px] ${statusColors[entry.status]}`}>
                      {entry.status}
                    </Badge>
                  </td>
                  <td className="p-3 text-center">
                    <span className={`inline-block w-2 h-2 rounded-full ${entry.hasDocument ? "bg-primary" : "bg-destructive"}`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
