import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/Logo";

export default function Waitlist() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<null | "new" | "exists">(null);
  const [error, setError] = useState<string | null>(null);

  // Force dark theme on this public page
  useEffect(() => {
    const root = document.documentElement;
    const had = root.classList.contains("dark");
    root.classList.add("dark");
    return () => {
      if (!had) root.classList.remove("dark");
    };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const value = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setError("Skriv en gyldig email.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("waitlist").insert({
      email: value,
      source: "landing",
    });
    setLoading(false);
    if (error) {
      if (error.code === "23505") {
        setDone("exists");
        return;
      }
      setError(error.message);
      return;
    }
    setDone("new");
  };

  return (
    <main className="min-h-screen bg-background text-foreground antialiased">
      {/* Top bar */}
      <header className="px-6 md:px-10 pt-8">
        <Logo variant="auto" className="h-7 w-auto" />
      </header>

      {/* Hero */}
      <section className="px-6 md:px-10 pt-24 md:pt-40 pb-24 md:pb-32 max-w-[720px] mx-auto animate-fade-in">
        <h1 className="text-[44px] leading-[1.05] md:text-[72px] md:leading-[1.02] font-semibold tracking-[-0.03em]">
          Kvitteringer ind.
          <br />
          <span className="text-primary">Regnskab ud.</span>
        </h1>

        {done ? (
          <div className="mt-12 border border-border bg-card px-5 py-4 text-sm">
            {done === "new" ? (
              <>Du er på listen. Vi skriver når det er din tur. <span aria-hidden>⚓</span></>
            ) : (
              <>Du er allerede på listen — vi har ikke glemt dig.</>
            )}
          </div>
        ) : (
          <form onSubmit={submit} className="mt-12 flex flex-col sm:flex-row gap-2 max-w-md">
            <Input
              type="email"
              required
              placeholder="din@email.dk"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 text-sm bg-card border-border"
              aria-label="Email"
            />
            <Button type="submit" disabled={loading} className="h-11 px-5 text-sm whitespace-nowrap">
              {loading ? "Et øjeblik…" : "Skriv mig op"}
            </Button>
          </form>
        )}

        <p className="mt-3 text-xs text-muted-foreground">
          {error ?? "Vi åbner for beta snart. Ingen spam."}
        </p>
      </section>

      {/* What Captain does */}
      <section className="px-6 md:px-10 py-24 max-w-[720px] mx-auto">
        <p className="text-lg md:text-xl leading-relaxed text-foreground/90">
          Captain læser dine kvitteringer, matcher dem med din bank, og bogfører
          automatisk. Du godkender. Når SKAT skal have tal, er de klar.
        </p>
      </section>

      {/* Chat preview */}
      <section className="px-6 md:px-10 pb-24 max-w-[720px] mx-auto">
        <div className="border border-border bg-card overflow-hidden">
          {/* faux titlebar */}
          <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-border">
            <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
            <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
            <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
            <span className="ml-3 text-[11px] text-muted-foreground font-mono">captain</span>
          </div>

          <div className="p-5 md:p-6 space-y-4 text-sm">
            {/* user message */}
            <div className="flex justify-end">
              <div className="max-w-[80%] bg-secondary text-secondary-foreground px-3.5 py-2.5 rounded-md">
                Bogfør den her kvittering fra Elgiganten
              </div>
            </div>

            {/* captain reply */}
            <div className="flex">
              <div className="max-w-[85%] space-y-3">
                <div className="text-foreground/90">
                  Fundet: <span className="font-medium">Elgiganten</span>, 15. apr 2026.
                  Bogført som <span className="font-mono">3617 Kontorartikler</span>.
                </div>
                <div className="border border-border bg-background p-3.5 space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Beløb ekskl. moms</span>
                    <span className="font-mono text-foreground">1.199,20</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Moms 25%</span>
                    <span className="font-mono text-foreground">299,80</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t border-border">
                    <span>I alt</span>
                    <span className="font-mono text-primary">1.499,00 kr</span>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  Matchet med banktransaktion 16. apr · klar til godkendelse
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 md:px-10 py-12 border-t border-border">
        <div className="max-w-[720px] mx-auto text-sm text-muted-foreground space-y-2">
          <p>Captain er lavet i København af folk der hader bogføring.</p>
          <p className="text-xs">
            <a href="https://gocaptain.dk" className="hover:text-foreground transition-colors">
              gocaptain.dk
            </a>
            <span className="mx-2">·</span>
            <a href="mailto:hello@gocaptain.dk" className="hover:text-foreground transition-colors">
              hello@gocaptain.dk
            </a>
          </p>
        </div>
      </footer>
    </main>
  );
}
