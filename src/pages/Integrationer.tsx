import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, CreditCard, Plug, Building2, Receipt, Loader2, RefreshCw, Upload, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCompany } from "@/hooks/useCompany";

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  status: "forbundet" | "ikke-forbundet" | "kommer-snart" | "udløbet";
  provider?: string;
}

interface BankOption {
  name: string;
  country: string;
  logo: string | null;
}

interface BankConnection {
  id: string;
  account_name: string | null;
  aspsp_name: string | null;
  status: string;
  last_synced_at: string | null;
}

const baseIntegrations: Integration[] = [
  { id: "gmail", name: "Gmail", description: "Automatisk scanning af kvitteringer i din Gmail-indbakke", icon: Mail, status: "ikke-forbundet", provider: "gmail" },
  { id: "outlook", name: "Microsoft 365 / Outlook", description: "Find kvitteringer og fakturaer i Outlook automatisk", icon: Mail, status: "ikke-forbundet", provider: "outlook" },
  { id: "bank", name: "Bank (PSD2)", description: "Automatisk import af banktransaktioner via Enable Banking", icon: CreditCard, status: "ikke-forbundet" },
  { id: "csv", name: "Kontoudtog (CSV)", description: "Importér banktransaktioner fra en CSV-fil — alternativ til bankforbindelse, med AI-konteringsforslag", icon: Upload, status: "ikke-forbundet" },
  { id: "pleo", name: "Pleo", description: "CSV-import nu, API-integration i v2", icon: Receipt, status: "ikke-forbundet" },
  { id: "migrer", name: "Flyt dit regnskab", description: "Kommer du fra Dinero eller Billy? Hent kunder, produkter, åbne fakturaer og saldobalance ind via CSV", icon: ArrowRightLeft, status: "ikke-forbundet" },
  { id: "booksmate", name: "Booksmate", description: "Del dit regnskab direkte med din revisor", icon: Plug, status: "kommer-snart" },
  { id: "skat", name: "SKAT TastSelv", description: "Automatisk indberetning af oplysningsskema til SKAT", icon: Building2, status: "kommer-snart" },
];

const statusStyle: Record<string, string> = {
  forbundet: "bg-primary/15 text-primary border-primary/20",
  "ikke-forbundet": "bg-muted text-muted-foreground border-border/30",
  "kommer-snart": "bg-accent text-muted-foreground border-border/30",
  "udløbet": "bg-destructive/15 text-destructive border-destructive/20",
};

export default function Integrationer() {
  const { toast } = useToast();
  const { session } = useAuth();
  const { company } = useCompany();
  const navigate = useNavigate();
  const [integrations, setIntegrations] = useState<Integration[]>(baseIntegrations);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [scanning, setScanning] = useState<string | null>(null);

  // Bank state
  const [bankConnections, setBankConnections] = useState<BankConnection[]>([]);
  const [bankDialogOpen, setBankDialogOpen] = useState(false);
  const [bankOptions, setBankOptions] = useState<BankOption[]>([]);
  const [bankFilter, setBankFilter] = useState("");
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const refreshConnections = async () => {
    if (!session?.user) return;
    const { data } = await supabase
      .from("email_connections")
      .select("provider")
      .eq("user_id", session.user.id);

    if (data) {
      const connectedProviders = data.map((c) => c.provider);
      setIntegrations((prev) =>
        prev.map((int) =>
          int.provider && connectedProviders.includes(int.provider)
            ? { ...int, status: "forbundet" }
            : int
        )
      );
    }
  };

  const refreshBankConnections = async () => {
    if (!company?.id) return;
    // Cast until `supabase gen types` has been re-run after the bank_sync migration
    const { data } = await (supabase as any)
      .from("bank_connections")
      .select("id, account_name, aspsp_name, status, last_synced_at")
      .eq("company_id", company.id);

    const conns: BankConnection[] = data || [];
    setBankConnections(conns);
    setIntegrations((prev) =>
      prev.map((int) => {
        if (int.id !== "bank") return int;
        if (conns.some((c) => c.status === "active")) return { ...int, status: "forbundet" };
        if (conns.some((c) => c.status === "expired")) return { ...int, status: "udløbet" };
        return { ...int, status: "ikke-forbundet" };
      })
    );
  };

  useEffect(() => {
    refreshConnections();
  }, [session]);

  useEffect(() => {
    refreshBankConnections();
  }, [company?.id]);

  // Check URL params for callback result
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const gmailStatus = params.get("gmail");
    const outlookStatus = params.get("outlook");
    const bankStatus = params.get("bank");

    if (gmailStatus === "success") {
      toast({ title: "Gmail forbundet", description: "Din Gmail-konto er nu forbundet til Captain." });
      window.history.replaceState({}, "", window.location.pathname);
      refreshConnections();
    } else if (gmailStatus === "error") {
      toast({ title: "Fejl", description: "Kunne ikke forbinde Gmail. Prøv igen.", variant: "destructive" });
      window.history.replaceState({}, "", window.location.pathname);
    }

    if (outlookStatus === "success") {
      toast({ title: "Outlook forbundet", description: "Din Microsoft-konto er nu forbundet til Captain." });
      window.history.replaceState({}, "", window.location.pathname);
      refreshConnections();
    } else if (outlookStatus === "error") {
      const reason = params.get("reason") || "";
      toast({ title: "Fejl", description: `Kunne ikke forbinde Outlook. ${reason}`, variant: "destructive" });
      window.history.replaceState({}, "", window.location.pathname);
    }

    if (bankStatus === "success") {
      toast({ title: "Bank forbundet", description: "Dine transaktioner importeres nu i baggrunden." });
      window.history.replaceState({}, "", window.location.pathname);
      refreshBankConnections();
    } else if (bankStatus === "error") {
      const reason = params.get("reason") || "";
      toast({ title: "Fejl", description: `Kunne ikke forbinde bank. ${reason}`, variant: "destructive" });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const connectProvider = async (provider: "gmail" | "outlook") => {
    if (!session) return;
    setConnecting(provider);
    try {
      const fnName = provider === "gmail" ? "gmail-auth" : "outlook-auth";
      const { data, error } = await supabase.functions.invoke(fnName);
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast({ title: "Fejl", description: err.message || `Kunne ikke starte ${provider}-forbindelse`, variant: "destructive" });
      setConnecting(null);
    }
  };

  const scanProvider = async (provider: "gmail" | "outlook") => {
    setScanning(provider);
    try {
      const fnName = provider === "gmail" ? "scan-inbox" : "scan-outlook";
      const { data, error } = await supabase.functions.invoke(fnName);
      if (error) throw error;
      toast({
        title: "Scanning fuldført",
        description: `${data?.examined ?? data?.scanned ?? 0} emails gennemgået, ${data?.scanned || 0} lignede kvitteringer, ${data?.imported ?? data?.results?.filter((r: any) => r.status === "imported").length ?? 0} nye bilag importeret.`,
      });
    } catch (err: any) {
      toast({ title: "Fejl", description: err.message || "Scanning fejlede", variant: "destructive" });
    } finally {
      setScanning(null);
    }
  };

  const openBankPicker = async () => {
    setBankDialogOpen(true);
    if (bankOptions.length > 0) return;
    setLoadingBanks(true);
    try {
      const { data, error } = await supabase.functions.invoke("bank-connect", {
        body: { action: "list" },
      });
      if (error) throw error;
      setBankOptions(data?.banks || []);
    } catch (err: any) {
      toast({ title: "Fejl", description: err.message || "Kunne ikke hente bankliste", variant: "destructive" });
      setBankDialogOpen(false);
    } finally {
      setLoadingBanks(false);
    }
  };

  const startBankAuth = async (aspspName: string) => {
    if (!company?.id) return;
    setConnecting("bank");
    try {
      const { data, error } = await supabase.functions.invoke("bank-connect", {
        body: { action: "start", aspsp_name: aspspName, company_id: company.id },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      toast({ title: "Fejl", description: err.message || "Kunne ikke starte bankforbindelse", variant: "destructive" });
      setConnecting(null);
    }
  };

  const syncBank = async () => {
    if (!company?.id) return;
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("bank-sync", {
        body: { company_id: company.id },
      });
      if (error) throw error;
      const total = (data?.synced || []).reduce((s: number, r: any) => s + (r.inserted || 0), 0);
      toast({ title: "Synkronisering fuldført", description: `${total} nye transaktioner importeret.` });
      refreshBankConnections();
    } catch (err: any) {
      toast({ title: "Fejl", description: err.message || "Synkronisering fejlede", variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  const filteredBanks = bankOptions.filter((b) =>
    b.name.toLowerCase().includes(bankFilter.toLowerCase())
  );

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-lg font-semibold">
        Integrationer
      </motion.h1>

      <div className="grid grid-cols-2 gap-4">
        {integrations.map((int, i) => (
          <motion.div
            key={int.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="border border-border/50 rounded p-4 flex gap-4"
          >
            <div className="w-10 h-10 rounded bg-accent flex items-center justify-center shrink-0">
              <int.icon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-semibold">{int.name}</h3>
                <Badge variant="outline" className={`text-[10px] ${statusStyle[int.status]}`}>
                  {int.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-3">{int.description}</p>

              {/* Gmail actions */}
              {int.id === "gmail" && int.status === "ikke-forbundet" && (
                <Button size="sm" variant="outline" className="text-xs" onClick={() => connectProvider("gmail")} disabled={connecting === "gmail"}>
                  {connecting === "gmail" ? <><Loader2 className="h-3 w-3 animate-spin" /> Forbinder...</> : "Forbind Gmail"}
                </Button>
              )}
              {int.id === "gmail" && int.status === "forbundet" && (
                <Button size="sm" variant="outline" className="text-xs" onClick={() => scanProvider("gmail")} disabled={scanning === "gmail"}>
                  {scanning === "gmail" ? <><Loader2 className="h-3 w-3 animate-spin" /> Scanner...</> : "Scan indbakke nu"}
                </Button>
              )}

              {/* Outlook actions */}
              {int.id === "outlook" && int.status === "ikke-forbundet" && (
                <Button size="sm" variant="outline" className="text-xs" onClick={() => connectProvider("outlook")} disabled={connecting === "outlook"}>
                  {connecting === "outlook" ? <><Loader2 className="h-3 w-3 animate-spin" /> Forbinder...</> : "Forbind Outlook"}
                </Button>
              )}
              {int.id === "outlook" && int.status === "forbundet" && (
                <Button size="sm" variant="outline" className="text-xs" onClick={() => scanProvider("outlook")} disabled={scanning === "outlook"}>
                  {scanning === "outlook" ? <><Loader2 className="h-3 w-3 animate-spin" /> Scanner...</> : "Scan indbakke nu"}
                </Button>
              )}

              {/* Bank actions */}
              {int.id === "bank" && int.status === "ikke-forbundet" && (
                <Button size="sm" variant="outline" className="text-xs" onClick={openBankPicker} disabled={connecting === "bank"}>
                  {connecting === "bank" ? <><Loader2 className="h-3 w-3 animate-spin" /> Forbinder...</> : "Forbind bank"}
                </Button>
              )}
              {int.id === "bank" && int.status === "udløbet" && (
                <Button size="sm" variant="outline" className="text-xs" onClick={openBankPicker}>
                  Forny forbindelse
                </Button>
              )}
              {int.id === "bank" && int.status === "forbundet" && (
                <div className="space-y-2">
                  {bankConnections.filter((c) => c.status === "active").map((c) => (
                    <p key={c.id} className="text-[11px] text-muted-foreground font-mono truncate">
                      {c.aspsp_name} · {c.account_name || "Konto"}
                    </p>
                  ))}
                  <Button size="sm" variant="outline" className="text-xs" onClick={syncBank} disabled={syncing}>
                    {syncing ? <><Loader2 className="h-3 w-3 animate-spin" /> Synkroniserer...</> : <><RefreshCw className="h-3 w-3" /> Synk nu</>}
                  </Button>
                </div>
              )}

              {int.id === "csv" && (
                <Button size="sm" variant="outline" className="text-xs gap-1.5" onClick={() => navigate("/import")}>
                  <Upload className="h-3 w-3" /> Importér CSV
                </Button>
              )}
              {int.id === "migrer" && (
                <Button size="sm" variant="outline" className="text-xs gap-1.5" onClick={() => navigate("/migrer")}>
                  <ArrowRightLeft className="h-3 w-3" /> Start migrering
                </Button>
              )}

              {/* Other integrations */}
              {!["gmail", "outlook", "bank", "csv", "migrer"].includes(int.id) && int.status === "ikke-forbundet" && (
                <Button size="sm" variant="outline" className="text-xs">Forbind</Button>
              )}
              {int.status === "kommer-snart" && (
                <span className="text-[10px] text-muted-foreground italic">Under udvikling</span>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Bank picker dialog */}
      <Dialog open={bankDialogOpen} onOpenChange={setBankDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Vælg din bank</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Søg bank..."
            value={bankFilter}
            onChange={(e) => setBankFilter(e.target.value)}
            className="text-sm"
          />
          <div className="max-h-72 overflow-y-auto space-y-1">
            {loadingBanks && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
            {!loadingBanks && filteredBanks.map((bank) => (
              <button
                key={bank.name}
                onClick={() => startBankAuth(bank.name)}
                className="w-full flex items-center gap-3 p-2 rounded hover:bg-accent text-left transition-colors"
              >
                {bank.logo ? (
                  <img src={bank.logo} alt="" className="w-6 h-6 rounded object-contain" />
                ) : (
                  <div className="w-6 h-6 rounded bg-accent" />
                )}
                <span className="text-sm">{bank.name}</span>
              </button>
            ))}
            {!loadingBanks && filteredBanks.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">Ingen banker fundet</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
