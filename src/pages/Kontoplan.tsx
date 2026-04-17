import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronRight } from "lucide-react";
import { formatAmountShort } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";

interface Account {
  number: number;
  name: string;
  rubrik: string;
  balance: number;
}

// Standard Danish chart of accounts (kontoplan structure only — no fake balances)
const accountGroups: { range: string; label: string; accounts: Omit<Account, "balance">[] }[] = [
  {
    range: "1000–1999", label: "Indtægter",
    accounts: [
      { number: 1000, name: "Nettoomsætning", rubrik: "Rubrik 320" },
      { number: 1010, name: "Salg af varer", rubrik: "Rubrik 320" },
      { number: 1020, name: "Salg af konsulentydelser", rubrik: "Rubrik 320" },
      { number: 1100, name: "Øvrige indtægter", rubrik: "Rubrik 323" },
    ],
  },
  {
    range: "2000–2999", label: "Vareforbrug og fremmed arbejde",
    accounts: [
      { number: 2000, name: "Vareforbrug", rubrik: "Rubrik 321" },
      { number: 2100, name: "Fremmed arbejde / underleverandører", rubrik: "Rubrik 322" },
    ],
  },
  {
    range: "3000–3999", label: "Driftsomkostninger",
    accounts: [
      { number: 3600, name: "Husleje", rubrik: "Rubrik 323" },
      { number: 3610, name: "El, vand, varme", rubrik: "Rubrik 323" },
      { number: 3615, name: "Småanskaffelser", rubrik: "Rubrik 323" },
      { number: 3620, name: "Kontorartikler", rubrik: "Rubrik 323" },
      { number: 3630, name: "Software / abonnementer", rubrik: "Rubrik 323" },
      { number: 3640, name: "Telefon", rubrik: "Rubrik 323" },
      { number: 3650, name: "Internet", rubrik: "Rubrik 323" },
      { number: 3660, name: "Forsikringer", rubrik: "Rubrik 323" },
      { number: 3670, name: "Repræsentation", rubrik: "Rubrik 323" },
      { number: 3680, name: "Rejseudgifter", rubrik: "Rubrik 323" },
      { number: 3690, name: "Markedsføring", rubrik: "Rubrik 323" },
      { number: 3700, name: "Revisor / advokat", rubrik: "Rubrik 303" },
      { number: 3800, name: "Bankgebyrer", rubrik: "Rubrik 323" },
    ],
  },
  {
    range: "4000–4999", label: "Personaleomkostninger",
    accounts: [],
  },
  {
    range: "5000–5999", label: "Aktiver",
    accounts: [
      { number: 5000, name: "Bankkonto", rubrik: "Rubrik 332" },
      { number: 5100, name: "Tilgodehavender fra kunder", rubrik: "Rubrik 332" },
      { number: 5200, name: "Andre tilgodehavender", rubrik: "Rubrik 332" },
    ],
  },
  {
    range: "6000–6999", label: "Passiver / Egenkapital",
    accounts: [
      { number: 6000, name: "Egenkapital", rubrik: "Rubrik 331" },
      { number: 6100, name: "Skyldige omkostninger", rubrik: "Rubrik 332" },
      { number: 6200, name: "Skyldig moms", rubrik: "Rubrik 638" },
    ],
  },
];

export default function Kontoplan() {
  const { company } = useCompany();
  const [openGroups, setOpenGroups] = useState<string[]>(accountGroups.map((g) => g.range));
  const [balances, setBalances] = useState<Record<number, number>>({});

  useEffect(() => {
    if (!company) return;
    supabase
      .from("journal_entries")
      .select("account_number, amount")
      .eq("company_id", company.id)
      .then(({ data }) => {
        if (!data) return;
        const map: Record<number, number> = {};
        for (const row of data) {
          if (row.account_number == null) continue;
          map[row.account_number] = (map[row.account_number] || 0) + Number(row.amount);
        }
        setBalances(map);
      });
  }, [company]);

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

      <div className="border border-border/50 rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/30 text-xs text-muted-foreground">
              <th className="text-left p-3 font-medium w-24">Konto</th>
              <th className="text-left p-3 font-medium">Kontonavn</th>
              <th className="text-left p-3 font-medium w-28">SKAT-rubrik</th>
              <th className="text-right p-3 font-medium w-32">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {accountGroups.map((group) => {
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
                      {group.accounts.length === 0 && (
                        <span className="text-[10px] text-muted-foreground ml-2">(ingen konti)</span>
                      )}
                    </div>
                    {isOpen && group.accounts.map((acc) => {
                      const balance = balances[acc.number] || 0;
                      return (
                        <div key={acc.number} className="flex items-center border-b border-border/10 hover:bg-accent/10 transition-colors">
                          <div className="p-3 w-24 font-mono text-xs text-muted-foreground pl-9">{acc.number}</div>
                          <div className="p-3 flex-1">{acc.name}</div>
                          <div className="p-3 w-28 text-xs font-mono text-muted-foreground">{acc.rubrik}</div>
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
    </div>
  );
}
