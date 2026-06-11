import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Copy, Check, ChevronDown, ChevronUp, Building2, FileText, AlertTriangle, Loader2 } from "lucide-react";
import { formatAmount } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { computeOplysningsskema, computeSelskabsskat, computeAarsrapportB } from "@/lib/skat/engine";
import { useEngineEntries, type EntryWithMeta } from "@/hooks/useEngineEntries";

// Which entries back each rubrik — mirrors the engine's tax_line semantics
const resultatLines = ["nettoomsaetning", "andre_indtaegter", "vareforbrug", "fremmed_arbejde", "andre_driftsomkostninger", "revisor_advokat", "repraesentation", "boeder", "afskrivninger"];
const andreOmkLines = ["andre_driftsomkostninger", "revisor_advokat", "repraesentation", "boeder", "afskrivninger"];

const rubrikFilters: Record<string, (e: EntryWithMeta) => boolean> = {
  "111": (e) => resultatLines.includes(e.tax_line || ""),
  "112": (e) => resultatLines.includes(e.tax_line || ""),
  "114": (e) => e.tax_line === "renteindtaegter",
  "116": (e) => e.tax_line === "renteudgifter",
  "320": (e) => e.tax_line === "nettoomsaetning" && e.account_kind === "revenue",
  "321": (e) => e.tax_line === "vareforbrug" && e.account_kind === "expense",
  "322": (e) => e.tax_line === "fremmed_arbejde" && e.account_kind === "expense",
  "323": (e) => andreOmkLines.includes(e.tax_line || "") && e.account_kind === "expense",
  "331": (e) => e.tax_line === "egenkapital",
  "332": (e) => e.tax_line === "anlaegsaktiver" || e.tax_line === "omsaetningsaktiver",
  "63x": (e) => e.tax_line === "anlaegsaktiver",
  "638": (e) => e.tax_line === "skyldig_moms",
};

export default function Skat() {
  const { toast } = useToast();
  const { entries, loading, company } = useEngineEntries();
  const [expanded, setExpanded] = useState<string | null>(null);
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);

  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;
  const isAps = company?.company_type === "aps";

  const skema = useMemo(
    () => (!isAps ? computeOplysningsskema(entries, yearStart, yearEnd) : null),
    [entries, yearStart, yearEnd, isAps]
  );
  const selskab = useMemo(
    () => (isAps ? computeSelskabsskat(entries, yearStart, yearEnd) : null),
    [entries, yearStart, yearEnd, isAps]
  );
  const aarsrapport = useMemo(
    () => (selskab ? computeAarsrapportB(entries, yearStart, yearEnd, selskab.selskabsskat) : null),
    [entries, yearStart, yearEnd, selskab]
  );

  const inYear = (e: EntryWithMeta) => e.date >= yearStart && e.date <= yearEnd;
  const upToYearEnd = (e: EntryWithMeta) => e.date <= yearEnd;
  // Balance rubrikker (331, 332, 63x, 638) are per-date; resultat rubrikker are per-period
  const balanceRubrikker = ["331", "332", "63x", "638"];

  const allRows = skema ? [...skema.virksomhedsoplysninger, ...skema.regnskabsoplysninger] : [];

  const copyAll = () => {
    const text = allRows
      .filter((r) => typeof r.amount === "number")
      .map((r) => `Rubrik ${r.rubrik}: ${formatAmount(r.amount as number)}`)
      .join("\n");
    navigator.clipboard.writeText(text);
    toast({ title: "Kopieret", description: "Alle rubrik-værdier kopieret til udklipsholder" });
  };

  const copySingle = (rubrik: string, amount: number) => {
    navigator.clipboard.writeText(String(amount));
    toast({ title: "Kopieret", description: `Rubrik ${rubrik}: ${formatAmount(amount)}` });
  };

  const warnings = skema?.warnings || selskab?.warnings || [];

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto flex items-center justify-center py-24">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const renderRow = (r: { rubrik: string; label: string; amount: number | string }, i: number) => {
    const isNumber = typeof r.amount === "number";
    const filter = rubrikFilters[r.rubrik];
    const backing = filter
      ? entries.filter((e) => (balanceRubrikker.includes(r.rubrik) ? upToYearEnd(e) : inYear(e)) && filter(e))
      : [];
    const canExpand = backing.length > 0;
    const isOpen = expanded === r.rubrik;
    return (
      <motion.tr
        key={`${r.rubrik}-${r.label}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: i * 0.03 }}
        className="border-b border-border/20 group"
      >
        <td colSpan={4} className="p-0">
          <div
            className={`flex items-center p-3 transition-colors ${canExpand ? "cursor-pointer hover:bg-accent/30" : ""}`}
            onClick={() => canExpand && setExpanded(isOpen ? null : r.rubrik)}
          >
            <span className="font-mono text-xs text-muted-foreground w-24">{r.rubrik}</span>
            <span className="flex-1">{r.label}</span>
            <span className={`font-mono text-sm mr-4 ${isNumber ? ((r.amount as number) >= 0 ? "text-primary" : "text-destructive") : "text-muted-foreground"}`}>
              {isNumber ? formatAmount(r.amount as number) : String(r.amount)}
            </span>
            {isNumber && (
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 mr-2"
                onClick={(e) => { e.stopPropagation(); copySingle(r.rubrik, r.amount as number); }}
              >
                <Copy className="h-3 w-3" />
              </Button>
            )}
            <span className="w-5 flex justify-center">
              {canExpand && (isOpen ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />)}
            </span>
          </div>
          {isOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="overflow-hidden">
              <div className="bg-background/50 border-t border-border/20">
                {backing.map((e) => (
                  <div key={e.id} className="flex items-center px-3 py-2 text-xs border-b border-border/10 last:border-b-0">
                    <span className="font-mono text-muted-foreground w-24">{e.date}</span>
                    <span className="flex-1 truncate">{e.description}</span>
                    <span className="font-mono text-muted-foreground w-40 truncate text-right">{e.account_number} {e.account}</span>
                    <span className="font-mono w-32 text-right">{formatAmount(e.net_amount)}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </td>
      </motion.tr>
    );
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <Building2 className="h-5 w-5" /> {isAps ? "Selskabsskat" : "Oplysningsskema"}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {company?.name || "—"} {company?.cvr ? `· CVR ${company.cvr}` : ""} · Indkomstår {year}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            {[currentYear, currentYear - 1].map((y) => (
              <button
                key={y}
                onClick={() => setYear(y)}
                className={`px-2.5 py-1 rounded text-xs font-mono border transition-colors ${
                  y === year ? "border-primary/50 bg-primary/10 text-primary" : "border-border/40 text-muted-foreground hover:border-border/70"
                }`}
              >
                {y}
              </button>
            ))}
          </div>
          {!isAps && allRows.length > 0 && entries.length > 0 && (
            <Button size="sm" className="text-xs gap-1.5" onClick={copyAll}>
              <Copy className="h-3 w-3" /> Kopier alle værdier
            </Button>
          )}
        </div>
      </motion.div>

      {entries.length === 0 ? (
        <div className="border border-border/50 rounded bg-card flex flex-col items-center justify-center py-16 text-center">
          <FileText className="h-8 w-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">Ingen skattedata endnu</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Oplysningsskemaet beregnes automatisk når du har bogført posteringer</p>
        </div>
      ) : !isAps && skema ? (
        <>
          <div className="border border-border/50 rounded overflow-hidden">
            <div className="p-3 bg-accent/20 border-b border-border/20 text-xs font-semibold">Virksomhedsoplysninger</div>
            <table className="w-full text-sm">
              <tbody>{skema.virksomhedsoplysninger.map(renderRow)}</tbody>
            </table>
          </div>

          <div className="border border-border/50 rounded overflow-hidden">
            <div className="p-3 bg-accent/20 border-b border-border/20 text-xs font-semibold">
              Regnskabsoplysninger
              {skema.fritaget_regnskabsoplysninger && (
                <span className="ml-2 font-normal text-muted-foreground">(omsætning under 300.000 kr. — kun rubrik 300-306)</span>
              )}
            </div>
            <table className="w-full text-sm">
              <tbody>{skema.regnskabsoplysninger.map((r, i) => renderRow(r, i + skema.virksomhedsoplysninger.length))}</tbody>
            </table>
          </div>
        </>
      ) : selskab && aarsrapport ? (
        <>
          <div className="border border-border/50 rounded overflow-hidden">
            <div className="p-3 bg-accent/20 border-b border-border/20 text-xs font-semibold">Skattepligtig indkomst</div>
            <table className="w-full text-sm">
              <tbody>
                {[
                  { label: "Resultat før skat", amount: selskab.resultat_foer_skat },
                  ...selskab.korrektioner.map((k) => ({ label: `+ ${k.label}`, amount: k.amount })),
                  { label: "Skattepligtig indkomst før underskud", amount: selskab.skattepligtig_indkomst_foer_underskud },
                  ...(selskab.anvendt_underskud > 0 ? [{ label: "− Anvendt fremført underskud", amount: -selskab.anvendt_underskud }] : []),
                  { label: "Skattepligtig indkomst", amount: selskab.skattepligtig_indkomst },
                  { label: "Selskabsskat (22%)", amount: selskab.selskabsskat },
                  { label: "Restskat efter aconto", amount: selskab.restskat },
                ].map((row, i) => (
                  <tr key={i} className="border-b border-border/20">
                    <td className="p-3">{row.label}</td>
                    <td className={`p-3 text-right font-mono text-sm ${row.amount >= 0 ? "" : "text-destructive"}`}>{formatAmount(row.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border border-border/50 rounded overflow-hidden">
            <div className="p-3 bg-accent/20 border-b border-border/20 text-xs font-semibold">Årsrapport (klasse B) — resultatopgørelse</div>
            <table className="w-full text-sm">
              <tbody>
                {aarsrapport.resultatopgoerelse.map((row, i) => (
                  <tr key={i} className="border-b border-border/20">
                    <td className="p-3">{row.label}</td>
                    <td className="p-3 text-right font-mono text-sm">{formatAmount(row.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {aarsrapport.checks.map((c, i) => (
            <div key={i} className={`flex items-start gap-2 border rounded p-3 text-xs ${c.ok ? "border-primary/30 bg-primary/5" : "border-destructive/30 bg-destructive/5"}`}>
              {c.ok ? <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" /> : <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />}
              <span>{c.label}</span>
            </div>
          ))}
        </>
      ) : null}

      {entries.length > 0 && warnings.length > 0 && (
        <div className="space-y-2">
          {warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 border border-warning/30 bg-warning/5 rounded p-3 text-xs">
              <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
