import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronRight } from "lucide-react";
import { formatAmountShort, formatAmount } from "@/lib/format";

interface RecentPosting {
  date: string;
  description: string;
  amount: number;
}

interface Account {
  number: number;
  name: string;
  rubrik: string;
  balance: number;
  recentPostings?: RecentPosting[];
}

const accountGroups: { range: string; label: string; accounts: Account[] }[] = [
  {
    range: "1000–1999", label: "Indtægter",
    accounts: [
      { number: 1000, name: "Nettoomsætning", rubrik: "Rubrik 320", balance: 411397, recentPostings: [
        { date: "2026-04-12", description: "Faktura #2026-047 — Designprojekt", amount: 28500 },
        { date: "2026-04-07", description: "Faktura #2026-046 — Konsulenthonorar", amount: 45000 },
        { date: "2026-03-25", description: "Faktura #2026-045 — Rådgivning", amount: 32000 },
      ]},
      { number: 1010, name: "Salg af varer", rubrik: "Rubrik 320", balance: 0 },
      { number: 1020, name: "Salg af konsulentydelser", rubrik: "Rubrik 320", balance: 0 },
      { number: 1100, name: "Øvrige indtægter", rubrik: "Rubrik 323", balance: 0 },
    ],
  },
  {
    range: "2000–2999", label: "Vareforbrug og fremmed arbejde",
    accounts: [
      { number: 2000, name: "Vareforbrug", rubrik: "Rubrik 321", balance: 32728, recentPostings: [
        { date: "2026-03-15", description: "Materialer til projekt", amount: -8200 },
      ]},
      { number: 2100, name: "Fremmed arbejde / underleverandører", rubrik: "Rubrik 322", balance: 207382, recentPostings: [
        { date: "2026-04-01", description: "Freelancer — backend-udvikling", amount: -25000 },
        { date: "2026-03-01", description: "Underleverandør — grafisk design", amount: -18000 },
      ]},
    ],
  },
  {
    range: "3000–3999", label: "Driftsomkostninger",
    accounts: [
      { number: 3600, name: "Husleje", rubrik: "Rubrik 323", balance: 0 },
      { number: 3610, name: "El, vand, varme", rubrik: "Rubrik 323", balance: 0 },
      { number: 3615, name: "Småanskaffelser", rubrik: "Rubrik 323", balance: 12847, recentPostings: [
        { date: "2026-04-15", description: "Elgiganten — Skærm", amount: -3499 },
        { date: "2026-04-03", description: "Amazon — USB-hub", amount: -799 },
        { date: "2026-04-01", description: "IKEA — Reol til kontor", amount: -3450 },
      ]},
      { number: 3620, name: "Kontorartikler", rubrik: "Rubrik 323", balance: 4362, recentPostings: [
        { date: "2026-04-09", description: "Kontorland — Kontorartikler", amount: -1287 },
      ]},
      { number: 3630, name: "Software / abonnementer", rubrik: "Rubrik 323", balance: 8940, recentPostings: [
        { date: "2026-04-14", description: "Adobe Creative Cloud", amount: -449 },
        { date: "2026-03-10", description: "GitHub — Pro plan", amount: -73 },
      ]},
      { number: 3640, name: "Telefon", rubrik: "Rubrik 323", balance: 1194 },
      { number: 3650, name: "Internet", rubrik: "Rubrik 323", balance: 1194, recentPostings: [
        { date: "2026-03-20", description: "Telia — Mobilabonnement", amount: -199 },
      ]},
      { number: 3660, name: "Forsikringer", rubrik: "Rubrik 323", balance: 3600 },
      { number: 3670, name: "Repræsentation", rubrik: "Rubrik 323", balance: 1485, recentPostings: [
        { date: "2026-04-05", description: "Mobilepay — Frokost kundemøde", amount: -385 },
      ]},
      { number: 3680, name: "Rejseudgifter", rubrik: "Rubrik 323", balance: 5820, recentPostings: [
        { date: "2026-04-10", description: "DSB — Transport", amount: -342 },
      ]},
      { number: 3690, name: "Markedsføring", rubrik: "Rubrik 323", balance: 0 },
      { number: 3700, name: "Revisor / advokat", rubrik: "Rubrik 303", balance: 8500 },
      { number: 3800, name: "Bankgebyrer", rubrik: "Rubrik 323", balance: 500 },
    ],
  },
  {
    range: "4000–4999", label: "Personaleomkostninger",
    accounts: [],
  },
  {
    range: "5000–5999", label: "Aktiver",
    accounts: [
      { number: 5000, name: "Bankkonto", rubrik: "Rubrik 332", balance: 127423 },
      { number: 5100, name: "Tilgodehavender fra kunder", rubrik: "Rubrik 332", balance: 45000 },
      { number: 5200, name: "Andre tilgodehavender", rubrik: "Rubrik 332", balance: 0 },
    ],
  },
  {
    range: "6000–6999", label: "Passiver / Egenkapital",
    accounts: [
      { number: 6000, name: "Egenkapital", rubrik: "Rubrik 331", balance: 21106 },
      { number: 6100, name: "Skyldige omkostninger", rubrik: "Rubrik 332", balance: 0 },
      { number: 6200, name: "Skyldig moms", rubrik: "Rubrik 638", balance: -1257 },
    ],
  },
];

export default function Kontoplan() {
  const [openGroups, setOpenGroups] = useState<string[]>(accountGroups.map((g) => g.range));
  const [expandedAccount, setExpandedAccount] = useState<number | null>(null);

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
                    {isOpen && group.accounts.map((acc) => (
                      <div key={acc.number}>
                        <div
                          className="flex items-center border-b border-border/10 hover:bg-accent/10 transition-colors cursor-pointer"
                          onClick={() => setExpandedAccount(expandedAccount === acc.number ? null : acc.number)}
                        >
                          <div className="p-3 w-24 font-mono text-xs text-muted-foreground pl-9">{acc.number}</div>
                          <div className="p-3 flex-1 flex items-center gap-2">
                            {acc.name}
                            {acc.recentPostings && acc.recentPostings.length > 0 && (
                              expandedAccount === acc.number
                                ? <ChevronDown className="h-3 w-3 text-muted-foreground" />
                                : <ChevronRight className="h-3 w-3 text-muted-foreground" />
                            )}
                          </div>
                          <div className="p-3 w-28 text-xs font-mono text-muted-foreground">{acc.rubrik}</div>
                          <div className={`p-3 w-32 text-right font-mono text-sm ${acc.balance > 0 ? "text-primary" : acc.balance < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                            {acc.balance !== 0 ? formatAmountShort(acc.balance) : "—"}
                          </div>
                        </div>
                        <AnimatePresence>
                          {expandedAccount === acc.number && acc.recentPostings && acc.recentPostings.length > 0 && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.15 }}
                              className="overflow-hidden"
                            >
                              <div className="pl-12 pr-3 pb-3 space-y-1">
                                {acc.recentPostings.map((p, j) => (
                                  <div key={j} className="flex items-center text-xs text-muted-foreground py-1 border-b border-border/5">
                                    <span className="font-mono w-24">{p.date}</span>
                                    <span className="flex-1">{p.description}</span>
                                    <span className={`font-mono ${p.amount >= 0 ? "text-primary" : ""}`}>
                                      {formatAmount(p.amount)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
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
