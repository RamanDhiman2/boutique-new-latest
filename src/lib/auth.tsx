import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "./supabase";

type AuthContextType = {
  user: User | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  // On a shared device the next person must not see the previous customer's
  // measurements, orders or addresses.
  const clearPersonalData = useCallback(() => {
    queryClient.removeQueries({ queryKey: ["orders"] });
    queryClient.removeQueries({ queryKey: ["addresses"] });
    queryClient.removeQueries({ queryKey: ["is-admin"] });
    queryClient.removeQueries({ queryKey: ["admin-orders"] });
    queryClient.removeQueries({ queryKey: ["admin-customers"] });
    try {
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (
          key === "sm-tailor-slip" ||
          key === "sm-tailor-slips-history" ||
          key === "sm-bag" ||
          key === "sm-wish" ||
          key.startsWith("order_notif_sent_") ||
          key.startsWith("default_addr_") ||
          key.startsWith("deleted_addrs_")
        ) {
          localStorage.removeItem(key);
        }
      }
    } catch {
      // storage unavailable
    }
  }, [queryClient]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === "SIGNED_OUT") clearPersonalData();
    });

    return () => subscription.unsubscribe();
  }, [clearPersonalData]);

  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
