"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Pena, UserPena } from "@/types/database";
import { createClient } from "@/lib/supabase/client";

interface PenaContextType {
  pena: Pena | null;
  userPena: UserPena | null;
  loading: boolean;
  refresh: () => void;
}

const PenaContext = createContext<PenaContextType>({
  pena: null,
  userPena: null,
  loading: true,
  refresh: () => {},
});

export function PenaProvider({ children }: { children: ReactNode }) {
  const [pena, setPena] = useState<Pena | null>(null);
  const [userPena, setUserPena] = useState<UserPena | null>(null);
  const [loading, setLoading] = useState(true);

  const loadPena = async () => {
    const supabase = createClient();
    if (!supabase) { setLoading(false); return; }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: up } = await supabase
      .from("users_penas")
      .select("*, penas(*)")
      .eq("user_id", user.id)
      .single();

    if (up) {
      setUserPena(up as unknown as UserPena);
      setPena((up as unknown as { penas: Pena }).penas || null);
    }
    setLoading(false);
  };

  useEffect(() => { loadPena(); }, []);

  return (
    <PenaContext.Provider value={{ pena, userPena, loading, refresh: loadPena }}>
      {children}
    </PenaContext.Provider>
  );
}

export const usePena = () => useContext(PenaContext);
