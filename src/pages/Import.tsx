import { useState } from "react";
import { motion } from "framer-motion";
import { Upload, FileSpreadsheet, Check, AlertCircle, ChevronRight, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatAmount } from "@/lib/format";

const previewRows = [
  { col1: "2026-04-01", col2: "IKEA AARHUS", col3: "-3450.00", col4: "DKK", col5: "123456" },
  { col1: "2026-04-03", col2: "AMAZON EU SARL", col3: "-799.00", col4: "DKK", col5: "123457" },
  { col1: "2026-04-05", col2: "MOBILEPAY SEND", col3: "-385.00", col4: "DKK", col5: "123458" },
  { col1: "2026-04-06", col2: "WOLT TECHNOLOGY", col3: "-187.00", col4: "DKK", col5: "123459" },
  { col1: "2026-04-07", col2: "OVERFØRSEL FRA KUNDE", col3: "45000.00", col4: "DKK", col5: "123460" },
];

const columnOptions = ["Dato", "Beskrivelse", "Beløb", "Valuta", "Kategori", "Reference", "Ignorer"];
const defaultMapping = ["Dato", "Beskrivelse", "Beløb", "Valuta", "Reference"];

const needsApproval = [
  { id: 1, date: "2026-04-01", description: "IKEA AARHUS", amount: -3450, suggestedAccount: "3615 — Småanskaffelser", aiReason: "Beløb og leverandør tyder på indkøb af inventar/småanskaffelser" },
  { id: 2, date: "2026-04-05", description: "MOBILEPAY SEND", amount: -385, suggestedAccount: "3670 — Repræsentation", aiReason: "MobilePay-betalinger i dette beløbsleje er typisk repræsentation" },
  { id: 3, date: "2026-04-06", description: "WOLT TECHNOLOGY", amount: -187, suggestedAccount: "3670 — Repræsentation", aiReason: "Wolt-udgifter konteres normalt som repræsentation" },
  { id: 4, date: "2026-04-11", description: "STRIPE PAYMENT", amount: -249, suggestedAccount: "3630 — Software", aiReason: "Stripe-betalinger er typisk software-abonnementer" },
];

export default function Import() {
  const [step, setStep] = useState(1);
  const [source, setSource] = useState("lunar");
  const [mapping, setMapping] = useState(defaultMapping);
  const [approved, setApproved] = useState<Set<number>>(new Set());

  const updateMapping = (index: number, value: string) => {
    setMapping((prev) => prev.map((v, i) => i === index ? value : v));
  };

  const approveItem = (id: number) => {
    setApproved((prev) => new Set([...prev, id]));
  };

  const approveAll = () => {
    setApproved(new Set(needsApproval.map((n) => n.id)));
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-lg font-semibold">
        CSV Import
      </motion.h1>

      {/* Step indicators */}
      <div className="flex items-center gap-2 text-xs">
        {["Upload", "Preview & Mapping", "Godkend"].map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
            <span className={`px-2 py-1 rounded font-medium ${
              step === i + 1 ? "bg-primary/20 text-primary" : step > i + 1 ? "text-primary" : "text-muted-foreground"
            }`}>
              {i + 1}. {label}
            </span>
          </div>
        ))}
      </div>

      {step === 1 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-2 border-dashed border-border/40 rounded p-16 text-center cursor-pointer hover:border-border/60 transition-colors"
          onClick={() => setStep(2)}
        >
          <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-1">Træk en CSV-fil hertil eller klik for at uploade</p>
          <p className="text-xs text-muted-foreground">Understøtter Lunar, Nordea, Danske Bank, Pleo m.fl.</p>
        </motion.div>
      )}

      {step === 2 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="flex items-center gap-3 p-3 border border-border/50 rounded">
            <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm font-medium">banktransaktioner_april.csv</p>
              <p className="text-xs text-muted-foreground">23 rækker · 5 kolonner</p>
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
                <SelectItem value="wise">Wise</SelectItem>
                <SelectItem value="andet">Andet</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="border border-border/50 rounded p-4 space-y-3">
            <p className="text-xs text-muted-foreground">
              AI har identificeret følgende kolonner. Ret hvis nødvendigt.
            </p>
          </div>

          <div className="border border-border/50 rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/20 text-xs text-muted-foreground">
                  {mapping.map((col, i) => (
                    <th key={i} className="p-2">
                      <Select value={col} onValueChange={(v) => updateMapping(i, v)}>
                        <SelectTrigger className="h-7 text-xs border-dashed">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {columnOptions.map((opt) => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, i) => (
                  <tr key={i} className="border-b border-border/10 text-xs">
                    <td className="p-2 font-mono text-muted-foreground">{row.col1}</td>
                    <td className="p-2">{row.col2}</td>
                    <td className={`p-2 font-mono ${parseFloat(row.col3) >= 0 ? "text-primary" : ""}`}>{row.col3}</td>
                    <td className="p-2 text-muted-foreground">{row.col4}</td>
                    <td className="p-2 font-mono text-muted-foreground">{row.col5}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <Button size="sm" className="text-xs" onClick={() => setStep(3)}>
              Næste <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </motion.div>
      )}

      {step === 3 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="flex items-center justify-between p-3 border border-border/50 rounded bg-card">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-info" />
              <span className="text-sm">23 transaktioner fundet. 19 automatisk konteret, <span className="text-warning font-medium">4 kræver din godkendelse</span>.</span>
            </div>
            <Button size="sm" className="text-xs" onClick={approveAll}>Godkend alle</Button>
          </div>

          <div className="space-y-3">
            {needsApproval.map((item) => {
              const isApproved = approved.has(item.id);
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`border rounded p-4 space-y-2 transition-colors ${
                    isApproved ? "border-primary/40 bg-primary/5" : "border-border/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium">{item.description}</span>
                      <span className="text-xs text-muted-foreground font-mono ml-3">{item.date}</span>
                    </div>
                    <span className={`font-mono text-sm ${item.amount >= 0 ? "text-primary" : ""}`}>
                      {formatAmount(item.amount)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Foreslået konto:</span>
                    <Badge variant="outline" className="text-[10px] bg-info/10 text-info border-info/20">
                      {item.suggestedAccount}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{item.aiReason}</p>
                  {!isApproved && (
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" className="h-7 text-xs gap-1" onClick={() => approveItem(item.id)}>
                        <Check className="h-3 w-3" /> Godkend
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                        <Pencil className="h-3 w-3" /> Ret konto
                      </Button>
                    </div>
                  )}
                  {isApproved && (
                    <div className="flex items-center gap-1.5 text-xs text-primary">
                      <Check className="h-3 w-3" /> Godkendt
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {approved.size === needsApproval.length && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-end">
              <Button size="sm" className="text-xs">Importér 23 transaktioner</Button>
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  );
}
