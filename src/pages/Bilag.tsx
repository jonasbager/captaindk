import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Copy, Mail, Camera, Upload, QrCode, CheckCircle2, Clock, AlertCircle, Smartphone, Loader2, Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DocumentDetailDialog } from "@/components/DocumentDetailDialog";

const emailAddress = "jonas.bager@bilag.captain.dk";

const statusIcon = {
  behandlet: <CheckCircle2 className="h-3.5 w-3.5 text-primary" />,
  venter: <Clock className="h-3.5 w-3.5 text-warning" />,
  fejlet: <AlertCircle className="h-3.5 w-3.5 text-destructive" />,
};

type Provider = "gmail" | "outlook";

interface ConnectionState {
  connected: boolean;
  connectedAt: string | null;
  lastScanAt: string | null;
}

const initialConn: ConnectionState = { connected: false, connectedAt: null, lastScanAt: null };

function formatRelative(iso: string | null): string {
  if (!iso) return "aldrig";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "lige nu";
  if (mins < 60) return `for ${mins} min siden`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `for ${hours} t siden`;
  const days = Math.floor(hours / 24);
  return `for ${days} d siden`;
}

export default function Bilag() {
  const { toast } = useToast();
  const { session } = useAuth();
  const [dragOver, setDragOver] = useState(false);
  const [connections, setConnections] = useState<Record<Provider, ConnectionState>>({
    gmail: initialConn,
    outlook: initialConn,
  });
  const [scanning, setScanning] = useState<Provider | null>(null);
  const [connecting, setConnecting] = useState<Provider | null>(null);
  const [recentDocs, setRecentDocs] = useState<Array<{ id: string; vendor: string; date: string | null; status: string; source: string; ocr_status: string }>>([]);
  const [openDocId, setOpenDocId] = useState<string | null>(null);

  const loadDocs = useCallback(() => {
    supabase
      .from("documents")
      .select("id, vendor, date, status, source, ocr_status")
      .in("source", ["gmail", "outlook"])
      .order("created_at", { ascending: false })
      .limit(10)
      .then(({ data }) => {
        if (data) setRecentDocs(data as any);
      });
  }, []);

  const loadConnections = useCallback(async () => {
    if (!session?.user) return;
    const { data } = await supabase
      .from("email_connections")
      .select("provider, connected_at, updated_at, last_scanned_at")
      .eq("user_id", session.user.id);
    if (!data) return;
    const next: Record<Provider, ConnectionState> = { gmail: initialConn, outlook: initialConn };
    for (const row of data) {
      const p = row.provider as Provider;
      if (p === "gmail" || p === "outlook") {
        next[p] = {
          connected: true,
          connectedAt: row.connected_at,
          lastScanAt: (row as any).last_scanned_at || null,
        };
      }
    }
    setConnections(next);
  }, [session]);

  useEffect(() => {
    if (!session?.user) return;
    loadConnections();
    loadDocs();
  }, [session, loadConnections, loadDocs]);

  const copyEmail = () => {
    navigator.clipboard.writeText(emailAddress);
    toast({ title: "Kopieret", description: "Email-adresse kopieret til udklipsholder" });
  };

  const connectProvider = async (provider: Provider) => {
    setConnecting(provider);
    try {
      const { data, error } = await supabase.functions.invoke(`${provider}-auth`);
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      toast({ title: "Fejl", description: err.message || `Kunne ikke starte ${provider}-forbindelse`, variant: "destructive" });
      setConnecting(null);
    }
  };

  const scanProvider = async (provider: Provider, mode: "incremental" | "full" = "incremental") => {
    setScanning(provider);
    try {
      const fnName = provider === "gmail" ? "scan-inbox" : "scan-outlook";
      const { data, error } = await supabase.functions.invoke(fnName, { body: { mode } });
      if (error) throw error;
      const imported = data?.imported ?? 0;
      const scanned = data?.scanned ?? 0;
      const label = provider === "gmail" ? "Gmail" : "Outlook";
      toast({
        title: "Scan færdig",
        description: `${label}: ${scanned} mail(s) gennemset, ${imported} nye bilag importeret`,
      });
      await loadConnections();
      loadDocs();
    } catch (err: any) {
      toast({ title: "Scan fejlede", description: err.message || "Ukendt fejl", variant: "destructive" });
    } finally {
      setScanning(null);
    }
  };

  const renderProviderButton = (provider: Provider, label: string) => {
    const conn = connections[provider];
    if (!conn.connected) {
      return (
        <Button
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={() => connectProvider(provider)}
          disabled={connecting === provider}
        >
          {connecting === provider ? (
            <><Loader2 className="h-3 w-3 animate-spin mr-1" /> Forbinder...</>
          ) : (
            `Forbind ${label}`
          )}
        </Button>
      );
    }
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs text-primary">
          <CheckCircle2 className="h-4 w-4" />
          {label} forbundet
        </div>
        <Button
          variant="outline"
          size="sm"
          className="text-xs gap-1.5"
          onClick={() => scanProvider(provider, "incremental")}
          disabled={scanning === provider}
        >
          {scanning === provider ? (
            <><Loader2 className="h-3 w-3 animate-spin" /> Scanner...</>
          ) : (
            <><RefreshCw className="h-3 w-3" /> Scan nye</>
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs"
          onClick={() => scanProvider(provider, "full")}
          disabled={scanning === provider}
          title="Scan de seneste 90 dage — brug hvis du har tilføjet nye søgeord eller vil have ældre bilag med"
        >
          Scan 90 dage
        </Button>
        <span className="text-xs text-muted-foreground">Sidst scannet {formatRelative(conn.lastScanAt)}</span>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-lg font-semibold">
        Bilag-indsamling
      </motion.h1>

      <div className="grid grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="border border-border/50 rounded p-4 space-y-4 col-span-2"
        >
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Email-forwarding</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Videresend eller send dine kvitteringer direkte til denne adresse. Systemet ekstraherer automatisk beløb, dato og leverandør.
          </p>
          <div className="flex items-center gap-2 bg-background border border-border/40 rounded p-3">
            <span className="font-mono text-sm flex-1 select-all">{emailAddress}</span>
            <Button size="sm" variant="outline" className="text-xs gap-1.5" onClick={copyEmail}>
              <Copy className="h-3 w-3" /> Kopier
            </Button>
          </div>

          {recentDocs.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Seneste email-bilag — klik for detaljer</p>
              <div className="space-y-1.5">
                {recentDocs.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => setOpenDocId(doc.id)}
                    className="w-full flex items-center gap-3 text-xs p-2 rounded hover:bg-accent/30 transition-colors text-left"
                  >
                    {statusIcon[doc.status as keyof typeof statusIcon] || statusIcon.venter}
                    <span className="text-muted-foreground truncate flex-1">{doc.vendor || "Ukendt"}</span>
                    {doc.ocr_status === "processing" && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                    {doc.ocr_status === "done" && <Sparkles className="h-3 w-3 text-primary" />}
                    <span className="text-muted-foreground">{doc.date || "—"}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="border border-border/50 rounded p-4 space-y-4 flex flex-col items-center justify-center text-center"
        >
          <Smartphone className="h-8 w-8 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Mobil-scanner</h2>
          <p className="text-xs text-muted-foreground">
            Scan kvitteringer med din telefon. Åbn /snap på mobilen eller scan QR-koden.
          </p>
          <div className="w-24 h-24 bg-foreground/10 rounded flex items-center justify-center">
            <QrCode className="h-12 w-12 text-muted-foreground" />
          </div>
          <Button variant="outline" size="sm" className="text-xs gap-1.5" asChild>
            <a href="/snap"><Camera className="h-3 w-3" /> Åbn scanner</a>
          </Button>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="border border-border/50 rounded p-4 space-y-3"
      >
        <h2 className="text-sm font-semibold">Email-integration</h2>
        <p className="text-xs text-muted-foreground">
          Forbind din email-konto så systemet automatisk finder kvitteringer.
        </p>
        <div className="flex flex-col gap-2">
          {renderProviderButton("gmail", "Gmail")}
          {renderProviderButton("outlook", "Outlook")}
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className={`border-2 border-dashed rounded p-12 text-center transition-colors ${
          dragOver ? "border-primary bg-primary/5" : "border-border/40"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); }}
      >
        <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground mb-1">Træk filer hertil eller klik for at uploade</p>
        <p className="text-xs text-muted-foreground">Billeder, PDF'er — multiple filer ad gangen</p>
      </motion.div>

      <DocumentDetailDialog
        documentId={openDocId}
        open={!!openDocId}
        onOpenChange={(o) => !o && setOpenDocId(null)}
        onDeleted={loadDocs}
        onUpdated={loadDocs}
      />
    </div>
  );
}
