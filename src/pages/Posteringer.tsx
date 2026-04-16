import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Filter, FileText } from "lucide-react";
import { recentEntries, formatAmount } from "@/lib/demo-data";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const allEntries = [
  ...recentEntries,
  { id: "8", date: "2025-04-03", description: "Amazon — USB-hub", amount: -799, account: "Småanskaffelser", accountNumber: 3615, status: "godkendt" as const, hasDocument: true },
  { id: "9", date: "2025-04-01", description: "IKEA — Reol til kontor", amount: -3450, account: "Småanskaffelser", accountNumber: 3615, status: "godkendt" as const, hasDocument: true },
  { id: "10", date: "2025-03-28", description: "Coolshop — Webcam", amount: -549, account: "Småanskaffelser", accountNumber: 3615, status: "ai-forslag" as const, hasDocument: false },
  { id: "11", date: "2025-03-25", description: "Faktura #2025-045 — Rådgivning", amount: 32000, account: "Nettoomsætning", accountNumber: 1000, status: "godkendt" as const, hasDocument: true },
  { id: "12", date: "2025-03-20", description: "Telia — Mobilabonnement", amount: -199, account: "Telefon", accountNumber: 3650, status: "godkendt" as const, hasDocument: true },
  { id: "13", date: "2025-03-18", description: "Faktura #2025-044 — Webdesign", amount: 18500, account: "Nettoomsætning", accountNumber: 1000, status: "godkendt" as const, hasDocument: true },
  { id: "14", date: "2025-03-15", description: "Logitech — Mus", amount: -499, account: "Småanskaffelser", accountNumber: 3615, status: "godkendt" as const, hasDocument: true },
  { id: "15", date: "2025-03-10", description: "GitHub — Pro plan", amount: -73, account: "Software", accountNumber: 3630, status: "godkendt" as const, hasDocument: true },
];

const statusColors: Record<string, string> = {
  godkendt: "bg-primary/15 text-primary border-primary/20",
  "ai-forslag": "bg-blue-500/15 text-blue-400 border-blue-500/20",
  afventer: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
};

export default function Posteringer() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("alle");
  const [selected, setSelected] = useState<string | null>(null);

  const filtered = allEntries.filter((e) => {
    if (statusFilter !== "alle" && e.status !== statusFilter) return false;
    if (search && !e.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const selectedEntry = allEntries.find((e) => e.id === selected);

  return (
    <div className="flex h-[calc(100vh-2.75rem)]">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-border/30 space-y-3">
          <h1 className="text-lg font-semibold">Posteringer</h1>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Søg i posteringer..."
                className="pl-9 bg-background h-8 text-sm"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 h-8 text-sm">
                <Filter className="h-3 w-3 mr-1.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alle">Alle</SelectItem>
                <SelectItem value="godkendt">Godkendt</SelectItem>
                <SelectItem value="ai-forslag">AI-forslag</SelectItem>
                <SelectItem value="afventer">Afventer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card z-10">
              <tr className="border-b border-border/30 text-xs text-muted-foreground">
                <th className="text-left p-3 font-medium">Dato</th>
                <th className="text-left p-3 font-medium">Beskrivelse</th>
                <th className="text-left p-3 font-medium">Konto</th>
                <th className="text-right p-3 font-medium">Beløb</th>
                <th className="text-center p-3 font-medium">Status</th>
                <th className="text-center p-3 font-medium">Bilag</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry, i) => (
                <motion.tr
                  key={entry.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  onClick={() => setSelected(entry.id)}
                  className={`border-b border-border/20 cursor-pointer transition-colors ${
                    selected === entry.id ? "bg-accent/40" : "hover:bg-accent/20"
                  }`}
                >
                  <td className="p-3 font-mono text-xs text-muted-foreground">{entry.date}</td>
                  <td className="p-3">{entry.description}</td>
                  <td className="p-3 text-xs text-muted-foreground">
                    <span className="font-mono">{entry.accountNumber}</span> {entry.account}
                  </td>
                  <td className={`p-3 text-right font-mono text-sm ${entry.amount >= 0 ? "text-primary" : ""}`}>
                    {formatAmount(entry.amount)}
                  </td>
                  <td className="p-3 text-center">
                    <Badge variant="outline" className={`text-[10px] ${statusColors[entry.status]}`}>
                      {entry.status}
                    </Badge>
                  </td>
                  <td className="p-3 text-center">
                    <span className={`inline-block w-2 h-2 rounded-full ${entry.hasDocument ? "bg-primary" : "bg-destructive"}`} />
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail panel */}
      {selectedEntry && (
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-80 border-l border-border/30 p-4 overflow-auto space-y-4"
        >
          <h3 className="text-sm font-semibold">Detaljer</h3>
          <div className="space-y-3 text-sm">
            <DetailRow label="Dato" value={selectedEntry.date} mono />
            <DetailRow label="Beskrivelse" value={selectedEntry.description} />
            <DetailRow label="Konto" value={`${selectedEntry.accountNumber} — ${selectedEntry.account}`} />
            <DetailRow label="Beløb" value={formatAmount(selectedEntry.amount)} mono />
            <DetailRow label="Status" value={selectedEntry.status} />
            <DetailRow label="Bilag" value={selectedEntry.hasDocument ? "Tilknyttet" : "Mangler"} />
          </div>
          {selectedEntry.hasDocument && (
            <div className="border border-border/40 rounded p-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">bilag_{selectedEntry.id}.pdf</span>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={mono ? "font-mono" : ""}>{value}</p>
    </div>
  );
}
