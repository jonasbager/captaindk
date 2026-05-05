import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/Logo";
import { ArrowLeft } from "lucide-react";

export default function Waitlist() {
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<null | "new" | "exists">(null);
  const [error, setError] = useState<string | null>(null);

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
    if (!name.trim()) {
      setError("Skriv dit navn.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setError("Skriv en gyldig email.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("waitlist").insert({
      name: name.trim(),
      company: company.trim() || null,
      email: value,
      source: "waitlist",
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
    <main className="relative min-h-screen bg-background text-foreground antialiased overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[480px] w-[680px] rounded-full bg-primary/15 blur-[160px]" />
      </div>

      <header className="relative z-10 px-6 md:px-10 pt-8 flex items-center justify-between">
        <Link to="/" className="flex items-center">
          <Logo variant="auto" className="h-12 w-auto" />
        </Link>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs md:text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Tilbage
        </Link>
      </header>

      <section className="relative z-10 px-6 md:px-10 pt-20 md:pt-28 pb-24 max-w-[520px] mx-auto animate-fade-in">
        <h1 className="text-[36px] leading-[1.05] md:text-[52px] md:leading-[1.02] font-semibold tracking-[-0.03em]">
          Kom med på <span className="text-primary">ventelisten</span>.
        </h1>
        <p className="mt-5 text-base md:text-lg text-foreground/70 leading-relaxed">
          Vi inviterer i bølger. De første får mest af vores tid og er med til at forme Captain.
        </p>

        {done ? (
          <div className="mt-10 border border-border bg-card px-5 py-4 text-sm">
            {done === "new" ? (
              <>Du er på listen, {name.split(" ")[0] || "kaptajn"}. Vi skriver når det er din tur. <span aria-hidden>⚓</span></>
            ) : (
              <>Du er allerede på listen - vi har ikke glemt dig.</>
            )}
          </div>
        ) : (
          <form onSubmit={submit} className="mt-10 space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground" htmlFor="wl-name">Navn</label>
              <Input
                id="wl-name"
                required
                placeholder="Mette Hansen"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11 text-sm bg-card border-border"
                autoComplete="name"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground" htmlFor="wl-company">Firmanavn <span className="text-muted-foreground/60">(valgfrit)</span></label>
              <Input
                id="wl-company"
                placeholder="Hansen ApS"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="h-11 text-sm bg-card border-border"
                autoComplete="organization"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground" htmlFor="wl-email">Email</label>
              <Input
                id="wl-email"
                type="email"
                required
                placeholder="din@email.dk"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 text-sm bg-card border-border"
                autoComplete="email"
              />
            </div>

            <Button type="submit" disabled={loading} className="h-11 w-full text-sm mt-2">
              {loading ? "Et øjeblik..." : "Skriv mig op"}
            </Button>

            <p className="text-xs text-muted-foreground pt-1">
              {error ?? "Vi åbner for beta snart. Ingen spam."}
            </p>
          </form>
        )}
      </section>

      <footer className="relative z-10 px-6 md:px-10 py-12 border-t border-border">
        <div className="max-w-[520px] mx-auto text-xs text-muted-foreground">
          <a href="https://gocaptain.dk" className="hover:text-foreground transition-colors">gocaptain.dk</a>
          <span className="mx-2">·</span>
          <a href="mailto:hello@gocaptain.dk" className="hover:text-foreground transition-colors">hello@gocaptain.dk</a>
        </div>
      </footer>
    </main>
  );
}
