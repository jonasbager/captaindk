import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronRight } from "lucide-react";
import { formatAmountShort } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";

interface AccountRow {
  id: string;
  number: number;
  name: string;
  kind: string;
  vat_code: string;
  tax_line: string | null;
}

// Display labels for VAT codes (semantics live in the engine)
const vatCodeLabels: Record<string, string> = {
  U25: "Salgsmoms 25%",
  UEUV: "EU-salg varer",
  UEUY: "EU-salg ydelser",
  UEKS: "Eksport uden for EU",
  I25: "Købsmoms 25%",
  IEUV: "EU-varekøb",
  IEUY: "EU-ydelseskøb",
  IVKU: "Import uden for EU",
  REP: "Repræsentation",
  NONE: "Momsfri",
};

const groupDefs: { range: string; label: string; from: number; to: number }[] = [
  { range: "1000–1999", label: "Indtægter", from: 1000, to: 1999 },
  { range: "2000–2999", label: "Vareforbrug og fremmed arbejde", from: 2000, to: 2999 },
  { range: "3000–3999", label: "Driftsomkostninger", from: 3000, to: 3999 },
  { range: "4000–4999", label: "Finansielle poster", from: 4000, to: 4999 },
  { range: "5000–5999", label: "Aktiver", from: 5000, to: 5999 },
  { range: "6000–6999", label: "Passiver / Egenkapital", from: 6000, to: 6999 },
];

export default function Kontoplan() {
  const { company } = useCompany();
  const [openGroups, setOpenGroups] = useState<string[]>(groupDefs.map((g) => g.range));
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!company) return;

    supabase
      .from("accounts")
      .select("id, number, name, kind, vat_code, tax_line")
      .eq("company_id", company.id)
      .order("number")
      .then(({ data }) => {
        if (data) setAccounts(data as AccountRow[]);
        setLoaded(true);
      });

    supabase
      .from("journal_entries")
      .select("account_id, account_number, amount")
      .eq("company_id", company.id)
      .then(({ data }) => {
        if (!data) return;
        const map: Record<string, number> = {};
        for (const row of data) {
          const key = row.account_id ?? `nr-${row.account_number}`;
          if (row.account_id == null && row.account_number == null) continue;
          map[key] = (map[key] || 0) + Number(row.amount);
        }
        setBalances(map);
      });
  }, [company]);

  const balanceFor = (acc: AccountRow) =>
    (balances[acc.id] || 0) + (balances[`nr-${acc.number}`] || 0);

  const toggle = (range: string) => {
    setOpenGroups((prev) =>
      prev.includes(range) ? prev.filter((r) => r !== range) : [...prev, range]
    );
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-lg font-semibold">
        Kontoplan
      </motion.h1>

      {loaded && accounts.length === 0 && (
        <div className="border border-border/50 rounded bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">Ingen kontoplan endnu</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Standardkontoplanen oprettes automatisk når din virksomhed er sat op.
          </p>
        </div>
      )}

      {accounts.length > 0 && (
        <div className="border border-border/50 rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30 text-xs text-muted-foreground">
                <th className="text-left p-3 font-medium w-24">Konto</th>
                <th className="text-left p-3 font-medium">Kontonavn</th>
                <th className="text-left p-3 font-medium w-36">Moms</th>
                <th className="text-right p-3 font-medium w-32">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {groupDefs.map((group) => {
                const groupAccounts = accounts.filter((a) => a.number >= group.from && a.number <= group.to);
                const isOpen = openGroups.includes(group.range);
                return (
                  <tr key={group.range} className="contents">
                    <td colSpan={4} className="p-0">
                      <div
                        onClick={() => toggle(group.range)}
                        className="flex items-center gap-2 p-3 bg-accent/20 border-b border-border/20 cursor-pointer hover:bg-accent/40 transition-colors"
                      >
                        {isOpen ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                        <span className="font-mono text-xs text-muted-foreground">{group.range}</span>
                        <span className="text-xs font-semibold">{group.label}</span>
                        {groupAccounts.length === 0 && (
                          <span className="text-[10px] text-muted-foreground ml-2">(ingen konti)</span>
                        )}
                      </div>
                      {isOpen && groupAccounts.map((acc) => {
                        const balance = balanceFor(acc);
                        return (
                          <div key={acc.id} className="flex items-center border-b border-border/10 hover:bg-accent/10 transition-colors">
                            <div className="p-3 w-24 font-mono text-xs text-muted-foreground pl-9">{acc.number}</div>
                            <div className="p-3 flex-1">{acc.name}</div>
                            <div className="p-3 w-36 text-xs font-mono text-muted-foreground">
                              {vatCodeLabels[acc.vat_code] || acc.vat_code}
                            </div>
                            <div className={`p-3 w-32 text-right font-mono text-sm ${balance > 0 ? "text-primary" : balance < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                              {balance !== 0 ? formatAmountShort(balance) : "—"}
                            </div>
                          </div>
                        );
                      })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
