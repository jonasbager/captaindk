import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Upload, FileSpreadsheet, Check, AlertCircle, ChevronRight, Pencil, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatAmount } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { useToast } from "@/hooks/use-toast";

type ParsedCsvFile = {
  fileName: string;
  headers: string[];
  rows: string[][];
};

type ReviewItem = {
  id: number;
  date: string;
  description: string;
  amount: number;
  suggestedAccount: string;
  aiReason: string;
};

const columnOptions = ["Dato", "Beskrivelse", "Beløb", "Valuta", "Kategori", "Reference", "Ignorer"];
const sourceOptions = [
  { value: "lunar", label: "Lunar" },
  { value: "nordea", label: "Nordea" },
  { value: "danske", label: "Danske Bank" },
  { value: "pleo", label: "Pleo" },
  { value: "wise", label: "Wise" },
  { value: "andet", label: "Andet" },
];

const splitCsvLine = (line: string, delimiter: string) => {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values.map((value) => value.replace(/^"|"$/g, "").trim());
};

const detectDelimiter = (lines: string[]) => {
  const candidates = [";", ",", "\t"];
  const sample = lines.slice(0, 5);

  return candidates
    .map((delimiter) => ({
      delimiter,
      score: sample.reduce((sum, line) => sum + splitCsvLine(line, delimiter).length, 0),
    }))
    .sort((a, b) => b.score - a.score)[0]?.delimiter || ",";
};

const inferSource = (fileName: string) => {
  const name = fileName.toLowerCase();
  if (name.includes("lunar")) return "lunar";
  if (name.includes("nordea")) return "nordea";
  if (name.includes("danske")) return "danske";
  if (name.includes("pleo")) return "pleo";
  if (name.includes("wise")) return "wise";
  return "andet";
};

const inferColumnMapping = (header: string, index: number) => {
  const value = header.toLowerCase();

  if (/dato|date|booked|bogf/i.test(value)) return "Dato";
  if (/tekst|description|beskrivelse|narrative|merchant|payee/i.test(value)) return "Beskrivelse";
  if (/beløb|amount|debit|credit|netto|value/i.test(value)) return "Beløb";
  if (/currency|valuta/i.test(value)) return "Valuta";
  if (/reference|ref|id|bilagsnr|transaction id/i.test(value)) return "Reference";
  if (/kategori|category|type/i.test(value)) return "Kategori";

  return index < 5 ? ["Dato", "Beskrivelse", "Beløb", "Valuta", "Reference"][index] ?? "Ignorer" : "Ignorer";
};

const parseLocalizedAmount = (value: string) => {
  const normalized = value.replace(/\s/g, "").replace(/\.(?=.*[,])/g, "").replace(/,/g, ".");
  const amount = Number(normalized.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(amount) ? amount : 0;
};

// Kontoforslag kommer fra rigtig AI/regel-motor — ikke implementeret endnu.
const noSuggestion = {
  account: "Ikke foreslået endnu",
  reason: "Tilkobl AI-motor for at få automatisk kontoforslag.",
};

export default function Import() {
  const navigate = useNavigate();
  const { company } = useCompany();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [source, setSource] = useState("lunar");
  const [mapping, setMapping] = useState<string[]>([]);
  const [approved, setApproved] = useState<Set<number>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<ParsedCsvFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    const preventFileDrop = (event: DragEvent) => {
      event.preventDefault();
    };

    window.addEventListener("dragover", preventFileDrop);
    window.addEventListener("drop", preventFileDrop);

    return () => {
      window.removeEventListener("dragover", preventFileDrop);
      window.removeEventListener("drop", preventFileDrop);
    };
  }, []);

  const previewRows = useMemo(() => file?.rows.slice(0, 5) ?? [], [file]);

  const reviewItems = useMemo<ReviewItem[]>(() => {
    if (!file) return [];

    const getValue = (row: string[], label: string) => {
      const index = mapping.findIndex((item) => item === label);
      return index >= 0 ? row[index] ?? "" : "";
    };

    return file.rows.map((row, index) => {
      const description = getValue(row, "Beskrivelse") || `Transaktion ${index + 1}`;

      return {
        id: index + 1,
        date: getValue(row, "Dato") || "—",
        description,
        amount: parseLocalizedAmount(getValue(row, "Beløb")),
        suggestedAccount: noSuggestion.account,
        aiReason: noSuggestion.reason,
      };
    });
  }, [file, mapping]);

  const autoApprovedCount = 0;

  const updateMapping = (index: number, value: string) => {
    setMapping((prev) => prev.map((item, i) => (i === index ? value : item)));
  };

  const approveItem = (id: number) => {
    setApproved((prev) => new Set([...prev, id]));
  };

  const approveAll = () => {
    setApproved(new Set(reviewItems.map((item) => item.id)));
  };

  const parseDate = (raw: string): string | null => {
    if (!raw) return null;
    const trimmed = raw.trim();
    const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
    const dmy = trimmed.match(/^(\d{2})[\/.\-](\d{2})[\/.\-](\d{4})/);
    if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
    return null;
  };

  const handleImport = async () => {
    if (!company || !file) {
      toast({ title: "Ingen virksomhed", description: "Vælg en virksomhed før import.", variant: "destructive" });
      return;
    }

    setImporting(true);
    try {
      const rows = reviewItems
        .map((item) => ({
          company_id: company.id,
          date: parseDate(item.date),
          description: item.description,
          amount: item.amount,
          source,
        }))
        .filter((row): row is typeof row & { date: string } => !!row.date && row.amount !== 0);

      if (rows.length === 0) {
        toast({ title: "Ingen gyldige rækker", description: "Tjek at dato og beløb er mappet korrekt.", variant: "destructive" });
        setImporting(false);
        return;
      }

      const { error: insertError } = await supabase.from("transactions").insert(rows);
      if (insertError) throw insertError;

      toast({ title: "Import gennemført", description: `${rows.length} transaktioner blev importeret.` });
      navigate("/indbakke");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Ukendt fejl";
      toast({ title: "Import fejlede", description: message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const handleFile = async (selectedFile: File) => {
    if (!selectedFile.name.toLowerCase().endsWith(".csv")) {
      setError("Vælg en CSV-fil.");
      return;
    }

    try {
      const raw = (await selectedFile.text()).replace(/^\uFEFF/, "");
      const lines = raw
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      if (lines.length < 2) {
        setError("CSV-filen ser tom ud eller mangler data.");
        return;
      }

      const delimiter = detectDelimiter(lines);
      const parsed = lines.map((line) => splitCsvLine(line, delimiter));
      const headers = parsed[0].map((header, index) => header || `Kolonne ${index + 1}`);
      const rows = parsed
        .slice(1)
        .filter((row) => row.some((cell) => cell !== ""))
        .map((row) => headers.map((_, index) => row[index] ?? ""));

      setFile({ fileName: selectedFile.name, headers, rows });
      setMapping(headers.map(inferColumnMapping));
      setSource(inferSource(selectedFile.name));
      setApproved(new Set());
      setError(null);
      setStep(2);
    } catch {
      setError("CSV-filen kunne ikke læses.");
    }
  };

  const openFilePicker = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv,text/csv";
    input.onchange = async () => {
      const selectedFile = input.files?.[0];
      if (selectedFile) await handleFile(selectedFile);
    };
    input.click();
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-lg font-semibold">
        CSV Import
      </motion.h1>

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
          className={`border-2 border-dashed rounded p-16 text-center cursor-pointer transition-colors ${
            isDragging ? "border-primary bg-primary/5" : "border-border/40 hover:border-border/60"
          }`}
          onClick={openFilePicker}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(true);
          }}
          onDragEnter={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(false);
          }}
          onDrop={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(false);
            const selectedFile = e.dataTransfer.files[0];
            if (selectedFile) await handleFile(selectedFile);
          }}
        >
          <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-1">Træk en CSV-fil hertil eller klik for at uploade</p>
          <p className="text-xs text-muted-foreground">Understøtter Lunar, Nordea, Danske Bank, Pleo m.fl.</p>
        </motion.div>
      )}

      {error && (
        <div className="border border-destructive/30 bg-destructive/5 rounded p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {step === 2 && file && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="flex items-center gap-3 p-3 border border-border/50 rounded">
            <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm font-medium">{file.fileName}</p>
              <p className="text-xs text-muted-foreground">{file.rows.length} rækker · {file.headers.length} kolonner</p>
            </div>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sourceOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="border border-border/50 rounded p-4 space-y-3">
            <p className="text-xs text-muted-foreground">
              Kolonnerne nedenfor kommer direkte fra din CSV. Tilpas mapping hvis noget er aflæst forkert.
            </p>
          </div>

          <div className="border border-border/50 rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/20 text-xs text-muted-foreground align-top">
                  {file.headers.map((header, i) => (
                    <th key={header + i} className="p-2 space-y-2">
                      <Select value={mapping[i] ?? "Ignorer"} onValueChange={(value) => updateMapping(i, value)}>
                        <SelectTrigger className="h-7 text-xs border-dashed">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {columnOptions.map((option) => (
                            <SelectItem key={option} value={option}>{option}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="text-[10px] text-muted-foreground truncate px-1">{header}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-b border-border/10 text-xs">
                    {row.map((cell, cellIndex) => {
                      const isAmount = mapping[cellIndex] === "Beløb";
                      const amount = parseLocalizedAmount(cell);
                      return (
                        <td key={`${rowIndex}-${cellIndex}`} className={`p-2 ${isAmount ? `font-mono ${amount >= 0 ? "text-primary" : ""}` : ""}`}>
                          {cell || "—"}
                        </td>
                      );
                    })}
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

      {step === 3 && file && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="flex items-center justify-between p-3 border border-border/50 rounded bg-card">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-info" />
              <span className="text-sm">
                {file.rows.length} transaktioner fundet. {autoApprovedCount} klar til import, <span className="text-warning font-medium">{reviewItems.length} kræver din godkendelse</span>.
              </span>
            </div>
            <Button size="sm" className="text-xs" onClick={approveAll}>Godkend alle</Button>
          </div>

          <div className="space-y-3">
            {reviewItems.map((item) => {
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

          {approved.size === reviewItems.length && reviewItems.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-end">
              <Button size="sm" className="text-xs gap-1" onClick={handleImport} disabled={importing}>
                {importing && <Loader2 className="h-3 w-3 animate-spin" />}
                Importér {reviewItems.length} transaktioner
              </Button>
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  );
}
