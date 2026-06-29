import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Behold samme session-objekt når kun token fornyes (samme bruger). Ellers
    // skifter `user`-referencen ved hvert tab-skift (Supabase forny-token), hvilket
    // får afhængige hooks til at re-fetche og siden til at vise fuldskærms-loader
    // (og tabe ugemte ændringer). Opdater kun state når bruger-id faktisk ændrer sig.
    const apply = (next: Session | null) => {
      setSession((prev) => {
        const prevId = prev?.user?.id ?? null;
        const nextId = next?.user?.id ?? null;
        return prevId === nextId ? prev : next;
      });
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        apply(session);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      apply(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
