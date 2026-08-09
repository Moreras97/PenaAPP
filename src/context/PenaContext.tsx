"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Pena, UserPena } from "@/types/database";
import { createClient } from "@/lib/supabase/client";

export interface PenaMembership {
  pena: Pena;
  userPena: UserPena;
}

interface PenaContextType {
  activeMembership: PenaMembership | null;
  memberships: PenaMembership[];
  activePena: Pena | null;
  activeUserPena: UserPena | null;
  loading: boolean;
  refresh: () => void;
  switchPena: (penaId: string) => void;
}

const PenaContext = createContext<PenaContextType>({
  activeMembership: null,
  memberships: [],
  activePena: null,
  activeUserPena: null,
  loading: true,
  refresh: () => {},
  switchPena: () => {},
});

export function PenaProvider({ children }: { children: ReactNode }) {
  const [memberships, setMemberships] = useState<PenaMembership[]>([]);
  const [activePenaId, setActivePenaId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadPenas = async () => {
    const supabase = createClient();
    if (!supabase) { setLoading(false); return; }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setMemberships([]); setActivePenaId(null); setLoading(false); return; }

    const { data } = await supabase
      .from("users_penas")
      .select("*, penas(*)")
      .eq("user_id", user.id);

    if (data && data.length > 0) {
      const list: PenaMembership[] = data.map((row: any) => ({
        pena: row.penas as Pena,
        userPena: {
          id: row.id,
          user_id: row.user_id,
          pena_id: row.pena_id,
          nombre_completo: row.nombre_completo,
          apodo: row.apodo,
          rol: row.rol,
          cuota_pagada: row.cuota_pagada,
          created_at: row.created_at,
        },
      }));
      setMemberships(list);
      if (!activePenaId) setActivePenaId(list[0].pena.id);
    } else {
      setMemberships([]);
      setActivePenaId(null);
    }
    setLoading(false);
  };

  useEffect(() => { loadPenas(); }, []);

  const switchPena = (penaId: string) => setActivePenaId(penaId);

  const activeMembership = activePenaId
    ? memberships.find((m) => m.pena.id === activePenaId) || null
    : null;

  return (
    <PenaContext.Provider
      value={{
        activeMembership,
        memberships,
        activePena: activeMembership?.pena || null,
        activeUserPena: activeMembership?.userPena || null,
        loading,
        refresh: loadPenas,
        switchPena,
      }}
    >
      {children}
    </PenaContext.Provider>
  );
}

export const usePena = () => useContext(PenaContext);
