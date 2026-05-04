import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, Send, Download, FileText, Inbox, CheckCircle2, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatAmount } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { useToast } from "@/hooks/use-toast";
import { generateInvoicePdf } from "@/lib/invoice-pdf";

interface InvoiceLine {
  id: number;
  description: string;
  quantity: number;
  price: number;
  vatRate: number;
}

interface InvoiceRow {
  id: string;
  number: number;
  customer: string;
  customer_id: string | null;
  date: string;
  due_date: string;
  total: number;
  total_excl_vat: number;
  total_vat: number;
  status: string;
  pdf_url: string | null;
  lines: any;
}

interface Customer {
  id: string;
  name: string;
  cvr: string | null;
  email: string | null;
  address: string | null;
  default_payment_terms: number;
}

const statusColors: Record<string, string> = {
  kladde: "bg-muted/50 text-muted-foreground border-muted",
  sendt: "bg-info/15 text-info border-info/20",
  betalt: "bg-primary/15 text-primary border-primary/20",
  forfalden: "bg-destructive/15 text-destructive border-destructive/20",
};

export default function Faktura() {
  const { company } = useCompany();
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showCustomer, setShowCustomer] = useState(false);
  const [openInvoice, setOpenInvoice] = useState<InvoiceRow | null>(null);
  const [busy, setBusy] = useState(false);

  // create form
  const [customerId, setCustomerId] = useState<string>("");
  const today = new Date().toISOString().split("T")[0];
  const [invoiceDate, setInvoiceDate] = useState(today);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 14);
    return d.toISOString().split("T")[0];
  });
  const [lines, setLines] = useState<InvoiceLine[]>([
    { id: 1, description: "", quantity: 1, price: 0, vatRate: 25 },
  ]);

  // customer form
  const [cName, setCName] = useState("");
  const [cCvr, setCCvr] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [cAddress, setCAddress] = useState("");
  const [cTerms, setCTerms] = useState(14);

  const refetch = useCallback(async () => {
    if (!company) return;
    const [inv, cust] = await Promise.all([
      supabase.from("invoices").select("*").eq("company_id", company.id).order("date", { ascending: false }),
      supabase.from("customers").select("*").eq("company_id", company.id).order("name"),
    ]);
    if (inv.data) setInvoices(inv.data as any);
    if (cust.data) setCustomers(cust.data as any);
  }, [company]);

  useEffect(() => { refetch(); }, [refetch]);

  const addLine = () => setLines((p) => [...p, { id: Date.now(), description: "", quantity: 1, price: 0, vatRate: 25 }]);
  const removeLine = (id: number) => lines.length > 1 && setLines((p) => p.filter((l) => l.id !== id));
  const updateLine = (id: number, f: keyof InvoiceLine, v: string | number) =>
    setLines((p) => p.map((l) => l.id === id ? { ...l, [f]: v } : l));

  const subtotal = lines.reduce((s, l) => s + l.quantity * l.price, 0);
  const totalVat = lines.reduce((s, l) => s + l.quantity * l.price * (l.vatRate / 100), 0);
  const total = subtotal + totalVat;
  const nextNumber = invoices.length > 0 ? Math.max(...invoices.map((i) => i.number)) + 1 : 1;

  const resetCreate = () => {
    setCustomerId("");
    setInvoiceDate(today);
    const d = new Date(); d.setDate(d.getDate() + 14);
    setDueDate(d.toISOString().split("T")[0]);
    setLines([{ id: 1, description: "", quantity: 1, price: 0, vatRate: 25 }]);
    setShowCreate(false);
  };

  const saveCustomer = async () => {
    if (!company || !cName.trim()) return;
    const { error } = await supabase.from("customers").insert({
      company_id: company.id, name: cName, cvr: cCvr || null, email: cEmail || null, address: cAddress || null, default_payment_terms: cTerms,
    });
    if (error) return toast({ title: "Fejl", description: error.message, variant: "destructive" });
    setCName(""); setCCvr(""); setCEmail(""); setCAddress(""); setCTerms(14);
    setShowCustomer(false);
    refetch();
    toast({ title: "Kunde oprettet" });
  };

  const saveInvoice = async (status: "kladde" | "sendt") => {
    if (!company) return;
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) return toast({ title: "Vælg en kunde", variant: "destructive" });
    if (lines.every((l) => !l.description.trim())) return toast({ title: "Tilføj mindst én linje", variant: "destructive" });

    setBusy(true);
    try {
      let pdf_url: string | null = null;
      let journal_entry_id: string | null = null;

      const { data: inv, error } = await supabase.from("invoices").insert({
        company_id: company.id,
        number: nextNumber,
        customer: customer.name,
        customer_id: customer.id,
        date: invoiceDate,
        due_date: dueDate,
        lines: lines as any,
        total,
        total_excl_vat: subtotal,
        total_vat: totalVat,
        status,
        sent_at: status === "sendt" ? new Date().toISOString() : null,
      }).select().single();
      if (error) throw error;

      // Generate + upload PDF
      const pdfBytes = await generateInvoicePdf({
        company: { name: company.name, cvr: company.cvr },
        customer,
        invoice: { number: inv.number, date: invoiceDate, due_date: dueDate, lines, subtotal, totalVat, total },
      });
      const path = `${company.id}/${inv.id}.pdf`;
      const upload = await supabase.storage.from("invoices").upload(path, pdfBytes, {
        contentType: "application/pdf", upsert: true,
      });
      if (!upload.error) {
        pdf_url = path;
      }

      // Journal entries on send
      if (status === "sendt") {
        const { data: je } = await supabase.from("journal_entries").insert([
          { company_id: company.id, date: invoiceDate, description: `Faktura #${inv.number} — ${customer.name}`, account: "Nettoomsætning", account_number: 1000, amount: -subtotal, status: "godkendt", has_document: true },
          { company_id: company.id, date: invoiceDate, description: `Faktura #${inv.number} — ${customer.name}`, account: "Tilgodehavender", account_number: 5100, amount: total, status: "godkendt", has_document: true },
        ]).select();
        journal_entry_id = je?.[0]?.id ?? null;
      }

      await supabase.from("invoices").update({ pdf_url, journal_entry_id }).eq("id", inv.id);
      toast({ title: status === "sendt" ? "Faktura sendt" : "Kladde gemt" });
      resetCreate();
      refetch();
    } catch (e: any) {
      toast({ title: "Fejl", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const markPaid = async (inv: InvoiceRow) => {
    if (!company) return;
    setBusy(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const { data: je } = await supabase.from("journal_entries").insert([
        { company_id: company.id, date: today, description: `Betaling faktura #${inv.number} — ${inv.customer}`, account: "Bankkonto", account_number: 5000, amount: inv.total, status: "godkendt", has_document: true },
        { company_id: company.id, date: today, description: `Betaling faktura #${inv.number} — ${inv.customer}`, account: "Tilgodehavender", account_number: 5100, amount: -inv.total, status: "godkendt", has_document: true },
      ]).select();
      await supabase.from("invoices").update({
        status: "betalt", paid_at: new Date().toISOString(), payment_journal_entry_id: je?.[0]?.id ?? null,
      }).eq("id", inv.id);
      toast({ title: "Markeret som betalt" });
      setOpenInvoice(null);
      refetch();
    } catch (e: any) {
      toast({ title: "Fejl", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const downloadPdf = async (inv: InvoiceRow) => {
    if (!inv.pdf_url) return;
    const { data } = await supabase.storage.from("invoices").createSignedUrl(inv.pdf_url, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <Tabs defaultValue="invoices">
        <div className="flex items-center justify-between mb-5">
          <TabsList>
            <TabsTrigger value="invoices" className="text-xs"><FileText className="h-3 w-3 mr-1.5" />Fakturaer</TabsTrigger>
            <TabsTrigger value="customers" className="text-xs"><Users className="h-3 w-3 mr-1.5" />Kunder</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="invoices" className="space-y-5">
          <div className="flex justify-between items-center">
            <h1 className="text-lg font-semibold">Fakturaer</h1>
            <Button size="sm" className="text-xs gap-1.5" onClick={() => setShowCreate(!showCreate)}>
              <Plus className="h-3 w-3" /> Ny faktura
            </Button>
          </div>

          {showCreate && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="border border-border/50 rounded p-5 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">Opret faktura</h2>
                <span className="text-xs font-mono text-muted-foreground">#{nextNumber}</span>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Kunde</Label>
                  <Select value={customerId} onValueChange={setCustomerId}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Vælg kunde" /></SelectTrigger>
                    <SelectContent>
                      {customers.length === 0 ? (
                        <div className="text-xs text-muted-foreground p-2">Ingen kunder. Opret én under fanen Kunder.</div>
                      ) : customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Fakturadato</Label>
                  <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className="h-8 text-sm bg-background font-mono" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Forfaldsdato</Label>
                  <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-8 text-sm bg-background font-mono" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="grid grid-cols-[1fr_80px_100px_80px_32px] gap-2 text-xs text-muted-foreground font-medium">
                  <span>Beskrivelse</span><span>Antal</span><span>Pris</span><span>Moms</span><span></span>
                </div>
                {lines.map((line) => (
                  <div key={line.id} className="grid grid-cols-[1fr_80px_100px_80px_32px] gap-2">
                    <Input value={line.description} onChange={(e) => updateLine(line.id, "description", e.target.value)} placeholder="Beskrivelse..." className="h-8 text-sm bg-background" />
                    <Input type="number" value={line.quantity} onChange={(e) => updateLine(line.id, "quantity", parseFloat(e.target.value) || 0)} className="h-8 text-sm bg-background font-mono" />
                    <Input type="number" value={line.price} onChange={(e) => updateLine(line.id, "price", parseFloat(e.target.value) || 0)} className="h-8 text-sm bg-background font-mono" />
                    <Select value={String(line.vatRate)} onValueChange={(v) => updateLine(line.id, "vatRate", parseInt(v))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="25">25%</SelectItem>
                        <SelectItem value="0">0%</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeLine(line.id)}>
                      <Trash2 className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" className="text-xs gap-1" onClick={addLine}>
                  <Plus className="h-3 w-3" /> Tilføj linje
                </Button>
              </div>

              <div className="border-t border-border/30 pt-4 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-mono">{formatAmount(subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Moms</span><span className="font-mono">{formatAmount(totalVat)}</span></div>
                <div className="flex justify-between font-semibold text-base pt-1 border-t border-border/20"><span>Total</span><span className="font-mono text-primary">{formatAmount(total)}</span></div>
              </div>

              <div className="flex gap-3 justify-end">
                <Button size="sm" variant="outline" className="text-xs" onClick={resetCreate} disabled={busy}>Annuller</Button>
                <Button size="sm" variant="outline" className="text-xs" onClick={() => saveInvoice("kladde")} disabled={busy}>Gem kladde</Button>
                <Button size="sm" className="text-xs gap-1.5" onClick={() => saveInvoice("sendt")} disabled={busy}>
                  {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />} Gem og send
                </Button>
              </div>
            </motion.div>
          )}

          {invoices.length === 0 ? (
            <div className="border border-border/50 rounded bg-card flex flex-col items-center justify-center py-16 text-center">
              <Inbox className="h-8 w-8 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">Ingen fakturaer endnu</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Klik på "Ny faktura" for at oprette din første</p>
            </div>
          ) : (
            <div className="border border-border/50 rounded overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/30 text-xs text-muted-foreground">
                    <th className="text-left p-3 font-medium">Faktura</th>
                    <th className="text-left p-3 font-medium">Kunde</th>
                    <th className="text-left p-3 font-medium">Dato</th>
                    <th className="text-left p-3 font-medium">Forfald</th>
                    <th className="text-right p-3 font-medium">Beløb</th>
                    <th className="text-center p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} onClick={() => setOpenInvoice(inv)} className="border-b border-border/20 hover:bg-accent/20 transition-colors cursor-pointer">
                      <td className="p-3"><div className="flex items-center gap-2"><FileText className="h-3.5 w-3.5 text-muted-foreground" /><span className="font-mono text-xs">#{inv.number}</span></div></td>
                      <td className="p-3">{inv.customer}</td>
                      <td className="p-3 font-mono text-xs text-muted-foreground">{inv.date}</td>
                      <td className="p-3 font-mono text-xs text-muted-foreground">{inv.due_date}</td>
                      <td className="p-3 text-right font-mono text-primary">{formatAmount(Number(inv.total))}</td>
                      <td className="p-3 text-center"><Badge variant="outline" className={`text-[10px] ${statusColors[inv.status] || ""}`}>{inv.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="customers" className="space-y-5">
          <div className="flex justify-between items-center">
            <h1 className="text-lg font-semibold">Kunder</h1>
            <Button size="sm" className="text-xs gap-1.5" onClick={() => setShowCustomer(true)}>
              <Plus className="h-3 w-3" /> Ny kunde
            </Button>
          </div>
          {customers.length === 0 ? (
            <div className="border border-border/50 rounded bg-card flex flex-col items-center justify-center py-16 text-center">
              <Users className="h-8 w-8 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">Ingen kunder endnu</p>
            </div>
          ) : (
            <div className="border border-border/50 rounded overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/30 text-xs text-muted-foreground">
                    <th className="text-left p-3 font-medium">Navn</th>
                    <th className="text-left p-3 font-medium">CVR</th>
                    <th className="text-left p-3 font-medium">Email</th>
                    <th className="text-right p-3 font-medium">Betalingsfrist</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c.id} className="border-b border-border/20">
                      <td className="p-3 font-medium">{c.name}</td>
                      <td className="p-3 font-mono text-xs text-muted-foreground">{c.cvr || "—"}</td>
                      <td className="p-3 text-xs text-muted-foreground">{c.email || "—"}</td>
                      <td className="p-3 text-right font-mono text-xs">{c.default_payment_terms} dage</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Customer dialog */}
      <Dialog open={showCustomer} onOpenChange={setShowCustomer}>
        <DialogContent>
          <DialogHeader><DialogTitle className="text-base">Ny kunde</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">CVR (hent automatisk)</Label>
              <div className="flex gap-2">
                <Input
                  value={cCvr}
                  onChange={(e) => setCCvr(e.target.value.replace(/\D/g, "").slice(0, 8))}
                  placeholder="12345678"
                  className="h-8 text-sm font-mono"
                />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={cCvr.length !== 8 || cvrLoading}
                  onClick={lookupCvr}
                  className="text-xs whitespace-nowrap"
                >
                  {cvrLoading ? "Henter…" : "Hent automatisk"}
                </Button>
              </div>
            </div>
            <div><Label className="text-xs">Navn *</Label><Input value={cName} onChange={(e) => setCName(e.target.value)} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Email</Label><Input value={cEmail} onChange={(e) => setCEmail(e.target.value)} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Adresse</Label><Input value={cAddress} onChange={(e) => setCAddress(e.target.value)} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Standard betalingsfrist (dage)</Label><Input type="number" value={cTerms} onChange={(e) => setCTerms(parseInt(e.target.value) || 14)} className="h-8 text-sm font-mono w-24" /></div>
          </div>
          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setShowCustomer(false)}>Annuller</Button>
            <Button size="sm" onClick={saveCustomer}>Opret</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoice detail */}
      <Dialog open={!!openInvoice} onOpenChange={(o) => !o && setOpenInvoice(null)}>
        <DialogContent className="max-w-2xl">
          {openInvoice && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base flex items-center gap-2">
                  Faktura #{openInvoice.number}
                  <Badge variant="outline" className={`text-[10px] ${statusColors[openInvoice.status] || ""}`}>{openInvoice.status}</Badge>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div><span className="text-muted-foreground">Kunde:</span> {openInvoice.customer}</div>
                  <div><span className="text-muted-foreground">Dato:</span> <span className="font-mono">{openInvoice.date}</span></div>
                  <div><span className="text-muted-foreground">Forfald:</span> <span className="font-mono">{openInvoice.due_date}</span></div>
                  <div><span className="text-muted-foreground">Total:</span> <span className="font-mono text-primary">{formatAmount(Number(openInvoice.total))}</span></div>
                </div>
                <div className="border border-border/40 rounded">
                  <table className="w-full text-xs">
                    <thead className="text-muted-foreground"><tr className="border-b border-border/30"><th className="text-left p-2 font-medium">Beskrivelse</th><th className="text-right p-2 font-medium">Antal</th><th className="text-right p-2 font-medium">Pris</th><th className="text-right p-2 font-medium">Total</th></tr></thead>
                    <tbody>
                      {(openInvoice.lines as InvoiceLine[]).map((l) => (
                        <tr key={l.id} className="border-b border-border/20">
                          <td className="p-2">{l.description}</td>
                          <td className="p-2 text-right font-mono">{l.quantity}</td>
                          <td className="p-2 text-right font-mono">{formatAmount(l.price)}</td>
                          <td className="p-2 text-right font-mono">{formatAmount(l.quantity * l.price * (1 + l.vatRate / 100))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <DialogFooter>
                {openInvoice.pdf_url && (
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => downloadPdf(openInvoice)}>
                    <Download className="h-3 w-3" /> Download PDF
                  </Button>
                )}
                {openInvoice.status !== "betalt" && (
                  <Button size="sm" className="gap-1.5" onClick={() => markPaid(openInvoice)} disabled={busy}>
                    {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />} Markér som betalt
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
