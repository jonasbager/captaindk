import { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Compass, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function ResetPassword() {
  const { session, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setIsRecovery(true);
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Indlæser...</div>
      </div>
    );
  }

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast({ title: "Adgangskode opdateret", description: "Du kan nu logge ind med din nye adgangskode." });
      navigate("/dashboard");
    } catch (err: any) {
      toast({ title: "Fejl", description: err.message || "Kunne ikke opdatere adgangskode", variant: "destructive" });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm mx-auto p-8"
      >
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Compass className="w-6 h-6 text-primary" />
            </div>
            <span className="text-2xl font-semibold tracking-tight text-foreground">Captain</span>
          </div>

          <p className="text-muted-foreground text-sm text-center">Indtast din nye adgangskode</p>

          <form onSubmit={handleReset} className="w-full space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs">Ny adgangskode</Label>
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

            <Button type="submit" className="w-full h-10" disabled={updating}>
              {updating ? "Opdaterer..." : "Opdater adgangskode"}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
