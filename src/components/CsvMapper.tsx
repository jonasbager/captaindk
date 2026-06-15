import { useState } from "react";
import { Upload, FileSpreadsheet, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { parseCsv, type ParsedCsv } from "@/lib/csv";

export type ColumnSpec = {
  key: string;
  label: string;
  required?: boolean;
  matcher?: RegExp; // header-regex til auto-mapping
};

const IGNORE = "__ignore__";

// Genbrugelig CSV-uploader: vælg fil → map kolonner → kald onMapped med rækker
// som objekter keyed på ColumnSpec.key. Bruges af migreringsguiden.
export function CsvMapper({
  columns,
  onMapped,
  cta = "Fortsæt",
}: {
  columns: ColumnSpec[];
  onMapped: (rows: Record<string, string>[]) => void;
  cta?: string;
}) {
  const [file, setFile] = useState<(ParsedCsv & { fileName: string }) | null>(null);
  const [mapping, setMapping] = useState<string[]>([]); // pr. CSV-kolonne → ColumnSpec.key | IGNORE
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const autoMap = (headers: string[]): string[] =>
    headers.map((h) => {
      const match = columns.find((c) => c.matcher?.test(h));
      return match ? match.key : IGNORE;
    });

  const handleFile = async (selected: File) => {
    if (!selected.name.toLowerCase().endsWith(".csv")) {
      setError("Vælg en CSV-fil.");
      return;
    }
    try {
      const parsed = parseCsv(await selected.text());
      if (!parsed) {
        setError("CSV-filen ser tom ud eller mangler data.");
        return;
      }
      setFile({ ...parsed, fileName: selected.name });
      setMapping(autoMap(parsed.headers));
      setError(null);
    } catch {
      setError("CSV-filen kunne ikke læses.");
    }
  };

  const openPicker = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv,text/csv";
    input.onchange = () => { const f = input.files?.[0]; if (f) handleFile(f); };
    input.click();
  };

  const missingRequired = columns
    .filter((c) => c.required && !mapping.includes(c.key))
    .map((c) => c.label);

  const confirm = () => {
    if (!file) return;
    const rows = file.rows.map((row) => {
      const obj: Record<string, string> = {};
      columns.forEach((c) => {
        const idx = mapping.findIndex((m) => m === c.key);
        obj[c.key] = idx >= 0 ? (row[idx] ?? "") : "";
      });
      return obj;
    });
    onMapped(rows);
  };

  if (!file) {
    return (
      <div>
        <div
          className={`border-2 border-dashed rounded p-10 text-center cursor-pointer transition-colors ${
            isDragging ? "border-primary bg-primary/5" : "border-border/40 hover:border-border/60"
          }`}
          onClick={openPicker}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        >
          <Upload className="h-7 w-7 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Træk en CSV-fil hertil eller klik for at uploade</p>
        </div>
        {error && <p className="text-xs text-destructive mt-2">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-3 border border-border/50 rounded">
        <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
        <div className="flex-1">
          <p className="text-sm font-medium">{file.fileName}</p>
          <p className="text-xs text-muted-foreground">{file.rows.length} rækker · {file.headers.length} kolonner</p>
        </div>
        <Button size="sm" variant="ghost" className="text-xs" onClick={() => setFile(null)}>Skift fil</Button>
      </div>

      <div className="border border-border/50 rounded overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/20 text-xs text-muted-foreground align-top">
              {file.headers.map((header, i) => (
                <th key={header + i} className="p-2 space-y-2 min-w-[140px]">
                  <Select value={mapping[i] ?? IGNORE} onValueChange={(v) => setMapping((prev) => prev.map((m, idx) => (idx === i ? v : m)))}>
                    <SelectTrigger className="h-7 text-xs border-dashed">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={IGNORE}>Ignorér</SelectItem>
                      {columns.map((c) => (
                        <SelectItem key={c.key} value={c.key}>{c.label}{c.required ? " *" : ""}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="text-[10px] text-muted-foreground truncate px-1">{header}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {file.rows.slice(0, 5).map((row, r) => (
              <tr key={r} className="border-b border-border/10 text-xs">
                {row.map((cell, c) => <td key={c} className="p-2">{cell || "—"}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {missingRequired.length > 0 && (
        <p className="text-xs text-warning">Påkrævede kolonner mangler mapping: {missingRequired.join(", ")}</p>
      )}

      <div className="flex justify-end">
        <Button size="sm" className="text-xs" onClick={confirm} disabled={missingRequired.length > 0}>
          {cta} <ChevronRight className="h-3 w-3 ml-1" />
        </Button>
      </div>
    </div>
  );
}
