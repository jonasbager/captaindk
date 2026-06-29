import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Company {
  id: string;
  name: string;
  cvr: string | null;
  fiscal_year_start: string;
  company_type: string;
  vat_period: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  logo_url: string | null;
  bank_reg: string | null;
  bank_konto: string | null;
  mobilepay: string | null;
  iban: string | null;
  swift: string | null;
  default_payment_terms: number;
  invoice_default_methods: string[];
}

export function useCompany() {
  const { user, loading: authLoading } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Afgør først company-status når session-restore er færdig — ellers melder
    // hooket "ingen virksomhed" på cold load, og deep links bouncer via /onboarding
    if (authLoading) return;
    if (!user) {
      setCompany(null);
      setLoading(false);
      return;
    }

    const fetchCompany = async () => {
      // Vis kun loader ved første indlæsning — ikke ved en evt. baggrunds-refetch
      setCompany((prev) => { if (!prev) setLoading(true); return prev; });
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (!error && data) {
        setCompany(data);
      } else {
        setCompany(null);
      }
      setLoading(false);
    };

    fetchCompany();
    // Keyet på user?.id (ikke user-objektet) så token-fornyelse ikke trigger refetch
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, authLoading]);

  const refetch = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("companies")
      .select("*")
      .eq("owner_id", user.id)
      .maybeSingle();
    if (data) setCompany(data);
  };

  return { company, loading, refetch };
}
