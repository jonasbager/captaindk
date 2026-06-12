import { useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowRight, FileWarning, CreditCard, Sparkles, Inbox } from "lucide-react";
import { Link } from "react-router-dom";
import { useCompany } from "@/hooks/useCompany";
import { formatAmountShort, formatAmount } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useEngineEntries } from "@/hooks/useEngineEntries";
import { computeResultat, computeBalance } from "@/lib/skat/engine";

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

interface JournalEntry {
  id: string;
  date: string;
  description: string;
  amount: number;
  account: string;
  account_number: number | null;
  status: string;
  has_document: boolean;
}

export default function Dashboard() {
  const { company } = useCompany();
  const { entries: engineEntries } = useEngineEntries();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [counts, setCounts] = useState({ documents: 0, transactions: 0, suggestions: 0 });

  const today = new Date().toISOString().slice(0, 10);
  const yearStart = `${new Date().getFullYear()}-01-01`;

  const resultat = useMemo(
    () => computeResultat(engineEntries, yearStart, today),
    [engineEntries, yearStart, today]
  );
  const balance = useMemo(
    () => computeBalance(engineEntries, today),
    [engineEntries, today]
  );
  const banksaldo = useMemo(
    () => engineEntries.filter((e) => e.account_number === 5000).reduce((s, e) => s + e.net_amount, 0),
    [engineEntries]
  );

  useEffect(() => {
    if (!company) return;

    const fetchData = async () => {
      const [entriesRes, docsRes, txRes] = await Promise.all([
        supabase
          .from("journal_entries")
          .select("*")
          .eq("company_id", company.id)
          .order("date", { ascending: false })
          .limit(7),
        supabase
          .from("documents")
          .select("id", { count: "exact", head: true })
          .eq("company_id", company.id)
          .eq("status", "pending"),
        supabase
          .from("transactions")
          .select("id", { count: "exact", head: true })
          .eq("company_id", company.id)
          .is("matched_document_id", null),
      ]);

      if (entriesRes.data) setEntries(entriesRes.data);
      setCounts({
        documents: docsRes.count || 0,
        transactions: txRes.count || 0,
        suggestions: 0,
      });
    };

    fetchData();
  }, [company]);

  if (!company) return null;

  const fiscalYear = new Date(company.fiscal_year_start).getFullYear();

  const kpis = [
    { label: "Omsætning YTD", value: resultat.nettoomsaetning },
    { label: "Resultat YTD", value: resultat.resultat },
    { label: "Skyldig moms", value: balance.skyldig_moms },
    { label: "Banksaldo", value: banksaldo },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <motion.div {...fadeIn(0)}>
        <div className="flex items-baseline gap-3 flex-wrap">
          <h1 className="text-lg font-semibold">{company.name}</h1>
          {company.cvr && <span className="text-xs font-mono text-muted-foreground">CVR {company.cvr}</span>}
          <span className="text-xs text-muted-foreground">· Regnskabsår {fiscalYear}</span>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((kpi, i) => (
          <motion.div key={kpi.label} {...fadeIn(0.05 * (i + 1))}
            className="border border-border/50 rounded bg-card p-4"
          >
            <p className="text-xs text-muted-foreground mb-1">{kpi.label}</p>
            <p className={`text-xl font-mono font-semibold ${kpi.value !== 0 ? (kpi.value >= 0 ? "" : "text-destructive") : "text-muted-foreground"}`}>
              {formatAmountShort(kpi.value)}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Indbakke section */}
      <motion.div {...fadeIn(0.25)} className="border border-border/50 rounded bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Indbakke</h2>
          <Link to="/indbakke" className="text-xs text-primary hover:underline flex items-center gap-1">
            Åbn indbakke <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {counts.documents === 0 && counts.transactions === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Inbox className="h-8 w-8 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">Ingen ventende elementer</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Upload bilag eller importer transaktioner for at komme i gang</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link to="/indbakke" className="flex items-center gap-3 p-3 rounded border border-border/30 hover:border-border/60 transition-colors">
              <FileWarning className="h-4 w-4 text-warning" />
              <div>
                <p className="text-2xl font-mono font-semibold">{counts.documents}</p>
                <p className="text-xs text-muted-foreground">Bilag uden match</p>
              </div>
            </Link>
            <Link to="/indbakke" className="flex items-center gap-3 p-3 rounded border border-border/30 hover:border-border/60 transition-colors">
              <CreditCard className="h-4 w-4 text-destructive" />
              <div>
                <p className="text-2xl font-mono font-semibold">{counts.transactions}</p>
                <p className="text-xs text-muted-foreground">Transaktioner uden bilag</p>
              </div>
            </Link>
            <Link to="/indbakke" className="flex items-center gap-3 p-3 rounded border border-border/30 hover:border-border/60 transition-colors">
              <Sparkles className="h-4 w-4 text-info" />
              <div>
                <p className="text-2xl font-mono font-semibold">{counts.suggestions}</p>
                <p className="text-xs text-muted-foreground">AI-forslag venter</p>
              </div>
            </Link>
          </div>
        )}
      </motion.div>

      {/* Recent entries */}
      <motion.div {...fadeIn(0.35)}>
        <h2 className="text-sm font-semibold mb-3">Seneste posteringer</h2>
        {entries.length === 0 ? (
          <div className="border border-border/50 rounded bg-card flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-muted-foreground">Ingen posteringer endnu</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Brug bogførings-chatten til at oprette din første postering</p>
            <Link to="/bogfoer" className="text-xs text-primary hover:underline mt-3 flex items-center gap-1">
              Gå til bogføring <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        ) : (
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
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-border/20 hover:bg-accent/30 transition-colors">
                    <td className="p-3 font-mono text-xs text-muted-foreground">{entry.date}</td>
                    <td className="p-3">{entry.description}</td>
                    <td className="p-3 text-xs text-muted-foreground font-mono">{entry.account_number}</td>
                    <td className={`p-3 text-right font-mono text-sm ${entry.amount >= 0 ? "text-primary" : "text-foreground"}`}>
                      {formatAmount(entry.amount)}
                    </td>
                    <td className="p-3 text-center">
                      <Badge variant="outline" className={`text-[10px] ${statusColors[entry.status] || ""}`}>
                        {entry.status}
                      </Badge>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`inline-block w-2 h-2 rounded-full ${entry.has_document ? "bg-primary" : "bg-destructive"}`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}
