import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  tenantId: string | null;
  cargo: string | null;
  tenantNome: string | null;
  isMaster: boolean;
  signIn: (email: string, senha: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  tenantId: null,
  cargo: null,
  tenantNome: null,
  isMaster: false,
  signIn: async () => ({ error: null }),
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [cargo, setCargo] = useState<string | null>(null);
  const [tenantNome, setTenantNome] = useState<string | null>(null);

  async function resolveProfile(uid: string) {
    const { data, error } = await supabase
      .from("profiles")
      .select("tenant_id, cargo, nome")
      .eq("id", uid)
      .maybeSingle();
    if (error) {
      console.error("Erro ao resolver profile:", error.message);
      return;
    }
    if (data) {
      setTenantId(data.tenant_id ?? null);
      setCargo(data.cargo ?? null);
      if (data.tenant_id) {
        const { data: tenant } = await supabase
          .from("tenants")
          .select("nome")
          .eq("id", data.tenant_id)
          .maybeSingle();
        if (tenant) setTenantNome(tenant.nome ?? null);
      }
    }
  }

  useEffect(() => {
    // Sessão inicial
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null;
      setUser(u);
      if (u) resolveProfile(u.id);
      setLoading(false);
    });

    // Escuta mudanças de sessão
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        resolveProfile(session.user.id);
      } else {
        setTenantId(null);
        setCargo(null);
        setTenantNome(null);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, senha: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) return { error: error.message };
    return { error: null };
  };

  const signOutAsync = async () => {
    await supabase.auth.signOut();
  };

  const isMaster = cargo === "super_admin";

  return (
    <AuthContext.Provider
      value={{ user, loading, tenantId, cargo, tenantNome, isMaster, signIn, signOut: signOutAsync }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}