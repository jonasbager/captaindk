import { useState } from "react";
import { motion } from "framer-motion";
import { Upload, FileSpreadsheet, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatAmount } from "@/lib/demo-data";

const previewRows = [
  { date: "2025-04-01", text: "IKEA AARHUS", amount: -3450 },
  { date: "2025-04-03", text: "AMAZON EU SARL", amount: -799 },
  { date: "2025-04-05", text: "MOBILEPAY SEND", amount: -385 },
  { date: "2025-04-06", text: "WOLT TECHNOLOGY", amount: -187 },
  { date: "2025-04-07", text: "OVERFØRSEL FRA KUNDE", amount: 45000 },
];

export default function Import() {
  const [uploaded, setUploaded] = useState(false);
  const [source, setSource] = useState("lunar");

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-lg font-semibold">
        CSV Import
      </motion.h1>

      {!uploaded ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-2 border-dashed border-border/40 rounded p-16 text-center cursor-pointer hover:border-border/60 transition-colors"
          onClick={() => setUploaded(true)}
        >
          <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-1">Træk en CSV-fil hertil eller klik for at uploade</p>
          <p className="text-xs text-muted-foreground">Understøtter Lunar, Nordea, Danske Bank, Pleo m.fl.</p>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="flex items-center gap-3 p-3 border border-border/50 rounded">
            <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm font-medium">banktransaktioner_april.csv</p>
              <p className="text-xs text-muted-foreground">23 rækker · 4 kolonner</p>
            </div>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lunar">Lunar</SelectItem>
                <SelectItem value="nordea">Nordea</SelectItem>
                <SelectItem value="danske">Danske Bank</SelectItem>
                <SelectItem value="pleo">Pleo</SelectItem>
                <SelectItem value="andet">Andet</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Column mapping */}
          <div className="border border-border/50 rounded p-4 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">AI-kolonnemapping</h3>
            <div className="grid grid-cols-4 gap-3 text-xs">
              {["Dato → date", "Tekst → text", "Beløb → amount", "Saldo → balance"].map((m) => (
                <div key={m} className="flex items-center gap-1.5 text-muted-foreground">
                  <Check className="h-3 w-3 text-primary" />
                  <span className="font-mono">{m}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="border border-border/50 rounded overflow-hidden">
            <div className="p-3 border-b border-border/30">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Preview — første 5 rækker</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/20 text-xs text-muted-foreground">
                  <th className="text-left p-3 font-medium">Dato</th>
                  <th className="text-left p-3 font-medium">Tekst</th>
                  <th className="text-right p-3 font-medium">Beløb</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, i) => (
                  <tr key={i} className="border-b border-border/10">
                    <td className="p-3 font-mono text-xs text-muted-foreground">{row.date}</td>
                    <td className="p-3">{row.text}</td>
                    <td className={`p-3 text-right font-mono ${row.amount >= 0 ? "text-primary" : ""}`}>{formatAmount(row.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between p-3 border border-border/50 rounded bg-card">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-info" />
              <span className="text-sm">23 transaktioner klar. 19 automatisk konteret, 4 kræver godkendelse.</span>
            </div>
            <Button size="sm" className="text-xs">Importér</Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
