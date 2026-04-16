import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Filter, FileText, Check, Trash2 } from "lucide-react";
import { recentEntries, formatAmount } from "@/lib/demo-data";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  "ai-forslag": "bg-info/15 text-info border-info/20",
  afventer: "bg-warning/15 text-warning border-warning/20",
};

export default function Posteringer() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("alle");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  const filtered = allEntries.filter((e) => {
    if (statusFilter !== "alle" && e.status !== statusFilter) return false;
    if (search && !e.description.toLowerCase().includes(search.toLowerCase())) return false;
    if (dateFrom && e.date < dateFrom) return false;
    if (dateTo && e.date > dateTo) return false;
    return true;
  });

  const toggleCheck = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (checkedIds.size === filtered.length) {
      setCheckedIds(new Set());
    } else {
      setCheckedIds(new Set(filtered.map((e) => e.id)));
    }
  };

  const selectedEntry = allEntries.find((e) => e.id === selected);

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-2.75rem)]">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-border/30 space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold">Posteringer</h1>
            {checkedIds.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{checkedIds.size} valgt</span>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                  <Check className="h-3 w-3" /> Godkend
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-destructive">
                  <Trash2 className="h-3 w-3" /> Slet
                </Button>
              </div>
            )}
          </div>
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Søg i posteringer..."
                className="pl-9 bg-background h-8 text-sm"
              />
            </div>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-background h-8 text-sm w-36"
              placeholder="Fra"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-background h-8 text-sm w-36"
              placeholder="Til"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36 h-8 text-sm">
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
                <th className="p-3 w-8">
                  <Checkbox
                    checked={checkedIds.size === filtered.length && filtered.length > 0}
                    onCheckedChange={toggleAll}
                  />
                </th>
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
                  <td className="p-3" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={checkedIds.has(entry.id)}
                      onCheckedChange={() => toggleCheck(entry.id)}
                    />
                  </td>
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
          className="w-full md:w-80 border-t md:border-t-0 md:border-l border-border/30 p-4 overflow-auto space-y-4"
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
