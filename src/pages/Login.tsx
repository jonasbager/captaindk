import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Eye, EyeOff } from "lucide-react";
import { Logo } from "@/components/Logo";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useCompany } from "@/hooks/useCompany";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type AuthMode = "login" | "signup" | "forgot";

export default function Login() {
  const { session, loading } = useAuth();
  const { company } = useCompany();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Indlæser...</div>
      </div>
    );
  }

  const handleOAuth = async (provider: "google" | "apple") => {
    setSigningIn(true);
    setError(null);
    try {
      const result = await lovable.auth.signInWithOAuth(provider);
      if (result.error) {
        setError("Der opstod en fejl. Prøv igen.");
      }
    } catch {
      setError("Der opstod en fejl. Prøv igen.");
    } finally {
      setSigningIn(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setSigningIn(true);
    setError(null);

    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast({ title: "Email sendt", description: "Tjek din indbakke for et link til at nulstille din adgangskode." });
        setMode("login");
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast({ title: "Konto oprettet", description: "Tjek din email for at bekræfte din konto." });
        setMode("login");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate(company ? "/dashboard" : "/onboarding", { replace: true });
      }
    } catch (err: any) {
      setError(err.message || "Der opstod en fejl.");
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm mx-auto p-8"
      >
        <div className="flex flex-col items-center gap-6">
          <Logo className="h-14 w-auto" />

          <p className="text-muted-foreground text-sm text-center">
            {mode === "signup" ? "Opret din konto" : mode === "forgot" ? "Nulstil adgangskode" : "Din AI-kaptajn til bogføring"}
          </p>

          {mode !== "forgot" && (
            <div className="w-full space-y-3 mt-2">
              <Button
                variant="outline"
                className="w-full h-12 gap-3 text-sm"
                onClick={() => handleOAuth("google")}
                disabled={signingIn}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                {signingIn ? "Logger ind..." : "Log ind med Google"}
              </Button>


              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border/50" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-background px-3 text-muted-foreground">eller</span>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleEmailAuth} className="w-full space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="din@email.dk"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {mode !== "forgot" && (
              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs">Adgangskode</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            <Button type="submit" className="w-full h-10" disabled={signingIn}>
              <Mail className="h-4 w-4 mr-2" />
              {signingIn
                ? "Vent..."
                : mode === "forgot"
                ? "Send nulstillingslink"
                : mode === "signup"
                ? "Opret konto"
                : "Log ind med email"}
            </Button>
          </form>

          <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground">
            {mode === "login" && (
              <>
                <button onClick={() => { setMode("forgot"); setError(null); }} className="hover:text-foreground transition-colors">
                  Glemt adgangskode?
                </button>
                <button onClick={() => { setMode("signup"); setError(null); }} className="hover:text-foreground transition-colors">
                  Har du ikke en konto? <span className="text-primary">Opret konto</span>
                </button>
              </>
            )}
            {mode === "signup" && (
              <button onClick={() => { setMode("login"); setError(null); }} className="hover:text-foreground transition-colors">
                Har du allerede en konto? <span className="text-primary">Log ind</span>
              </button>
            )}
            {mode === "forgot" && (
              <button onClick={() => { setMode("login"); setError(null); }} className="hover:text-foreground transition-colors">
                ← Tilbage til login
              </button>
            )}
          </div>

          {error && (
            <p className="text-destructive text-sm text-center">{error}</p>
          )}

          <p className="text-xs text-muted-foreground text-center mt-2">
            Ved at logge ind accepterer du vores vilkår og betingelser.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
