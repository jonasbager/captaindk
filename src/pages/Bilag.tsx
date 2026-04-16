import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Mail, Camera, Upload, QrCode, CheckCircle2, Clock, AlertCircle, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const emailAddress = "jonas.bager@bilag.bogforing.dk";

const recentEmails = [
  { id: 1, from: "noreply@elgiganten.dk", subject: "Din kvittering fra Elgiganten", status: "behandlet" as const },
  { id: 2, from: "invoice@adobe.com", subject: "Invoice #INV-2025-8841", status: "behandlet" as const },
  { id: 3, from: "kvittering@dsb.dk", subject: "Rejsekvittering", status: "behandlet" as const },
  { id: 4, from: "receipt@wolt.com", subject: "Your Wolt receipt", status: "venter" as const },
  { id: 5, from: "order@amazon.de", subject: "Ihre Rechnung", status: "fejlet" as const },
];

const statusIcon = {
  behandlet: <CheckCircle2 className="h-3.5 w-3.5 text-primary" />,
  venter: <Clock className="h-3.5 w-3.5 text-warning" />,
  fejlet: <AlertCircle className="h-3.5 w-3.5 text-destructive" />,
};

export default function Bilag() {
  const { toast } = useToast();
  const [dragOver, setDragOver] = useState(false);

  const copyEmail = () => {
    navigator.clipboard.writeText(emailAddress);
    toast({ title: "Kopieret", description: "Email-adresse kopieret til udklipsholder" });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-lg font-semibold">
        Bilag-indsamling
      </motion.h1>

      <div className="grid grid-cols-3 gap-4">
        {/* Email forwarding */}
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

          {/* Recent emails */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Seneste modtagne emails</p>
            <div className="space-y-1.5">
              {recentEmails.map((email) => (
                <div key={email.id} className="flex items-center gap-3 text-xs p-2 rounded hover:bg-accent/30 transition-colors">
                  {statusIcon[email.status]}
                  <span className="text-muted-foreground font-mono w-40 truncate">{email.from}</span>
                  <span className="flex-1 truncate">{email.subject}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Mobile scanner QR */}
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

      {/* Gmail/Outlook */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="border border-border/50 rounded p-4 space-y-3"
      >
        <h2 className="text-sm font-semibold">Email-integration</h2>
        <p className="text-xs text-muted-foreground">
          Forbind din email-konto så systemet automatisk finder kvitteringer. Vi søger kun efter emails med "kvittering", "receipt", "faktura" eller "invoice" i emnet.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" className="text-xs">Forbind Gmail</Button>
          <Button variant="outline" size="sm" className="text-xs">Forbind Outlook</Button>
        </div>
      </motion.div>

      {/* Drag and drop */}
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
    </div>
  );
}
