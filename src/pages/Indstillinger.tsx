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
import { Compass, Loader2 } from "lucide-react";

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
    }
  }, [company]);

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
