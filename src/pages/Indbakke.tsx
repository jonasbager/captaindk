import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, FileText, CreditCard, Sparkles, GripVertical } from "lucide-react";
import { unmatchedDocuments as initialDocs, unmatchedTransactions as initialTxs, matchSuggestions as initialSuggestions, formatAmount } from "@/lib/demo-data";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export default function Indbakke() {
  const [suggestions, setSuggestions] = useState(initialSuggestions);
  const [documents, setDocuments] = useState(initialDocs);
  const [transactions, setTransactions] = useState(initialTxs);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [processed, setProcessed] = useState(0);
  const total = initialSuggestions.length;

  // Drag state
  const [draggedDocId, setDraggedDocId] = useState<string | null>(null);
  const [dragOverTxId, setDragOverTxId] = useState<string | null>(null);
  const [manualMatches, setManualMatches] = useState<{ docId: string; txId: string; vendor: string; amount: number }[]>([]);

  const handleApprove = useCallback(() => {
    if (suggestions.length === 0) return;
    const match = suggestions[selectedIndex];
    if (!match) return;
    setSuggestions((prev) => prev.filter((_, i) => i !== selectedIndex));
    setDocuments((prev) => prev.filter((d) => d.id !== match.documentId));
    setTransactions((prev) => prev.filter((t) => t.id !== match.transactionId));
    setProcessed((p) => p + 1);
    setSelectedIndex((i) => Math.min(i, suggestions.length - 2));
  }, [selectedIndex, suggestions]);

  const handleReject = useCallback(() => {
    if (suggestions.length === 0) return;
    setSuggestions((prev) => prev.filter((_, i) => i !== selectedIndex));
    setProcessed((p) => p + 1);
    setSelectedIndex((i) => Math.min(i, suggestions.length - 2));
  }, [selectedIndex, suggestions]);

  // Manual drag-and-drop matching
  const handleDrop = useCallback((txId: string) => {
    if (!draggedDocId) return;
    const doc = documents.find((d) => d.id === draggedDocId);
    if (!doc) return;
    setDocuments((prev) => prev.filter((d) => d.id !== draggedDocId));
    setTransactions((prev) => prev.filter((t) => t.id !== txId));
    setManualMatches((prev) => [...prev, { docId: draggedDocId, txId, vendor: doc.vendor, amount: doc.amount }]);
    setDraggedDocId(null);
    setDragOverTxId(null);
  }, [draggedDocId, documents]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === " " && suggestions.length > 0) { e.preventDefault(); handleApprove(); }
      if (e.key === "x" && suggestions.length > 0) { handleReject(); }
      if (e.key === "ArrowDown") { setSelectedIndex((i) => Math.min(i + 1, suggestions.length - 1)); }
      if (e.key === "ArrowUp") { setSelectedIndex((i) => Math.max(i - 1, 0)); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleApprove, handleReject, suggestions.length]);

  return (
    <div className="h-[calc(100vh-2.75rem)] flex flex-col">
      {/* Progress bar */}
      <div className="px-6 pt-4 pb-2 border-b border-border/30">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-sm font-semibold">Indbakke</h1>
          <span className="text-xs font-mono text-muted-foreground">{processed} af {total} forslag behandlet</span>
        </div>
        <Progress value={(processed / total) * 100} className="h-1" />
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
                  className={`border border-border/40 rounded p-3 hover:border-border/70 transition-colors cursor-grab active:cursor-grabbing ${
                    draggedDocId === doc.id ? "opacity-50" : ""
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <GripVertical className="h-3 w-3 text-muted-foreground/50" />
                      <span className="text-sm font-medium">{doc.vendor}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground uppercase">{doc.type}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground font-mono">{doc.date}</span>
                    <span className="text-sm font-mono">{formatAmount(doc.amount)}</span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Col 2: Transactions */}
        <div className="overflow-auto p-4">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="h-4 w-4 text-destructive" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Transaktioner uden bilag <span className="text-foreground">({transactions.length})</span>
            </h2>
          </div>
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
                    dragOverTxId === tx.id
                      ? "border-primary/60 bg-primary/5"
                      : "border-border/40 hover:border-border/70"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground font-mono">{tx.date}</span>
                    <span className={`text-sm font-mono ${tx.amount >= 0 ? "text-primary" : ""}`}>
                      {formatAmount(tx.amount)}
                    </span>
                  </div>
                  <p className="text-sm truncate">{tx.description}</p>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          {/* Manual matches */}
          {manualMatches.length > 0 && (
            <div className="mt-4 pt-3 border-t border-border/30">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Manuelt matchet</p>
              {manualMatches.map((m, i) => (
                <div key={i} className="text-xs text-primary flex items-center gap-1.5 mb-1">
                  <Check className="h-3 w-3" />
                  <span>{m.vendor} — {formatAmount(m.amount)}</span>
                </div>
              ))}
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
          <p className="text-[10px] text-muted-foreground mb-3 font-mono">
            Mellemrum = godkend · X = afvis · ↑↓ = navigér
          </p>
          <div className="space-y-2">
            <AnimatePresence>
              {suggestions.map((match, i) => (
                <motion.div
                  key={match.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, height: 0, marginBottom: 0, padding: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`border rounded p-3 transition-colors ${
                    i === selectedIndex ? "border-primary/60 bg-primary/5" : "border-border/40"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{match.vendor}</span>
                    <span className="text-[10px] font-mono text-primary">
                      {match.confidence}% match
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1 mb-2">
                    <p>Bilag: {match.documentDate} · {formatAmount(match.amount)}</p>
                    <p>Transaktion: {match.transactionDate} · {formatAmount(match.amount)}</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground mb-3">{match.reason}</p>
                  <div className="flex gap-2">
                    <Button size="sm" className="h-7 text-xs gap-1" onClick={handleApprove}>
                      <Check className="h-3 w-3" /> Godkend
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handleReject}>
                      <X className="h-3 w-3" /> Afvis
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {suggestions.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Alle forslag er behandlet ✓
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
