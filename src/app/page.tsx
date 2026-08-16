"use client";

import { usePena } from "@/context/PenaContext";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Crown, Plus, LogIn, CalendarDays, Lock, Clock, Users, Shield, User, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

function PenaSelector({ memberships, activePena, switchPena }: { memberships: any[]; activePena: any; switchPena: (id: string) => void }) {
  if (memberships.length <= 1) return null;
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-2">
        <Users className="w-4 h-4 text-[var(--text-secondary)]" />
        <span className="text-sm font-semibold text-[var(--text-secondary)]">Tus peñas</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {memberships.map((m) => {
          const isActive = m.pena.id === activePena?.id;
          const RoleIcon = m.userPena.rol === "admin" ? Crown : m.userPena.rol === "mod" ? Shield : User;
          return (
            <button
              key={m.pena.id}
              onClick={() => switchPena(m.pena.id)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-[var(--radius-md)] border transition-colors",
                isActive ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]" : "bg-[var(--bg-surface)] border-[var(--border-color)] hover:bg-[var(--bg-page)]"
              )}
            >
              {m.pena.escudo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.pena.escudo_url} alt={m.pena.nombre} className="w-5 h-5 rounded-full border border-[var(--border-color)]" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center text-[10px] font-bold">
                  {m.pena.nombre.charAt(0).toUpperCase()}
                </div>
              )}
              <span>{m.pena.nombre}</span>
              <RoleIcon className="w-3.5 h-3.5 opacity-70" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function HomePage() {
  const { activePena, memberships, switchPena, loading } = usePena();
  const router = useRouter();
  const [fiestas, setFiestas] = useState<any[]>([]);
  const [loadingFiestas, setLoadingFiestas] = useState(true);

  useEffect(() => {
    if (!activePena) { setLoadingFiestas(false); return; }
    const supabase = createClient();
    if (!supabase) { setLoadingFiestas(false); return; }
    supabase.from("fiestas")
      .select("*").eq("pena_id", activePena.id)
      .order("fecha_inicio", { ascending: false })
      .then(({ data }) => { setFiestas(data || []); setLoadingFiestas(false); });
  }, [activePena]);

  if (loading || loadingFiestas) return <Spinner />;

  if (!activePena) return <OnboardingScreen />;

  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      <header className="bg-[var(--bg-surface)] border-b border-[var(--border-color)]">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {activePena.escudo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={activePena.escudo_url} alt={activePena.nombre} className="w-9 h-9 rounded-full border border-[var(--border-color)] object-cover" />
            ) : (
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: activePena.color_primary || "var(--color-primary)" }}>
                {activePena.nombre.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="font-bold text-lg">{activePena.nombre}</span>
          </div>
          <div className="flex gap-2">
            <Link href="/pena/crear" className="flex items-center gap-1 px-3 py-1.5 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-[var(--radius-md)] text-sm font-medium hover:bg-[var(--bg-page)] transition-colors">
              <Plus className="w-4 h-4" /> Crear peña
            </Link>
            <Link href="/pena/unirse" className="flex items-center gap-1 px-3 py-1.5 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-[var(--radius-md)] text-sm font-medium hover:bg-[var(--bg-page)] transition-colors">
              <LogIn className="w-4 h-4" /> Unirme
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <PenaSelector memberships={memberships} activePena={activePena} switchPena={switchPena} />

        {fiestas.length === 0 ? (
          <Card className="text-center py-12">
            <Sparkles className="w-12 h-12 mx-auto text-[var(--text-secondary)] mb-4" />
            <h1 className="text-xl font-bold">Aún no hay fiestas</h1>
            <p className="mt-2">El organizador de la peña tiene que crear la primera fiesta para empezar a organizar.</p>
            {activePena && (
              <Link href={`/fiesta/${activePena.id}/admin`} className="inline-block mt-5">
                <button className="px-5 py-2.5 bg-[var(--color-primary)] text-white font-semibold rounded-[var(--radius-md)] hover:bg-[var(--color-primary-hover)] transition-colors">
                  Crear la primera fiesta
                </button>
              </Link>
            )}
          </Card>
        ) : (
          <>
            <h1 className="text-xl font-bold mb-4">Fiestas de {activePena.nombre}</h1>
            <div className="space-y-3">
              {fiestas.map((f: any) => {
                const pasada = new Date(f.fecha_fin) < new Date();
                const cerrada = !!f.locked;
                return (
                  <Link key={f.id} href={`/fiesta/${f.id}`}>
                    <Card className={cn("hover:border-[var(--color-primary)] transition-colors", pasada && "opacity-60")}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{f.nombre}</p>
                          <p className="text-sm text-[var(--text-secondary)]">{formatFecha(f.fecha_inicio)} → {formatFecha(f.fecha_fin)}</p>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          {cerrada && <Badge variant="danger"><Lock className="w-3 h-3 mr-1" /> Cerrada</Badge>}
                          {pasada && !cerrada && <Badge variant="default"><Clock className="w-3 h-3 mr-1" /> Finalizada</Badge>}
                          {!pasada && !cerrada && <Badge variant="success"><CalendarDays className="w-3 h-3 mr-1" /> Abierta</Badge>}
                        </div>
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function formatFecha(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("es-ES", { day: "numeric", month: "long" });
  } catch {
    return iso;
  }
}

function OnboardingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[var(--bg-page)]">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="mx-auto w-20 h-20 bg-[var(--color-primary)] rounded-full flex items-center justify-center">
          <Crown className="w-10 h-10 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Peña App</h1>
          <p className="mt-3">Organiza las fiestas de tu peña sin líos: quién viene, qué se come, cuánto se gasta y todo en un solo sitio.</p>
        </div>
        <div className="space-y-3">
          <Link href="/pena/crear" className="block w-full">
            <button className="w-full py-3 bg-[var(--color-primary)] text-white font-semibold rounded-[var(--radius-md)] hover:bg-[var(--color-primary-hover)] transition-colors">
              Crear una peña
            </button>
          </Link>
          <Link href="/pena/unirse" className="block w-full">
            <button className="w-full py-3 bg-[var(--bg-surface)] border border-[var(--border-color)] font-semibold rounded-[var(--radius-md)] hover:bg-[var(--bg-page)] transition-colors">
              Unirme con un ID
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
