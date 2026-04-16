import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronRight } from "lucide-react";
import { formatAmountShort } from "@/lib/demo-data";

interface Account {
  number: number;
  name: string;
  type: string;
  rubrik?: string;
  balance: number;
}

const accountGroups: { range: string; label: string; accounts: Account[] }[] = [
  {
    range: "1000–1999", label: "Indtægter",
    accounts: [
      { number: 1000, name: "Nettoomsætning", type: "Indtægt", rubrik: "Rubrik 320", balance: 411397 },
      { number: 1100, name: "Øvrige indtægter", type: "Indtægt", rubrik: "Rubrik 323", balance: 0 },
    ],
  },
  {
    range: "2000–2999", label: "Vareforbrug og fremmed arbejde",
    accounts: [
      { number: 2000, name: "Vareforbrug", type: "Udgift", rubrik: "Rubrik 321", balance: 32728 },
      { number: 2100, name: "Fremmed arbejde", type: "Udgift", rubrik: "Rubrik 322", balance: 207382 },
    ],
  },
  {
    range: "3000–3999", label: "Driftsudgifter",
    accounts: [
      { number: 3610, name: "Lokaleomkostninger", type: "Udgift", rubrik: "Rubrik 324", balance: 0 },
      { number: 3615, name: "Småanskaffelser", type: "Udgift", rubrik: "Rubrik 324", balance: 12847 },
      { number: 3620, name: "Kontorartikler", type: "Udgift", rubrik: "Rubrik 324", balance: 4362 },
      { number: 3630, name: "Software og IT", type: "Udgift", rubrik: "Rubrik 324", balance: 8940 },
      { number: 3650, name: "Telefon og internet", type: "Udgift", rubrik: "Rubrik 324", balance: 2388 },
      { number: 3670, name: "Repræsentation", type: "Udgift", rubrik: "Rubrik 324", balance: 1485 },
      { number: 3680, name: "Rejseudgifter", type: "Udgift", rubrik: "Rubrik 324", balance: 5820 },
      { number: 3690, name: "Forsikringer", type: "Udgift", rubrik: "Rubrik 324", balance: 3600 },
    ],
  },
  {
    range: "4000–4999", label: "Personaleudgifter",
    accounts: [
      { number: 4000, name: "Lønninger", type: "Udgift", balance: 0 },
      { number: 4100, name: "ATP og pension", type: "Udgift", balance: 0 },
    ],
  },
  {
    range: "5000–5999", label: "Afskrivninger",
    accounts: [
      { number: 5000, name: "Afskrivninger, driftsmidler", type: "Udgift", rubrik: "Rubrik 326", balance: 0 },
    ],
  },
  {
    range: "6000–6999", label: "Finansielle poster",
    accounts: [
      { number: 6000, name: "Renteindtægter", type: "Indtægt", balance: 245 },
      { number: 6100, name: "Renteudgifter", type: "Udgift", balance: 0 },
    ],
  },
  {
    range: "7000–7999", label: "Aktiver",
    accounts: [
      { number: 7000, name: "Driftsmidler og inventar", type: "Aktiv", balance: 0 },
      { number: 7100, name: "Tilgodehavender", type: "Aktiv", balance: 45000 },
      { number: 7200, name: "Bankkonto", type: "Aktiv", rubrik: "Rubrik 332", balance: 127423 },
    ],
  },
  {
    range: "8000–8999", label: "Passiver",
    accounts: [
      { number: 8000, name: "Egenkapital", type: "Passiv", rubrik: "Rubrik 331", balance: 21106 },
      { number: 8100, name: "Skyldig moms", type: "Passiv", rubrik: "Rubrik 638", balance: -1257 },
      { number: 8200, name: "Skyldig A-skat", type: "Passiv", balance: 0 },
      { number: 8300, name: "Anden gæld", type: "Passiv", balance: 0 },
    ],
  },
];

export default function Kontoplan() {
  const [openGroups, setOpenGroups] = useState<string[]>(accountGroups.map((g) => g.range));

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
              <th className="text-left p-3 font-medium w-20">Type</th>
              <th className="text-left p-3 font-medium w-28">SKAT-rubrik</th>
              <th className="text-right p-3 font-medium w-32">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {accountGroups.map((group) => {
              const isOpen = openGroups.includes(group.range);
              return (
                <motion.tr key={group.range} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="contents">
                  <td colSpan={5} className="p-0">
                    <div
                      onClick={() => toggle(group.range)}
                      className="flex items-center gap-2 p-3 bg-accent/20 border-b border-border/20 cursor-pointer hover:bg-accent/40 transition-colors"
                    >
                      {isOpen ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                      <span className="font-mono text-xs text-muted-foreground">{group.range}</span>
                      <span className="text-xs font-semibold">{group.label}</span>
                    </div>
                    {isOpen && group.accounts.map((acc) => (
                      <div key={acc.number} className="flex items-center border-b border-border/10 hover:bg-accent/10 transition-colors">
                        <div className="p-3 w-24 font-mono text-xs text-muted-foreground pl-9">{acc.number}</div>
                        <div className="p-3 flex-1">{acc.name}</div>
                        <div className="p-3 w-20 text-xs text-muted-foreground">{acc.type}</div>
                        <div className="p-3 w-28 text-xs font-mono text-muted-foreground">{acc.rubrik || "—"}</div>
                        <div className={`p-3 w-32 text-right font-mono text-sm ${acc.balance > 0 ? "text-primary" : acc.balance < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                          {acc.balance !== 0 ? formatAmountShort(acc.balance) : "—"}
                        </div>
                      </div>
                    ))}
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
