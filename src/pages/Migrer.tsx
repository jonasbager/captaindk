import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, ChevronRight, Loader2, Users, Package, FileText, Scale, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CsvMapper, type ColumnSpec } from "@/components/CsvMapper";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { useToast } from "@/hooks/use-toast";
import { parseLocalizedAmount, parseDate } from "@/lib/csv";
import { formatAmount } from "@/lib/format";

type AccountRow = { id: string; number: number; name: string };

const STEPS = [
  { id: 1, label: "Kunder", icon: Users },
  { id: 2, label: "Produkter", icon: Package },
  { id: 3, label: "Åbne fakturaer", icon: FileText },
  { id: 4, label: "Saldobalance", icon: Scale },
];

const customerCols: ColumnSpec[] = [
  { key: "name", label: "Navn", required: true, matcher: /navn|name|kunde|client|company/i },
  { key: "cvr", label: "CVR", matcher: /cvr|vat|se-?nr/i },
  { key: "email", label: "Email", matcher: /mail|email/i },
  { key: "address", label: "Adresse", matcher: /adresse|address|gade|street/i },
  { key: "terms", label: "Betalingsfrist (dage)", matcher: /betalingsfrist|frist|dage|terms/i },
];
const productCols: ColumnSpec[] = [
  { key: "name", label: "Navn", required: true, matcher: /produktnavn|varenavn|navn|name|titel|ydelse/i },
  { key: "description", label: "Beskrivelse", matcher: /kommentar|beskriv|description|tekst|note/i },
  { key: "price", label: "Pris (ekskl. moms)", matcher: /pris|price|beløb|amount/i },
  { key: "vat", label: "Momssats", matcher: /momssats|momsprocent|moms%|vat.?rate|vatsats/i },
  { key: "unit", label: "Enhed", matcher: /enhed|unit/i },
];
const invoiceCols: ColumnSpec[] = [
  { key: "number", label: "Fakturanr.", matcher: /nummer|number|faktura|invoice|nr/i },
  { key: "customer", label: "Kunde", required: true, matcher: /kunde|customer|kontakt|navn|client/i },
  { key: "date", label: "Dato", matcher: /dato|date|udstedt|issued/i },
  { key: "due", label: "Forfaldsdato", matcher: /forfald|due|betalingsfrist/i },
  { key: "total", label: "Beløb (inkl. moms)", matcher: /beløb|total|amount|sum|inkl/i },
];
const balanceCols: ColumnSpec[] = [
  { key: "account", label: "Kontonr.", required: true, matcher: /^konto$|kontonr|kontonummer|account|^nr$|number/i },
  { key: "name", label: "Kontonavn", matcher: /kontonavn|navn|name|tekst|beskriv/i },
  { key: "balance", label: "Saldo", required: true, matcher: /saldo|balance|beløb|amount|primo|ultimo/i },
];

// Foreslå Captain-konto fra en Dinero/Billy-saldobalancelinje. Dineros kontonumre
// (5-cifrede) matcher sjældent Captains 4-cifrede kontoplan, så vi matcher på
// kontonavnet for de almindelige balance-/drifts-konti og falder tilbage på
// eksakt nummermatch.
function suggestCaptainAccount(sourceNum: number, sourceName: string, accounts: AccountRow[]): string | undefined {
  const byNum = (n: number) => accounts.find((a) => a.number === n)?.id;
  const exact = accounts.find((a) => a.number === sourceNum);
  const n = sourceName.toLowerCase();
  // Rækkefølge betyder noget: specifikke momskonti før det brede "salg/ydelser",
  // så "Salg af varer/ydelser m/moms" og "...uden moms" ikke fejlagtigt rammer moms.
  const kw: [RegExp, number][] = [
    [/debitor/, 5100],
    [/kreditor/, 6100],
    [/bank|pleo|sparekasse|lsb|likvid|kasse/, 5000],
    [/egenkapital/, 6000],
    [/salgsmoms|købsmoms|momsafregning|moms.?afregn|udgående moms|indgående moms/, 6200],
    [/eu-leverancer|eu-salg|rubrik b/, 1030],
    [/salg|omsætning|ydelser/, 1000],
    [/regnskabsprogram|software|abonnement/, 3630],
    [/transport|rejse|kørsel/, 3680],
    [/udlæg/, 5200],
  ];
  // Navne-match vinder for balance-/momskonti (mere præcist end et tilfældigt nummersammenfald)
  for (const [re, num] of kw) {
    if (re.test(n)) { const id = byNum(num); if (id) return id; }
  }
  return exact?.id;
}

export default function Migrer() {
  const { company } = useCompany();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [cutover, setCutover] = useState("");
  const [done, setDone] = useState<Record<number, string>>({});
  const [accounts, setAccounts] = useState<AccountRow[]>([]);

  // Saldobalance: mellemtrin med konto-mapping
  const [balanceRows, setBalanceRows] = useState<{ account: string; name: string; balance: number }[] | null>(null);
  const [accountMap, setAccountMap] = useState<Record<number, string>>({}); // rækkeindex → account_id

  // Afstemning: sum af åbne fakturaer vs. debitor-primo
  const [invoiceTotal, setInvoiceTotal] = useState<number | null>(null);
  const [debtorOpening, setDebtorOpening] = useState<number | null>(null);
  // Guard mod dobbelt-bogføring af primo
  const [primoWarning, setPrimoWarning] = useState<number | null>(null);

  useEffect(() => {
    if (!company) return;
    setCutover(company.fiscal_year_start || `${new Date().getFullYear()}-01-01`);
    supabase.from("accounts").select("id, number, name").eq("company_id", company.id).order("number")
      .then(({ data }) => { if (data) setAccounts(data as AccountRow[]); });
  }, [company]);

  const markDone = (s: number, msg: string) => {
    setDone((prev) => ({ ...prev, [s]: msg }));
    if (s < 4) setStep(s + 1);
  };

  // ---- Step 1: Kunder ----
  const commitCustomers = async (rows: Record<string, string>[]) => {
    if (!company) return;
    setBusy(true);
    try {
      const { data: existing } = await supabase.from("customers").select("name, cvr").eq("company_id", company.id);
      const seenCvr = new Set((existing || []).map((c: any) => (c.cvr || "").replace(/\D/g, "")).filter(Boolean));
      const seenName = new Set((existing || []).map((c: any) => c.name.toLowerCase()));
      const toInsert = rows
        .filter((r) => r.name.trim())
        .filter((r) => {
          const cvr = (r.cvr || "").replace(/\D/g, "");
          if (cvr && seenCvr.has(cvr)) return false;
          if (seenName.has(r.name.trim().toLowerCase())) return false;
          seenName.add(r.name.trim().toLowerCase());
          return true;
        })
        .map((r) => ({
          company_id: company.id,
          name: r.name.trim(),
          cvr: (r.cvr || "").replace(/\D/g, "") || null,
          email: r.email || null,
          address: r.address || null,
          default_payment_terms: Number(r.terms) > 0 ? Number(r.terms) : 14,
        }));
      if (toInsert.length) {
        const { error } = await supabase.from("customers").insert(toInsert);
        if (error) throw error;
      }
      markDone(1, `${toInsert.length} kunder importeret (${rows.length - toInsert.length} sprunget over som dubletter)`);
    } catch (e: any) {
      toast({ title: "Fejl", description: e.message, variant: "destructive" });
    } finally { setBusy(false); }
  };

  // ---- Step 2: Produkter ----
  const commitProducts = async (rows: Record<string, string>[]) => {
    if (!company) return;
    setBusy(true);
    try {
      const { data: existing } = await supabase.from("products").select("name").eq("company_id", company.id);
      const seen = new Set((existing || []).map((p: any) => p.name.toLowerCase()));
      const toInsert = rows
        .filter((r) => r.name.trim() && !seen.has(r.name.trim().toLowerCase()))
        .map((r) => {
          seen.add(r.name.trim().toLowerCase());
          return {
            company_id: company.id,
            name: r.name.trim(),
            description: r.description || null,
            unit_price: parseLocalizedAmount(r.price || "0"),
            vat_rate: Number(r.vat) >= 0 && r.vat ? Math.round(parseLocalizedAmount(r.vat)) : 25,
            unit: r.unit || null,
          };
        });
      if (toInsert.length) {
        const { error } = await supabase.from("products").insert(toInsert);
        if (error) throw error;
      }
      markDone(2, `${toInsert.length} produkter importeret`);
    } catch (e: any) {
      toast({ title: "Fejl", description: e.message, variant: "destructive" });
    } finally { setBusy(false); }
  };

  // ---- Step 3: Åbne fakturaer ----
  const commitInvoices = async (rows: Record<string, string>[]) => {
    if (!company) return;
    setBusy(true);
    try {
      // Kunder til opslag/oprettelse
      const { data: custs } = await supabase.from("customers").select("id, name, cvr").eq("company_id", company.id);
      const custByName = new Map((custs || []).map((c: any) => [c.name.toLowerCase(), c]));
      const { data: existingInv } = await supabase.from("invoices").select("number").eq("company_id", company.id);
      let nextNum = (existingInv || []).reduce((m: number, i: any) => Math.max(m, i.number || 0), 0) + 1;

      let total = 0;
      let imported = 0;
      for (const r of rows) {
        const name = r.customer.trim();
        if (!name) continue;
        let cust = custByName.get(name.toLowerCase());
        if (!cust) {
          const { data: created } = await supabase.from("customers")
            .insert({ company_id: company.id, name }).select("id, name").single();
          if (created) { cust = created; custByName.set(name.toLowerCase(), created); }
        }
        const amt = parseLocalizedAmount(r.total || "0");
        const num = Number(r.number) > 0 ? Number(r.number) : nextNum++;
        const date = parseDate(r.date) || cutover;
        const due = parseDate(r.due) || date;
        const { error } = await supabase.from("invoices").insert({
          company_id: company.id,
          number: num,
          customer: name,
          customer_id: cust?.id ?? null,
          date, due_date: due,
          total: amt, total_excl_vat: amt, total_vat: 0,
          lines: [{ description: "Overført åben faktura", quantity: 1, price: amt, vatRate: 0 }],
          status: "sendt",
          sent_at: new Date().toISOString(),
        });
        if (!error) { imported++; total += amt; }
      }
      setInvoiceTotal(total);
      markDone(3, `${imported} åbne fakturaer importeret · samlet ${formatAmount(total)}`);
    } catch (e: any) {
      toast({ title: "Fejl", description: e.message, variant: "destructive" });
    } finally { setBusy(false); }
  };

  // ---- Step 4: Saldobalance ----
  const receiveBalanceRows = (rows: Record<string, string>[]) => {
    const parsed = rows
      .map((r) => ({ account: (r.account || "").trim(), name: (r.name || r.account || "").trim(), balance: parseLocalizedAmount(r.balance || "0") }))
      .filter((r) => r.account && r.balance !== 0);
    // Auto-foreslå Captain-konto via navn (og nummer som fallback)
    const map: Record<number, string> = {};
    parsed.forEach((r, i) => {
      const num = parseInt(r.account.replace(/\D/g, ""), 10);
      const id = suggestCaptainAccount(num, r.name, accounts);
      if (id) map[i] = id;
    });
    setBalanceRows(parsed);
    setAccountMap(map);
  };

  const commitBalances = async (force = false) => {
    if (!company || !balanceRows) return;
    // Guard: er der allerede bogført primo (overførsel) på skæringsdatoen?
    if (!force) {
      const { count } = await supabase
        .from("journal_entries")
        .select("id", { count: "exact", head: true })
        .eq("company_id", company.id)
        .eq("date", cutover)
        .like("description", "Primo (overført)%");
      if (count && count > 0) {
        setPrimoWarning(count);
        return;
      }
    }
    setPrimoWarning(null);
    setBusy(true);
    try {
      const entries = balanceRows
        .map((r, i) => ({ r, acc: accounts.find((a) => a.id === accountMap[i]) }))
        .filter((x) => x.acc)
        .map(({ r, acc }) => ({
          company_id: company.id,
          date: cutover,
          description: `Primo (overført): ${r.name}`,
          account: acc!.name,
          account_number: acc!.number,
          account_id: acc!.id,
          amount: r.balance,
          net_amount: r.balance,
          vat_amount: 0,
          vat_code: "NONE",
          status: "godkendt",
        }));
      if (entries.length) {
        const { error } = await supabase.from("journal_entries").insert(entries);
        if (error) throw error;
      }
      // Debitor-primo (konto 5100) til afstemning
      const debtor = entries.filter((e) => e.account_number === 5100).reduce((s, e) => s + e.amount, 0);
      setDebtorOpening(debtor);
      markDone(4, `${entries.length} primo-saldi bogført pr. ${cutover}`);
    } catch (e: any) {
      toast({ title: "Fejl", description: e.message, variant: "destructive" });
    } finally { setBusy(false); }
  };

  const reconcileDiff = invoiceTotal != null && debtorOpening != null
    ? Math.round((invoiceTotal - debtorOpening) * 100) / 100
    : null;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-lg font-semibold">Flyt dit regnskab</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Kommer du fra Dinero eller Billy? Eksportér dine lister som CSV og hent dem ind her. Hvert trin kan springes over.
        </p>
      </motion.div>

      {/* Stepper */}
      <div className="flex items-center gap-2 text-xs flex-wrap">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={s.id} className="flex items-center gap-2">
              {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
              <button
                onClick={() => setStep(s.id)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded font-medium ${
                  step === s.id ? "bg-primary/20 text-primary" : done[s.id] ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {done[s.id] ? <Check className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
                {s.id}. {s.label}
              </button>
            </div>
          );
        })}
      </div>

      {/* Cutover date */}
      <div className="flex items-center gap-3 p-3 border border-border/50 rounded">
        <Label className="text-xs whitespace-nowrap">Skæringsdato (primo)</Label>
        <Input type="date" value={cutover} onChange={(e) => setCutover(e.target.value)} className="h-8 w-44 text-sm font-mono" />
        <span className="text-[11px] text-muted-foreground">Saldobalancen bogføres på denne dato.</span>
      </div>

      {done[step] && (
        <div className="border border-primary/30 bg-primary/5 rounded p-3 text-sm text-primary flex items-center gap-2">
          <Check className="h-4 w-4" /> {done[step]}
        </div>
      )}

      {/* Step body */}
      <div className="border border-border/50 rounded p-5 space-y-4">
        {busy && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Importerer…</div>}

        {!busy && step === 1 && (
          <>
            <p className="text-xs text-muted-foreground">Eksportér dine kontakter/kunder fra Dinero/Billy som CSV.</p>
            <CsvMapper columns={customerCols} onMapped={commitCustomers} cta="Importér kunder" />
          </>
        )}
        {!busy && step === 2 && (
          <>
            <p className="text-xs text-muted-foreground">Eksportér din produkt-/ydelsesliste som CSV.</p>
            <CsvMapper columns={productCols} onMapped={commitProducts} cta="Importér produkter" />
          </>
        )}
        {!busy && step === 3 && (
          <>
            <p className="text-xs text-muted-foreground">
              Eksportér dine ubetalte/åbne fakturaer som CSV. De oprettes som sendte fakturaer til opfølgning —
              der bogføres ikke debitor-posteringer (saldobalancen står for primo-debitor).
            </p>
            <CsvMapper columns={invoiceCols} onMapped={commitInvoices} cta="Importér fakturaer" />
          </>
        )}
        {!busy && step === 4 && (
          balanceRows ? (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">Map hver konto fra din saldobalance til din Captain-kontoplan:</p>
              <div className="border border-border/30 rounded divide-y divide-border/20 max-h-[400px] overflow-y-auto">
                {balanceRows.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 text-xs">
                    <span className="flex-1 truncate">{r.account} {r.name && r.name !== r.account ? `· ${r.name}` : ""}</span>
                    <span className="font-mono w-24 text-right">{formatAmount(r.balance)}</span>
                    <Select value={accountMap[i] || ""} onValueChange={(v) => setAccountMap((prev) => ({ ...prev, [i]: v }))}>
                      <SelectTrigger className="h-7 w-52 text-xs"><SelectValue placeholder="Vælg konto" /></SelectTrigger>
                      <SelectContent>
                        {accounts.map((a) => <SelectItem key={a.id} value={a.id} className="text-xs">{a.number} {a.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
              {primoWarning != null && (
                <div className="border border-warning/30 bg-warning/5 rounded p-3 text-xs text-warning space-y-2">
                  <p>
                    Der er allerede bogført {primoWarning} primo-postering{primoWarning === 1 ? "" : "er"} pr. {cutover}.
                    Bogfører du igen, oprettes saldiene <strong>oveni</strong> de eksisterende (dobbelttælling).
                  </p>
                  <Button size="sm" variant="destructive" className="text-xs" onClick={() => commitBalances(true)}>
                    Bogfør alligevel
                  </Button>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-muted-foreground">
                  {Object.keys(accountMap).length} af {balanceRows.length} konti mappet
                </span>
                <Button size="sm" className="text-xs" onClick={() => commitBalances(false)}>Bogfør primo-saldi</Button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                Skifter du ved årets start? Upload din <strong>åbningsbalance</strong> (kun balancekonti: bank,
                debitorer, kreditorer, egenkapital, moms). Skifter du midt i året, og skal Captain vise hele året?
                Upload din fulde <strong>saldobalance</strong>. Format: kontonr. + kontonavn + saldo.
              </p>
              <CsvMapper columns={balanceCols} onMapped={receiveBalanceRows} cta="Næste: map konti" />
            </>
          )
        )}
      </div>

      {/* Reconciliation */}
      {reconcileDiff != null && (
        <div className={`rounded p-3 text-sm flex items-start gap-2 ${
          Math.abs(reconcileDiff) < 0.5 ? "border border-primary/30 bg-primary/5 text-primary" : "border border-warning/30 bg-warning/5 text-warning"
        }`}>
          <Scale className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            {Math.abs(reconcileDiff) < 0.5
              ? <p>Afstemt: åbne fakturaer ({formatAmount(invoiceTotal!)}) matcher debitor-primo ({formatAmount(debtorOpening!)}).</p>
              : <p>Bemærk: åbne fakturaer ({formatAmount(invoiceTotal!)}) afviger fra debitor-primo ({formatAmount(debtorOpening!)}) med {formatAmount(reconcileDiff)}. Tjek dine kildedata.</p>}
          </div>
        </div>
      )}

      {Object.keys(done).length > 0 && (
        <div className="flex justify-end">
          <Button size="sm" variant="outline" className="text-xs gap-1.5" onClick={() => navigate("/dashboard")}>
            Færdig — til dashboard <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
