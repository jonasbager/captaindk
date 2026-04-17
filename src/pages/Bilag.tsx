import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Copy, Mail, Camera, Upload, QrCode, CheckCircle2, Clock, AlertCircle, Smartphone, Loader2, Sparkles } from "lucide-react";
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

export default function Bilag() {
  const { toast } = useToast();
  const { session } = useAuth();
  const [dragOver, setDragOver] = useState(false);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
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

  useEffect(() => {
    if (!session?.user) return;
    supabase
      .from("email_connections")
      .select("id")
      .eq("user_id", session.user.id)
      .eq("provider", "gmail")
      .single()
      .then(({ data }) => setGmailConnected(!!data));
    loadDocs();
  }, [session, loadDocs]);

  const copyEmail = () => {
    navigator.clipboard.writeText(emailAddress);
    toast({ title: "Kopieret", description: "Email-adresse kopieret til udklipsholder" });
  };

  const connectGmail = async () => {
    setConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke("gmail-auth");
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      toast({ title: "Fejl", description: err.message || "Kunne ikke starte Gmail-forbindelse", variant: "destructive" });
      setConnecting(false);
    }
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
        <div className="flex gap-3">
          {gmailConnected ? (
            <div className="flex items-center gap-2 text-xs text-primary">
              <CheckCircle2 className="h-4 w-4" />
              Gmail forbundet
            </div>
          ) : (
            <Button variant="outline" size="sm" className="text-xs" onClick={connectGmail} disabled={connecting}>
              {connecting ? <><Loader2 className="h-3 w-3 animate-spin" /> Forbinder...</> : "Forbind Gmail"}
            </Button>
          )}
          <Button variant="outline" size="sm" className="text-xs" disabled>Forbind Outlook (kommer snart)</Button>
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
