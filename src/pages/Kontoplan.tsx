import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronRight, Plus, Loader2 } from "lucide-react";
import { formatAmountShort } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const kindOptions: { value: string; label: string; taxLine: string }[] = [
  { value: "revenue", label: "Indtægt", taxLine: "nettoomsaetning" },
  { value: "expense", label: "Udgift", taxLine: "andre_driftsomkostninger" },
  { value: "asset", label: "Aktiv", taxLine: "omsaetningsaktiver" },
  { value: "liability", label: "Passiv / gæld", taxLine: "anden_gaeld" },
  { value: "equity", label: "Egenkapital", taxLine: "egenkapital" },
];

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
  const { toast } = useToast();
  const [openGroups, setOpenGroups] = useState<string[]>(groupDefs.map((g) => g.range));
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [loaded, setLoaded] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nNumber, setNNumber] = useState("");
  const [nName, setNName] = useState("");
  const [nKind, setNKind] = useState("expense");
  const [nVat, setNVat] = useState("I25");

  const loadAccounts = useCallback(async () => {
    if (!company) return;
    const { data } = await supabase
      .from("accounts").select("id, number, name, kind, vat_code, tax_line")
      .eq("company_id", company.id).order("number");
    if (data) setAccounts(data as AccountRow[]);
    setLoaded(true);
  }, [company]);

  const addAccount = async () => {
    if (!company) return;
    const num = parseInt(nNumber, 10);
    if (!num || num < 1000 || num > 6999) {
      toast({ title: "Ugyldigt kontonummer", description: "Vælg et nummer mellem 1000 og 6999.", variant: "destructive" });
      return;
    }
    if (!nName.trim()) { toast({ title: "Kontonavn mangler", variant: "destructive" }); return; }
    if (accounts.some((a) => a.number === num)) {
      toast({ title: "Kontonummer findes allerede", variant: "destructive" });
      return;
    }
    setSaving(true);
    const taxLine = kindOptions.find((k) => k.value === nKind)?.taxLine ?? null;
    const { error } = await supabase.from("accounts").insert({
      company_id: company.id, number: num, name: nName.trim(), kind: nKind, vat_code: nVat, tax_line: taxLine,
    });
    setSaving(false);
    if (error) { toast({ title: "Kunne ikke oprette konto", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Konto oprettet", description: `${num} ${nName.trim()}` });
    setNNumber(""); setNName(""); setShowAdd(false);
    loadAccounts();
  };

  useEffect(() => {
    if (!company) return;
    loadAccounts();

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
      <div className="flex items-center justify-between">
        <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-lg font-semibold">
          Kontoplan
        </motion.h1>
        <Button size="sm" className="text-xs gap-1.5" onClick={() => setShowAdd(true)} disabled={!company}>
          <Plus className="h-3 w-3" /> Ny konto
        </Button>
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle className="text-base">Ny konto</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Kontonummer (1000–6999)</Label><Input value={nNumber} onChange={(e) => setNNumber(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="fx 3625" className="h-8 text-sm font-mono" /></div>
              <div>
                <Label className="text-xs">Type</Label>
                <Select value={nKind} onValueChange={setNKind}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{kindOptions.map((k) => <SelectItem key={k.value} value={k.value} className="text-sm">{k.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label className="text-xs">Kontonavn</Label><Input value={nName} onChange={(e) => setNName(e.target.value)} className="h-8 text-sm" /></div>
            <div>
              <Label className="text-xs">Momskode</Label>
              <Select value={nVat} onValueChange={setNVat}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(vatCodeLabels).map(([code, label]) => <SelectItem key={code} value={code} className="text-sm">{code} — {label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setShowAdd(false)}>Annuller</Button>
            <Button size="sm" onClick={addAccount} disabled={saving} className="gap-1.5">
              {saving && <Loader2 className="h-3 w-3 animate-spin" />}Opret konto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
