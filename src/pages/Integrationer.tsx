import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Mail, CreditCard, Plug, Building2, Receipt, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  status: "forbundet" | "ikke-forbundet" | "kommer-snart";
  provider?: string;
}

const baseIntegrations: Integration[] = [
  { id: "gmail", name: "Gmail", description: "Automatisk scanning af kvitteringer i din Gmail-indbakke", icon: Mail, status: "ikke-forbundet", provider: "gmail" },
  { id: "outlook", name: "Microsoft 365 / Outlook", description: "Find kvitteringer og fakturaer i Outlook automatisk", icon: Mail, status: "kommer-snart" },
  { id: "aiia", name: "Bank (Aiia/PSD2)", description: "Automatisk import af banktransaktioner fra din bank", icon: CreditCard, status: "kommer-snart" },
  { id: "pleo", name: "Pleo", description: "CSV-import nu, API-integration i v2", icon: Receipt, status: "ikke-forbundet" },
  { id: "booksmate", name: "Booksmate", description: "Del dit regnskab direkte med din revisor", icon: Plug, status: "kommer-snart" },
  { id: "skat", name: "SKAT TastSelv", description: "Automatisk indberetning af oplysningsskema til SKAT", icon: Building2, status: "kommer-snart" },
];

const statusStyle: Record<string, string> = {
  forbundet: "bg-primary/15 text-primary border-primary/20",
  "ikke-forbundet": "bg-muted text-muted-foreground border-border/30",
  "kommer-snart": "bg-accent text-muted-foreground border-border/30",
};

export default function Integrationer() {
  const { toast } = useToast();
  const { session } = useAuth();
  const [integrations, setIntegrations] = useState<Integration[]>(baseIntegrations);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  // Check for connected providers
  useEffect(() => {
    if (!session?.user) return;

    const checkConnections = async () => {
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

    checkConnections();
  }, [session]);

  // Check URL params for callback result
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gmailStatus = params.get("gmail");
    if (gmailStatus === "success") {
      toast({ title: "Gmail forbundet", description: "Din Gmail-konto er nu forbundet til Captain." });
      window.history.replaceState({}, "", window.location.pathname);
      // Re-check connections
      if (session?.user) {
        supabase
          .from("email_connections")
          .select("provider")
          .eq("user_id", session.user.id)
          .then(({ data }) => {
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
          });
      }
    } else if (gmailStatus === "error") {
      toast({ title: "Fejl", description: "Kunne ikke forbinde Gmail. Prøv igen.", variant: "destructive" });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const connectGmail = async () => {
    if (!session) return;
    setConnecting("gmail");
    try {
      const { data, error } = await supabase.functions.invoke("gmail-auth");
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast({ title: "Fejl", description: err.message || "Kunne ikke starte Gmail-forbindelse", variant: "destructive" });
      setConnecting(null);
    }
  };

  const scanInbox = async () => {
    setScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke("scan-inbox");
      if (error) throw error;
      toast({
        title: "Scanning fuldført",
        description: `${data?.scanned || 0} emails scannet, ${data?.results?.filter((r: any) => r.status === "imported").length || 0} nye bilag importeret.`,
      });
    } catch (err: any) {
      toast({ title: "Fejl", description: err.message || "Scanning fejlede", variant: "destructive" });
    } finally {
      setScanning(false);
    }
  };

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
              {int.id === "gmail" && int.status === "ikke-forbundet" && (
                <Button size="sm" variant="outline" className="text-xs" onClick={connectGmail} disabled={connecting === "gmail"}>
                  {connecting === "gmail" ? <><Loader2 className="h-3 w-3 animate-spin" /> Forbinder...</> : "Forbind Gmail"}
                </Button>
              )}
              {int.id === "gmail" && int.status === "forbundet" && (
                <Button size="sm" variant="outline" className="text-xs" onClick={scanInbox} disabled={scanning}>
                  {scanning ? <><Loader2 className="h-3 w-3 animate-spin" /> Scanner...</> : "Scan indbakke nu"}
                </Button>
              )}
              {int.id !== "gmail" && int.status === "ikke-forbundet" && (
                <Button size="sm" variant="outline" className="text-xs">Forbind</Button>
              )}
              {int.status === "kommer-snart" && (
                <span className="text-[10px] text-muted-foreground italic">Under udvikling</span>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
