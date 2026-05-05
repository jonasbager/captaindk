import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { ArrowRight, Sparkles } from "lucide-react";

export default function Landing() {
  // Force dark theme on this public page
  useEffect(() => {
    const root = document.documentElement;
    const had = root.classList.contains("dark");
    root.classList.add("dark");
    return () => {
      if (!had) root.classList.remove("dark");
    };
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground antialiased">
      {/* Ambient background glows */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-primary/20 blur-[140px]" />
        <div className="absolute top-1/3 -right-40 h-[480px] w-[480px] rounded-full bg-primary/10 blur-[160px]" />
        <div className="absolute bottom-0 left-1/3 h-[360px] w-[360px] rounded-full bg-primary/10 blur-[140px]" />
        {/* grid */}
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage:
              "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          }}
        />
      </div>

      {/* Top bar */}
      <header className="relative z-10 px-6 md:px-10 pt-8 flex items-center justify-between">
        <Logo variant="auto" className="h-14 w-auto" />
        <Link
          to="/waitlist"
          className="text-xs md:text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Få adgang →
        </Link>
      </header>

      {/* Hero */}
      <section className="relative z-10 px-6 md:px-10 pt-20 md:pt-32 pb-24 md:pb-40 max-w-[820px] mx-auto animate-fade-in">
        {/* Eyebrow badge */}
        <div className="inline-flex items-center gap-2 border border-border bg-card/60 backdrop-blur px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          <Sparkles className="h-3 w-3 text-primary" />
          <span>Beta åbner snart</span>
        </div>

        <h1 className="mt-8 text-[48px] leading-[1.02] md:text-[88px] md:leading-[0.98] font-semibold tracking-[-0.035em]">
          Kvitteringer ind.
          <br />
          <span className="bg-gradient-to-br from-primary via-primary to-primary/60 bg-clip-text text-transparent">
            Regnskab ud.
          </span>
        </h1>

        <p className="mt-8 text-lg md:text-2xl leading-relaxed text-foreground/80 max-w-[640px]">
          Bogføring, faktura og regnskab. Bygget til dig der driver forretning - ikke til din bogholder. Du skriver, Captain klarer resten. Ingen menuer at lære, ingen konti at huske - bare din hverdag, uden bilagsbunken.
        </p>

        <div className="mt-12 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Button
            asChild
            className="h-12 px-6 text-sm group shadow-[0_0_0_1px_hsl(var(--primary)/0.4),0_8px_40px_-8px_hsl(var(--primary)/0.6)]"
          >
            <Link to="/waitlist">
              Skriv mig op
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
          <span className="text-xs text-muted-foreground">
            Tager 8 sekunder. Ingen spam. Ingen bogholdersnak.
          </span>
        </div>
      </section>

      {/* Three-line manifesto */}
      <section className="relative z-10 px-6 md:px-10 pb-24 max-w-[820px] mx-auto">
        <div className="grid md:grid-cols-3 gap-px bg-border border border-border">
          {[
            {
              k: "01",
              t: "AI først",
              d: "Skriv. Spørg. Bed om det. Captain svarer i ord, ikke i menuer.",
            },
            {
              k: "02",
              t: "Din arbejdsgang",
              d: "Mail, foto, drag-and-drop. Captain møder dig der hvor bilagene allerede er.",
            },
            {
              k: "03",
              t: "Bogholderiet usynligt",
              d: "Konteringer, moms, årsrapport. Det sker. Du godkender. Slut.",
            },
          ].map((b) => (
            <div key={b.k} className="bg-background p-6 md:p-7">
              <div className="font-mono text-[11px] text-primary">{b.k}</div>
              <div className="mt-3 text-base font-medium">{b.t}</div>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {b.d}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Chat preview */}
      <section className="relative z-10 px-6 md:px-10 pb-32 max-w-[820px] mx-auto">
        <div className="border border-border bg-card/80 backdrop-blur overflow-hidden shadow-[0_30px_80px_-30px_hsl(var(--primary)/0.25)]">
          <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-border">
            <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
            <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
            <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
            <span className="ml-3 text-[11px] text-muted-foreground font-mono">
              captain — onsdag 14:22
            </span>
          </div>

          <div className="p-5 md:p-6 space-y-4 text-sm">
            <div className="flex justify-end">
              <div className="max-w-[80%] bg-secondary text-secondary-foreground px-3.5 py-2.5 rounded-md">
                Bogfør den her kvittering fra Elgiganten
              </div>
            </div>

            <div className="flex">
              <div className="max-w-[85%] space-y-3">
                <div className="text-foreground/90">
                  Fundet:{" "}
                  <span className="font-medium">Elgiganten</span>, 15. apr 2026.
                  Bogført som{" "}
                  <span className="font-mono">3617 Kontorartikler</span>.
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

            <div className="flex justify-end">
              <div className="max-w-[80%] bg-secondary text-secondary-foreground px-3.5 py-2.5 rounded-md">
                Perfekt. Hvor meget moms har jeg til gode i Q2?
              </div>
            </div>

            <div className="flex">
              <div className="max-w-[85%]">
                <div className="text-foreground/90">
                  Du får{" "}
                  <span className="font-mono text-primary">12.847 kr</span>{" "}
                  retur. Skal jeg sende angivelsen?
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA repeat */}
      <section className="relative z-10 px-6 md:px-10 pb-24 max-w-[820px] mx-auto">
        <div className="border border-border bg-card/60 backdrop-blur p-8 md:p-12 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="text-xl md:text-2xl font-medium tracking-tight">
              Klar til at lægge bogføringen fra dig?
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Vi inviterer i bølger. De første får mest af vores tid.
            </p>
          </div>
          <Button asChild className="h-11 px-5 text-sm group whitespace-nowrap">
            <Link to="/waitlist">
              Skriv mig op
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-6 md:px-10 py-12 border-t border-border">
        <div className="max-w-[820px] mx-auto text-sm text-muted-foreground space-y-2">
          <p>Captain er lavet i København af folk der hader bogføring.</p>
          <p className="text-xs">
            <a
              href="https://gocaptain.dk"
              className="hover:text-foreground transition-colors"
            >
              gocaptain.dk
            </a>
            <span className="mx-2">·</span>
            <a
              href="mailto:hello@gocaptain.dk"
              className="hover:text-foreground transition-colors"
            >
              hello@gocaptain.dk
            </a>
          </p>
        </div>
      </footer>
    </main>
  );
}
