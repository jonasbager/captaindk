import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2 } from "lucide-react";

export default function Waitlist() {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !company.trim() || !email.trim()) return;
    setLoading(true);
    const { error } = await supabase.from("waitlist").insert({
      name: name.trim(),
      company: company.trim(),
      email: email.trim().toLowerCase(),
    });
    setLoading(false);
    if (error) {
      const msg = error.code === "23505"
        ? "Den email er allerede på listen."
        : error.message;
      return toast({ title: "Kunne ikke tilmelde", description: msg, variant: "destructive" });
    }
    setDone(true);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-semibold tracking-tight mb-2">Captain</h1>
          <p className="text-sm text-muted-foreground">
            Din AI-bogholder. Kommer snart.
          </p>
        </div>

        {done ? (
          <div className="border border-border bg-card p-8 text-center space-y-3">
            <CheckCircle2 className="h-10 w-10 mx-auto text-[hsl(var(--success,142_76%_56%))]" />
            <h2 className="text-base font-medium">Du er på listen</h2>
            <p className="text-sm text-muted-foreground">
              Vi sender en besked når Captain er klar til dig.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="border border-border bg-card p-6 space-y-4">
            <div>
              <h2 className="text-base font-medium mb-1">Skriv dig op</h2>
              <p className="text-xs text-muted-foreground">
                Vi inviterer løbende nye brugere ind.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs">Navn</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="company" className="text-xs">Virksomhed</Label>
              <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} required className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-9 text-sm" />
            </div>

            <Button type="submit" disabled={loading} className="w-full h-9 text-sm">
              {loading ? "Tilmelder…" : "Tilmeld waitlist"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
