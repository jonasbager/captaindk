import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Compass } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { lovable } from "@/integrations/lovable";

export default function Login() {
  const { session, loading } = useAuth();
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Indlæser...</div>
      </div>
    );
  }

  if (session) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSignIn = async (provider: "google") => {
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm mx-auto p-8"
      >
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Compass className="w-6 h-6 text-primary" />
            </div>
            <span className="text-2xl font-semibold tracking-tight text-foreground">Captain</span>
          </div>

          <p className="text-muted-foreground text-sm text-center">
            Din AI-kaptajn til bogføring
          </p>

          <div className="w-full space-y-3 mt-4">
            <Button
              variant="outline"
              className="w-full h-12 gap-3 text-sm"
              onClick={() => handleSignIn("google")}
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
          </div>

          {error && (
            <p className="text-destructive text-sm text-center">{error}</p>
          )}

          <p className="text-xs text-muted-foreground text-center mt-4">
            Ved at logge ind accepterer du vores vilkår og betingelser.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
