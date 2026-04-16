import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Company {
  id: string;
  name: string;
  cvr: string | null;
  fiscal_year_start: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export function useCompany() {
  const { user } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setCompany(null);
      setLoading(false);
      return;
    }

    const fetchCompany = async () => {
      setLoading(true);
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
  }, [user]);

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
