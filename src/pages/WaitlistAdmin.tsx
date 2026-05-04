import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Entry {
  id: string;
  name: string;
  company: string;
  email: string;
  created_at: string;
}

export default function WaitlistAdmin() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("waitlist")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) setError(error.message);
      else setEntries(data as Entry[]);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-baseline justify-between mb-6">
          <h1 className="text-lg font-semibold">Waitlist</h1>
          <span className="text-xs text-muted-foreground font-mono">{entries.length} tilmeldte</span>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Indlæser…</p>
        ) : error ? (
          <div className="border border-border bg-card p-4 text-sm text-[hsl(var(--destructive))]">
            {error} — du skal være logget ind som admin for at se listen.
          </div>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ingen tilmeldte endnu.</p>
        ) : (
          <div className="border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs text-muted-foreground">
                <tr>
                  <th className="text-left p-3 font-medium">Navn</th>
                  <th className="text-left p-3 font-medium">Virksomhed</th>
                  <th className="text-left p-3 font-medium">Email</th>
                  <th className="text-left p-3 font-medium">Tilmeldt</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-t border-border">
                    <td className="p-3">{e.name}</td>
                    <td className="p-3">{e.company}</td>
                    <td className="p-3 font-mono text-xs">{e.email}</td>
                    <td className="p-3 font-mono text-xs text-muted-foreground">
                      {new Date(e.created_at).toLocaleString("da-DK")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
