import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

interface Perfil {
  id: string;
  nome: string;
  email: string;
  perfil: "Admin" | "Comercial" | "Lojas";
  loja: string | null;
  status: string | null;
}

interface AuthContextType {
  user: User | null;
  perfil: Perfil | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);

  const fetchPerfil = async (userId: string) => {
    const { data, error } = await supabase
      .from("perfis")
      .select("*")
      .eq("id", userId)
      .single();
    if (error || !data) {
      setPerfil(null);
      return null;
    }
    const p = data as Perfil;
    setPerfil(p);
    return p;
  };

  useEffect(() => {
    // First get the initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        await fetchPerfil(session.user.id);
      }
      setLoading(false);
      setInitialLoad(false);
    });

    // Then listen for auth changes (but skip during initial load)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          setUser(session.user);
          // Use setTimeout to avoid blocking render with stale state
          setTimeout(async () => {
            await fetchPerfil(session.user.id);
            setLoading(false);
          }, 0);
        } else {
          setUser(null);
          setPerfil(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: "E-mail ou senha incorretos" };
    
    if (data.user) {
      const p = await fetchPerfil(data.user.id);
      if (p && p.status === "Inativo") {
        await supabase.auth.signOut();
        return { error: "Usuário inativo. Entre em contato com o administrador." };
      }
      if (!p) {
        await supabase.auth.signOut();
        return { error: "Perfil não encontrado. Entre em contato com o administrador." };
      }
    }
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setPerfil(null);
  };

  return (
    <AuthContext.Provider value={{ user, perfil, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
