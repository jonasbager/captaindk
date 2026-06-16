import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useCompany } from "@/hooks/useCompany";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Compass, Loader2, ImagePlus } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { PAYMENT_METHODS, methodIsFilled } from "@/lib/payment-methods";

const PREFS_KEY = "captain-prefs";

function loadPrefs(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY) || "{}");
  } catch {
    return {};
  }
}

export default function Indstillinger() {
  const { company, refetch } = useCompany();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [cvr, setCvr] = useState("");
  const [fiscalStart, setFiscalStart] = useState("");
  const [companyType, setCompanyType] = useState("enkeltmandsvirksomhed");
  const [vatPeriod, setVatPeriod] = useState("halvaarlig");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [bankReg, setBankReg] = useState("");
  const [bankKonto, setBankKonto] = useState("");
  const [mobilepay, setMobilepay] = useState("");
  const [iban, setIban] = useState("");
  const [swift, setSwift] = useState("");
  const [defaultTerms, setDefaultTerms] = useState("8");
  const [defaultMethods, setDefaultMethods] = useState<string[]>([]);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoBusy, setLogoBusy] = useState(false);

  const prefs = loadPrefs();
  const [navVisible, setNavVisible] = useState(prefs.navVisible ?? true);
  const [autoSuggest, setAutoSuggest] = useState(prefs.autoSuggest ?? true);
  const [aiNotifications, setAiNotifications] = useState(prefs.aiNotifications ?? true);
  const [emailSuggestions, setEmailSuggestions] = useState(prefs.emailSuggestions ?? true);
  const [emailDeadlines, setEmailDeadlines] = useState(prefs.emailDeadlines ?? true);

  useEffect(() => {
    if (company) {
      setName(company.name);
      setCvr(company.cvr || "");
      setFiscalStart(company.fiscal_year_start);
      setCompanyType(company.company_type);
      setVatPeriod(company.vat_period);
      setBankReg(company.bank_reg || "");
      setBankKonto(company.bank_konto || "");
      setMobilepay(company.mobilepay || "");
      setIban(company.iban || "");
      setSwift(company.swift || "");
      setDefaultTerms(String(company.default_payment_terms ?? 8));
      setDefaultMethods(company.invoice_default_methods || []);
      setLogoUrl(company.logo_url);
    }
  }, [company]);

  // Hent signed URL til logo-preview
  useEffect(() => {
    if (!logoUrl) { setLogoPreview(null); return; }
    supabase.storage.from("branding").createSignedUrl(logoUrl, 3600)
      .then(({ data }) => setLogoPreview(data?.signedUrl ?? null));
  }, [logoUrl]);

  useEffect(() => {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ navVisible, autoSuggest, aiNotifications, emailSuggestions, emailDeadlines }));
  }, [navVisible, autoSuggest, aiNotifications, emailSuggestions, emailDeadlines]);

  const save = async () => {
    if (!company) return;
    if (!name.trim()) {
      toast({ title: "Virksomhedsnavn mangler", variant: "destructive" });
      return;
    }
    const cleanedCvr = cvr.replace(/\s|-/g, "");
    if (cleanedCvr && !/^\d{8}$/.test(cleanedCvr)) {
      toast({ title: "Ugyldigt CVR", description: "CVR-numre er 8 cifre.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("companies")
      .update({
        name: name.trim(),
        cvr: cleanedCvr || null,
        fiscal_year_start: fiscalStart,
        company_type: companyType,
        vat_period: vatPeriod,
        bank_reg: bankReg.trim() || null,
        bank_konto: bankKonto.trim() || null,
        mobilepay: mobilepay.trim() || null,
        iban: iban.trim() || null,
        swift: swift.trim() || null,
        default_payment_terms: Math.max(0, parseInt(defaultTerms, 10) || 8),
        invoice_default_methods: defaultMethods.filter((k) =>
          methodIsFilled(k as any, { bank_reg: bankReg, bank_konto: bankKonto, mobilepay, iban, swift })),
      })
      .eq("id", company.id);
    setSaving(false);
    if (error) {
      toast({ title: "Kunne ikke gemme", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Gemt", description: "Virksomhedsoplysningerne er opdateret." });
      refetch();
    }
  };

  const uploadLogo = async (file: File) => {
    if (!company) return;
    if (!/\.(png|jpe?g)$/i.test(file.name)) {
      toast({ title: "Forkert filtype", description: "Brug PNG eller JPG.", variant: "destructive" });
      return;
    }
    if (file.size > 1_000_000) {
      toast({ title: "Filen er for stor", description: "Maks 1 MB.", variant: "destructive" });
      return;
    }
    setLogoBusy(true);
    const ext = file.name.toLowerCase().endsWith(".png") ? "png" : "jpg";
    const path = `${company.id}/logo.${ext}`;
    const { error: upErr } = await supabase.storage.from("branding").upload(path, file, { contentType: file.type, upsert: true });
    if (upErr) {
      setLogoBusy(false);
      toast({ title: "Upload fejlede", description: upErr.message, variant: "destructive" });
      return;
    }
    await supabase.from("companies").update({ logo_url: path }).eq("id", company.id);
    setLogoUrl(path);
    setLogoBusy(false);
    toast({ title: "Logo opdateret" });
    refetch();
  };

  const removeLogo = async () => {
    if (!company || !logoUrl) return;
    setLogoBusy(true);
    await supabase.storage.from("branding").remove([logoUrl]);
    await supabase.from("companies").update({ logo_url: null }).eq("id", company.id);
    setLogoUrl(null);
    setLogoBusy(false);
    refetch();
  };

  const pickLogo = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png,image/jpeg";
    input.onchange = () => { const f = input.files?.[0]; if (f) uploadLogo(f); };
    input.click();
  };

  const deleteCompany = async () => {
    if (!company) return;
    setDeleting(true);
    const { error } = await supabase.from("companies").delete().eq("id", company.id);
    setDeleting(false);
    if (error) {
      toast({ title: "Kunne ikke slette", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Virksomheden er slettet" });
      navigate("/onboarding", { replace: true });
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-lg font-semibold">
        Indstillinger
      </motion.h1>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="border border-border/50 rounded p-5 space-y-4"
      >
        <h2 className="text-sm font-semibold">Virksomhed</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Virksomhedsnavn</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 text-sm bg-background" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">CVR-nummer</Label>
            <Input value={cvr} onChange={(e) => setCvr(e.target.value)} className="h-8 text-sm bg-background font-mono" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Regnskabsår start</Label>
            <Input value={fiscalStart} onChange={(e) => setFiscalStart(e.target.value)} type="date" className="h-8 text-sm bg-background font-mono" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Virksomhedsform</Label>
            <Select value={companyType} onValueChange={setCompanyType}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="enkeltmandsvirksomhed">Enkeltmandsvirksomhed</SelectItem>
                <SelectItem value="aps">ApS</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Momsperiode</Label>
            <Select value={vatPeriod} onValueChange={setVatPeriod}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="halvaarlig">Halvårlig</SelectItem>
                <SelectItem value="kvartalsvis">Kvartalsvis</SelectItem>
                <SelectItem value="maanedlig">Månedlig</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Logo */}
        <div className="space-y-1.5 pt-2 border-t border-border/30">
          <Label className="text-xs">Logo (vises på fakturaer)</Label>
          <div className="flex items-center gap-3">
            {logoPreview ? (
              <img src={logoPreview} alt="Logo" className="h-12 w-auto max-w-[160px] object-contain border border-border/30 rounded bg-white p-1" />
            ) : (
              <div className="h-12 w-24 border border-dashed border-border/40 rounded flex items-center justify-center text-[10px] text-muted-foreground">Intet logo</div>
            )}
            <Button size="sm" variant="outline" className="text-xs gap-1.5" onClick={pickLogo} disabled={logoBusy}>
              {logoBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImagePlus className="w-3 h-3" />}
              {logoUrl ? "Skift logo" : "Upload logo"}
            </Button>
            {logoUrl && (
              <Button size="sm" variant="ghost" className="text-xs text-muted-foreground" onClick={removeLogo} disabled={logoBusy}>
                Fjern
              </Button>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground">PNG eller JPG, maks 1 MB.</p>
        </div>

        {/* Betalingsoplysninger */}
        <div className="pt-2 border-t border-border/30 space-y-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Betalingsoplysninger (vises på fakturaer)</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Bank reg.nr.</Label>
              <Input value={bankReg} onChange={(e) => setBankReg(e.target.value)} className="h-8 text-sm bg-background font-mono" placeholder="fx 1234" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Kontonummer</Label>
              <Input value={bankKonto} onChange={(e) => setBankKonto(e.target.value)} className="h-8 text-sm bg-background font-mono" placeholder="fx 1234567890" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">MobilePay</Label>
              <Input value={mobilepay} onChange={(e) => setMobilepay(e.target.value)} className="h-8 text-sm bg-background font-mono" placeholder="nr. eller box" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Standard betalingsfrist (dage)</Label>
              <Input type="number" value={defaultTerms} onChange={(e) => setDefaultTerms(e.target.value)} className="h-8 text-sm bg-background font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">IBAN</Label>
              <Input value={iban} onChange={(e) => setIban(e.target.value)} className="h-8 text-sm bg-background font-mono" placeholder="DK00 0000 0000 0000 00" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">SWIFT/BIC</Label>
              <Input value={swift} onChange={(e) => setSwift(e.target.value)} className="h-8 text-sm bg-background font-mono" />
            </div>
          </div>

          {/* Vis som standard på fakturaer */}
          {(() => {
            const fields = { bank_reg: bankReg, bank_konto: bankKonto, mobilepay, iban, swift };
            const available = PAYMENT_METHODS.filter((m) => methodIsFilled(m.key, fields));
            if (available.length === 0) return null;
            const toggle = (key: string, on: boolean) =>
              setDefaultMethods((prev) => (on ? [...new Set([...prev, key])] : prev.filter((k) => k !== key)));
            return (
              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Vis som standard på fakturaer</p>
                <div className="flex flex-wrap gap-4">
                  {available.map((m) => (
                    <label key={m.key} className="flex items-center gap-2 text-xs cursor-pointer">
                      <Checkbox checked={defaultMethods.includes(m.key)} onCheckedChange={(v) => toggle(m.key, !!v)} />
                      {m.label}
                    </label>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>

        <Button size="sm" className="text-xs gap-2" onClick={save} disabled={saving || !company}>
          {saving && <Loader2 className="w-3 h-3 animate-spin" />}
          Gem ændringer
        </Button>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="border border-border/50 rounded p-5 space-y-4"
      >
        <h2 className="text-sm font-semibold">Konto</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Navn</Label>
            <Input defaultValue={user?.user_metadata?.full_name || user?.user_metadata?.name || ""} className="h-8 text-sm bg-background" readOnly />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Email</Label>
            <Input defaultValue={user?.email || ""} className="h-8 text-sm bg-background" readOnly />
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="border border-border/50 rounded p-5 space-y-4"
      >
        <div className="flex items-center gap-2">
          <Compass className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Captain-assistent (Nav)</h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm">Vis Nav i chat</p>
              <p className="text-xs text-muted-foreground">Nav hjælper med kontering og bogføring</p>
            </div>
            <Switch checked={navVisible} onCheckedChange={setNavVisible} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm">Foreslå konteringer automatisk</p>
              <p className="text-xs text-muted-foreground">Nav analyserer transaktioner og foreslår konto</p>
            </div>
            <Switch checked={autoSuggest} onCheckedChange={setAutoSuggest} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm">Notifikationer ved AI-forslag</p>
              <p className="text-xs text-muted-foreground">Få besked når Nav har nye forslag</p>
            </div>
            <Switch checked={aiNotifications} onCheckedChange={setAiNotifications} />
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="border border-border/50 rounded p-5 space-y-4"
      >
        <h2 className="text-sm font-semibold">Notifikationer</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm">Email ved nye AI-forslag</p>
              <p className="text-xs text-muted-foreground">Modtag email når Nav har nye konteringsforslag</p>
            </div>
            <Switch checked={emailSuggestions} onCheckedChange={setEmailSuggestions} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm">Email ved momsfrist</p>
              <p className="text-xs text-muted-foreground">Påmindelse 14 dage før momsfrist</p>
            </div>
            <Switch checked={emailDeadlines} onCheckedChange={setEmailDeadlines} />
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        className="border border-border/50 rounded p-5 space-y-3"
      >
        <h2 className="text-sm font-semibold">Plan & fakturering</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono bg-primary/20 text-primary px-2 py-1 rounded">Beta — Gratis</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Du er en del af Captain Beta. Tak for at hjælpe os bygge produktet! ⚓
        </p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="border border-destructive/30 rounded p-5 space-y-3"
      >
        <h2 className="text-sm font-semibold text-destructive">Farezone</h2>
        <p className="text-xs text-muted-foreground">Slet alle data og nulstil virksomheden. Denne handling kan ikke fortrydes.</p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" className="text-xs" disabled={!company || deleting}>
              {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : "Slet virksomhed"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Slet {company?.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                Alle posteringer, bilag, konti og bankforbindelser slettes permanent. Denne handling kan ikke fortrydes.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annullér</AlertDialogCancel>
              <AlertDialogAction onClick={deleteCompany} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Slet permanent
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </motion.div>
    </div>
  );
}
