import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Inbox, ChevronDown, ChevronUp, AlertTriangle, Loader2 } from "lucide-react";
import { formatAmount } from "@/lib/format";
import { computeMoms } from "@/lib/skat/engine";
import { useEngineEntries, type EntryWithMeta } from "@/hooks/useEngineEntries";

interface Period {
  key: string;
  label: string;
  from: string;
  to: string;
}

function buildPeriods(vatPeriod: string): Period[] {
  const now = new Date();
  const year = now.getFullYear();
  const periods: Period[] = [];
  for (const y of [year, year - 1]) {
    if (vatPeriod === "maanedlig") {
      for (let m = 11; m >= 0; m--) {
        const from = new Date(Date.UTC(y, m, 1));
        const to = new Date(Date.UTC(y, m + 1, 0));
        if (from > now) continue;
        periods.push({
          key: `${y}-M${m + 1}`,
          label: from.toLocaleDateString("da-DK", { month: "long", year: "numeric" }),
          from: from.toISOString().slice(0, 10),
          to: to.toISOString().slice(0, 10),
        });
      }
    } else if (vatPeriod === "kvartalsvis") {
      for (let q = 3; q >= 0; q--) {
        const from = new Date(Date.UTC(y, q * 3, 1));
        const to = new Date(Date.UTC(y, q * 3 + 3, 0));
        if (from > now) continue;
        periods.push({ key: `${y}-Q${q + 1}`, label: `Q${q + 1} ${y}`, from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) });
      }
    } else {
      for (const [h, fromM, toM] of [[2, 6, 11], [1, 0, 5]] as const) {
        const from = new Date(Date.UTC(y, fromM, 1));
        const to = new Date(Date.UTC(y, toM + 1, 0));
        if (from > now) continue;
        periods.push({ key: `${y}-H${h}`, label: `H${h} ${y}`, from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) });
      }
    }
  }
  return periods;
}

// Which entries back each field on the momsangivelse — mirrors the engine's semantics
const fieldFilters: Record<string, (e: EntryWithMeta) => boolean> = {
  salgsmoms: (e) => e.vat_code === "U25",
  moms_varekoeb_udland: (e) => e.vat_code === "IEUV" || e.vat_code === "IVKU",
  moms_ydelseskoeb_udland: (e) => e.vat_code === "IEUY",
  koebsmoms: (e) => ["I25", "REP", "IEUV", "IEUY", "IVKU"].includes(e.vat_code),
  rubrik_a_varer: (e) => e.vat_code === "IEUV",
  rubrik_a_ydelser: (e) => e.vat_code === "IEUY",
  rubrik_b_varer: (e) => e.vat_code === "UEUV",
  rubrik_b_ydelser: (e) => e.vat_code === "UEUY",
  rubrik_c: (e) => e.vat_code === "UEKS",
};

const fieldLabels: { key: string; label: string }[] = [
  { key: "salgsmoms", label: "Salgsmoms (udgående moms)" },
  { key: "moms_varekoeb_udland", label: "Moms af varekøb i udlandet" },
  { key: "moms_ydelseskoeb_udland", label: "Moms af ydelseskøb i udlandet" },
  { key: "koebsmoms", label: "Købsmoms (indgående moms)" },
  { key: "elafgift", label: "Elafgift" },
  { key: "rubrik_a_varer", label: "Rubrik A — varer (EU-køb)" },
  { key: "rubrik_a_ydelser", label: "Rubrik A — ydelser (EU-køb)" },
  { key: "rubrik_b_varer", label: "Rubrik B — varer (EU-salg)" },
  { key: "rubrik_b_ydelser", label: "Rubrik B — ydelser (EU-salg)" },
  { key: "rubrik_c", label: "Rubrik C (eksport uden for EU)" },
];

export default function Moms() {
  const { entries, loading, company } = useEngineEntries();
  const periods = useMemo(() => buildPeriods(company?.vat_period || "halvaarlig"), [company?.vat_period]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const period = periods.find((p) => p.key === selectedKey) || periods[0];
  const moms = useMemo(
    () => (period ? computeMoms(entries, period.from, period.to) : null),
    [entries, period]
  );

  const inPeriod = (e: EntryWithMeta) => period && e.date >= period.from && e.date <= period.to;

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto flex items-center justify-center py-24">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-lg font-semibold">Moms</h1>
        <div className="flex gap-1.5 flex-wrap">
          {periods.slice(0, 6).map((p) => (
            <button
              key={p.key}
              onClick={() => setSelectedKey(p.key)}
              className={`px-2.5 py-1 rounded text-xs font-mono border transition-colors ${
                p.key === period?.key
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-border/40 text-muted-foreground hover:border-border/70"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </motion.div>

      {entries.length === 0 ? (
        <div className="border border-border/50 rounded bg-card flex flex-col items-center justify-center py-16 text-center">
          <Inbox className="h-8 w-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">Ingen momsperioder endnu</p>
          <p className="text-xs text-muted-foreground/60 mt-1 max-w-sm">
            Momsangivelsen beregnes automatisk når du har bogført salg og køb med moms.
          </p>
        </div>
      ) : moms && period ? (
        <>
          {/* Momstilsvar headline */}
          <div className="border border-border/50 rounded bg-card p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Momstilsvar for {period.label}</p>
              <p className={`text-2xl font-mono font-semibold mt-1 ${moms.momstilsvar >= 0 ? "" : "text-primary"}`}>
                {formatAmount(moms.momstilsvar)}
              </p>
            </div>
            <p className="text-xs text-muted-foreground max-w-[200px] text-right">
              {moms.momstilsvar >= 0 ? "Skal betales til SKAT" : "Tilgodehavende fra SKAT"}
            </p>
          </div>

          {/* Field-by-field with drill-down */}
          <div className="border border-border/50 rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30 text-xs text-muted-foreground">
                  <th className="text-left p-3 font-medium">Felt</th>
                  <th className="text-right p-3 font-medium w-36">Beløb</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {fieldLabels.map(({ key, label }) => {
                  const amount = (moms as any)[key] as number;
                  const filter = fieldFilters[key];
                  const backing = filter ? entries.filter((e) => inPeriod(e) && filter(e)) : [];
                  const canExpand = backing.length > 0;
                  const isOpen = expanded === key;
                  return (
                    <tr key={key} className="contents">
                      <td colSpan={3} className="p-0">
                        <div
                          className={`flex items-center p-3 border-b border-border/20 transition-colors ${canExpand ? "cursor-pointer hover:bg-accent/20" : ""}`}
                          onClick={() => canExpand && setExpanded(isOpen ? null : key)}
                        >
                          <span className="flex-1">{label}</span>
                          <span className={`font-mono text-sm w-36 text-right ${amount !== 0 ? "" : "text-muted-foreground"}`}>
                            {formatAmount(amount)}
                          </span>
                          <span className="w-10 flex justify-center">
                            {canExpand && (isOpen ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />)}
                          </span>
                        </div>
                        {isOpen && (
                          <div className="bg-background/50 border-b border-border/20">
                            {backing.map((e) => (
                              <div key={e.id} className="flex items-center px-3 py-2 text-xs border-b border-border/10 last:border-b-0">
                                <span className="font-mono text-muted-foreground w-24">{e.date}</span>
                                <span className="flex-1 truncate">{e.description}</span>
                                <span className="font-mono text-muted-foreground w-32 text-right">netto {formatAmount(e.net_amount)}</span>
                                <span className="font-mono w-32 text-right">moms {formatAmount(e.vat_amount)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {moms.warnings.length > 0 && (
            <div className="space-y-2">
              {moms.warnings.map((w, i) => (
                <div key={i} className="flex items-start gap-2 border border-warning/30 bg-warning/5 rounded p-3 text-xs">
                  <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" />
                  <span>{w}</span>
                </div>
              ))}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
