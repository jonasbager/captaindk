import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Search, Filter, FileText, Check, Trash2, Loader2 } from "lucide-react";
import { formatAmount } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { useToast } from "@/hooks/use-toast";

interface Row {
  id: string;
  date: string;
  description: string;
  amount: number;
  account: string;
  account_number: number | null;
  status: string;
  has_document: boolean;
  kind: "je" | "tx"; // je = bogført postering, tx = importeret banktransaktion (ikke bogført)
}

const statusColors: Record<string, string> = {
  godkendt: "bg-primary/15 text-primary border-primary/20",
  "ai-forslag": "bg-info/15 text-info border-info/20",
  afventer: "bg-warning/15 text-warning border-warning/20",
  importeret: "bg-muted text-muted-foreground border-border/40",
};

export default function Posteringer() {
  const { company } = useCompany();
  const { toast } = useToast();
  const [allEntries, setAllEntries] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("alle");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!company) return;
    const [je, tx] = await Promise.all([
      supabase
        .from("journal_entries")
        .select("id, date, description, amount, account, account_number, status, has_document")
        .eq("company_id", company.id)
        .order("date", { ascending: false }),
      supabase
        .from("transactions")
        .select("id, date, description, amount, matched_document_id")
        .eq("company_id", company.id)
        .order("date", { ascending: false }),
    ]);
    const jeRows: Row[] = (je.data || []).map((e: any) => ({ ...e, kind: "je" as const }));
    // Importerede/synkede banktransaktioner vises som "ikke bogført" (skrivebeskyttet her)
    const txRows: Row[] = (tx.data || []).map((t: any) => ({
      id: `tx-${t.id}`,
      date: t.date,
      description: t.description,
      amount: Number(t.amount),
      account: "—",
      account_number: null,
      status: "importeret",
      has_document: !!t.matched_document_id,
      kind: "tx" as const,
    }));
    const merged = [...jeRows, ...txRows].sort((a, b) => (a.date < b.date ? 1 : -1));
    setAllEntries(merged);
    setLoading(false);
  }, [company]);

  useEffect(() => { load(); }, [load]);

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

  const selectable = filtered.filter((e) => e.kind === "je");

  const toggleAll = () => {
    if (checkedIds.size === selectable.length) {
      setCheckedIds(new Set());
    } else {
      setCheckedIds(new Set(selectable.map((e) => e.id)));
    }
  };

  const approveSelected = async () => {
    const ids = [...checkedIds];
    const { error } = await supabase.from("journal_entries").update({ status: "godkendt" }).in("id", ids);
    if (error) {
      toast({ title: "Fejl", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Godkendt", description: `${ids.length} postering${ids.length !== 1 ? "er" : ""} godkendt` });
      setCheckedIds(new Set());
      load();
    }
  };

  const deleteSelected = async () => {
    if (!confirm(`Slet ${checkedIds.size} postering${checkedIds.size !== 1 ? "er" : ""}?`)) return;
    const ids = [...checkedIds];
    const { error } = await supabase.from("journal_entries").delete().in("id", ids);
    if (error) {
      toast({ title: "Fejl", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Slettet", description: `${ids.length} postering${ids.length !== 1 ? "er" : ""} slettet` });
      setCheckedIds(new Set());
      if (selected && ids.includes(selected)) setSelected(null);
      load();
    }
  };

  const jeCount = allEntries.filter((e) => e.kind === "je").length;
  const txCount = allEntries.filter((e) => e.kind === "tx").length;
  const pendingCount = allEntries.filter((e) => e.kind === "je" && e.status !== "godkendt").length;
  const selectedEntry = allEntries.find((e) => e.id === selected);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-2.75rem)]">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-2.75rem)]">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-border/30 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold">Posteringer</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {jeCount} posteringer · <span className="text-warning">{pendingCount} venter på godkendelse</span>
                {txCount > 0 && <> · {txCount} importerede transaktioner (ikke bogført)</>}
              </p>
            </div>
            {checkedIds.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{checkedIds.size} valgt</span>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={approveSelected}>
                  <Check className="h-3 w-3" /> Godkend
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-destructive" onClick={deleteSelected}>
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
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="bg-background h-8 text-sm w-36" />
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="bg-background h-8 text-sm w-36" />
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
                <SelectItem value="importeret">Importeret (bank)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {allEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <FileText className="h-8 w-8 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">Ingen posteringer endnu</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Brug bogførings-chatten til at oprette din første postering</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card z-10">
                <tr className="border-b border-border/30 text-xs text-muted-foreground">
                  <th className="p-3 w-8">
                    <Checkbox checked={checkedIds.size === selectable.length && selectable.length > 0} onCheckedChange={toggleAll} />
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
                    onClick={() => setSelected(entry.id === selected ? null : entry.id)}
                    className={`border-b border-border/20 cursor-pointer transition-colors ${
                      selected === entry.id ? "bg-accent/40" : "hover:bg-accent/20"
                    }`}
                  >
                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                      {entry.kind === "je" && (
                        <Checkbox checked={checkedIds.has(entry.id)} onCheckedChange={() => toggleCheck(entry.id)} />
                      )}
                    </td>
                    <td className="p-3 font-mono text-xs text-muted-foreground">{entry.date}</td>
                    <td className="p-3">{entry.description}</td>
                    <td className="p-3 text-xs text-muted-foreground">
                      <span className="font-mono">{entry.account_number}</span> {entry.account}
                    </td>
                    <td className={`p-3 text-right font-mono text-sm ${entry.amount >= 0 ? "text-primary" : ""}`}>
                      {formatAmount(entry.amount)}
                    </td>
                    <td className="p-3 text-center">
                      <Badge variant="outline" className={`text-[10px] ${statusColors[entry.status] || ""}`}>
                        {entry.status}
                      </Badge>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`inline-block w-2 h-2 rounded-full ${entry.has_document ? "bg-primary" : "bg-destructive"}`} />
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

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
            <DetailRow label="Konto" value={`${selectedEntry.account_number ?? "—"} — ${selectedEntry.account}`} />
            <DetailRow label="Beløb" value={formatAmount(selectedEntry.amount)} mono />
            <DetailRow label="Status" value={selectedEntry.status} />
            <DetailRow label="Bilag" value={selectedEntry.has_document ? "Tilknyttet" : "Mangler"} />
          </div>
          {selectedEntry.has_document && (
            <div className="border border-border/40 rounded p-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">bilag_{selectedEntry.id.slice(0, 8)}.pdf</span>
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
