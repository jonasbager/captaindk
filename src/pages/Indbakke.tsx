import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, X, FileText, CreditCard, Sparkles } from "lucide-react";
import { unmatchedDocuments, unmatchedTransactions, matchSuggestions, formatAmount } from "@/lib/demo-data";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export default function Indbakke() {
  const [suggestions, setSuggestions] = useState(matchSuggestions);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [processed, setProcessed] = useState(0);
  const total = matchSuggestions.length;

  const handleApprove = useCallback(() => {
    setSuggestions((prev) => prev.filter((_, i) => i !== selectedIndex));
    setProcessed((p) => p + 1);
    setSelectedIndex((i) => Math.min(i, suggestions.length - 2));
  }, [selectedIndex, suggestions.length]);

  const handleReject = useCallback(() => {
    setSuggestions((prev) => prev.filter((_, i) => i !== selectedIndex));
    setProcessed((p) => p + 1);
    setSelectedIndex((i) => Math.min(i, suggestions.length - 2));
  }, [selectedIndex, suggestions.length]);

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

      <div className="flex-1 grid grid-cols-3 divide-x divide-border/30 overflow-hidden">
        {/* Col 1: Documents */}
        <div className="overflow-auto p-4">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="h-4 w-4 text-warning" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Bilag uden match <span className="text-foreground">({unmatchedDocuments.length})</span>
            </h2>
          </div>
          <div className="space-y-2">
            {unmatchedDocuments.map((doc, i) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="border border-border/40 rounded p-3 hover:border-border/70 transition-colors cursor-grab"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{doc.vendor}</span>
                  <span className="text-[10px] text-muted-foreground uppercase">{doc.type}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-mono">{doc.date}</span>
                  <span className="text-sm font-mono">{formatAmount(doc.amount)}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Col 2: Transactions */}
        <div className="overflow-auto p-4">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="h-4 w-4 text-destructive" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Transaktioner uden bilag <span className="text-foreground">({unmatchedTransactions.length})</span>
            </h2>
          </div>
          <div className="space-y-2">
            {unmatchedTransactions.map((tx, i) => (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="border border-border/40 rounded p-3 hover:border-border/70 transition-colors"
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
          </div>
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
            {suggestions.map((match, i) => (
              <motion.div
                key={match.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
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
