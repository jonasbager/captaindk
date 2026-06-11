import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import type { EngineEntry, VatCode } from "@/lib/skat/engine";

// Journal entry mapped to the engine's input shape, plus metadata for drill-down.
export interface EntryWithMeta extends EngineEntry {
  id: string;
  description: string;
  amount: number; // gross
  account: string;
  account_number: number | null;
}

export function useEngineEntries() {
  const { company } = useCompany();
  const [entries, setEntries] = useState<EntryWithMeta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!company) return;
    setLoading(true);
    supabase
      .from("journal_entries")
      .select("id, date, description, amount, net_amount, vat_amount, vat_code, account, account_number, accounts:account_id (kind, tax_line, energy_levy)")
      .eq("company_id", company.id)
      .eq("status", "godkendt")
      .order("date", { ascending: false })
      .then(({ data }) => {
        const mapped: EntryWithMeta[] = (data || [])
          .filter((e: any) => e.accounts)
          .map((e: any) => ({
            id: e.id,
            date: e.date,
            description: e.description,
            amount: Number(e.amount),
            account: e.account,
            account_number: e.account_number,
            net_amount: Number(e.net_amount ?? e.amount),
            vat_amount: Number(e.vat_amount ?? 0),
            vat_code: (e.vat_code || "NONE") as VatCode,
            account_kind: e.accounts.kind,
            tax_line: e.accounts.tax_line,
            energy_levy: e.accounts.energy_levy,
          }));
        setEntries(mapped);
        setLoading(false);
      });
  }, [company]);

  return { entries, loading, company };
}
