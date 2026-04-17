import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, FileText, CreditCard, Sparkles, GripVertical, Anchor, Inbox } from "lucide-react";
import { formatAmount } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";

interface DocRow {
  id: string;
  vendor: string | null;
  amount: number | null;
  date: string | null;
  source: string;
}

interface TxRow {
  id: string;
  date: string;
  description: string;
  amount: number;
}

export default function Indbakke() {
  const { company } = useCompany();
  const [documents, setDocuments] = useState<DocRow[]>([]);
  const [transactions, setTransactions] = useState<TxRow[]>([]);
  const suggestions: any[] = []; // No AI matching yet — only show real DB data
  const [selectedIndex] = useState(0);
  const [processed] = useState(0);
  const total = suggestions.length;

  const [draggedDocId, setDraggedDocId] = useState<string | null>(null);
  const [dragOverTxId, setDragOverTxId] = useState<string | null>(null);

  useEffect(() => {
    if (!company) return;

    supabase
      .from("documents")
      .select("id, vendor, amount, date, source")
      .eq("company_id", company.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setDocuments(data as DocRow[]);
      });

    supabase
      .from("transactions")
      .select("id, date, description, amount")
      .eq("company_id", company.id)
      .is("matched_document_id", null)
      .order("date", { ascending: false })
      .then(({ data }) => {
        if (data) setTransactions(data as TxRow[]);
      });
  }, [company]);

  const handleDrop = useCallback((_txId: string) => {
    // Manual matching not yet wired to DB
    setDraggedDocId(null);
    setDragOverTxId(null);
  }, []);

  return (
    <div className="h-[calc(100vh-2.75rem)] flex flex-col">
      <div className="px-6 pt-4 pb-2 border-b border-border/30">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-sm font-semibold">Indbakke</h1>
          <span className="text-xs font-mono text-muted-foreground">{processed} af {total} forslag behandlet</span>
        </div>
        <Progress value={total > 0 ? (processed / total) * 100 : 0} className="h-1" />
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border/30 overflow-hidden">
        {/* Col 1: Documents */}
        <div className="overflow-auto p-4">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="h-4 w-4 text-warning" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Bilag uden match <span className="text-foreground">({documents.length})</span>
            </h2>
          </div>
          {documents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Inbox className="h-6 w-6 mx-auto mb-2 opacity-40" />
              <p className="text-xs">Ingen bilag</p>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {documents.map((doc) => (
                  <motion.div
                    key={doc.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0, padding: 0 }}
                    transition={{ duration: 0.2 }}
                    draggable
                    onDragStart={() => setDraggedDocId(doc.id)}
                    onDragEnd={() => { setDraggedDocId(null); setDragOverTxId(null); }}
                    className={`border rounded p-3 transition-colors cursor-grab active:cursor-grabbing ${
                      draggedDocId === doc.id ? "opacity-50" : "border-border/40 hover:border-border/70"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <GripVertical className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                        <span className="text-sm font-medium truncate">{doc.vendor || "Ukendt"}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground uppercase shrink-0 ml-2">{doc.source}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground font-mono">{doc.date || "—"}</span>
                      <span className="text-sm font-mono">
                        {doc.amount != null ? formatAmount(Number(doc.amount)) : "—"}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Col 2: Transactions */}
        <div className="overflow-auto p-4">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="h-4 w-4 text-destructive" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Transaktioner uden bilag <span className="text-foreground">({transactions.length})</span>
            </h2>
          </div>
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Inbox className="h-6 w-6 mx-auto mb-2 opacity-40" />
              <p className="text-xs">Ingen transaktioner</p>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {transactions.map((tx) => (
                  <motion.div
                    key={tx.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0, padding: 0 }}
                    transition={{ duration: 0.2 }}
                    onDragOver={(e) => { e.preventDefault(); setDragOverTxId(tx.id); }}
                    onDragLeave={() => setDragOverTxId(null)}
                    onDrop={(e) => { e.preventDefault(); handleDrop(tx.id); }}
                    className={`border rounded p-3 transition-colors ${
                      dragOverTxId === tx.id ? "border-primary/60 bg-primary/5" : "border-border/40 hover:border-border/70"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground font-mono">{tx.date}</span>
                      <span className={`text-sm font-mono ${Number(tx.amount) >= 0 ? "text-primary" : ""}`}>
                        {formatAmount(Number(tx.amount))}
                      </span>
                    </div>
                    <p className="text-sm truncate">{tx.description}</p>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Col 3: AI suggestions */}
        <div className="overflow-auto p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-info" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              AI-forslag <span className="text-foreground">({suggestions.length})</span>
            </h2>
          </div>
          <div className="text-center py-12 text-muted-foreground">
            <Anchor className="h-8 w-8 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Ingen forslag endnu</p>
            <p className="text-xs mt-1">AI-matching kommer snart ⚓</p>
          </div>
        </div>
      </div>
    </div>
  );
}
