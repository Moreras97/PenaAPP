"use client";

import { usePena } from "@/context/PenaContext";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Sparkles, Plus, LogIn, CalendarDays, Clock, Lock, Users, Crown, Shield, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function PenaSelector({ memberships, activePena, switchPena }: { memberships: any[]; activePena: any; switchPena: (id: string) => void }) {
  if (memberships.length <= 1) return null;
  return (
    <div className="max-w-2xl mx-auto px-4 mb-4">
      <div className="flex items-center gap-2 mb-2">
        <Users className="w-4 h-4 opacity-50" />
        <span className="text-xs font-bold opacity-50 lowercase">{memberships.length} peñas</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {memberships.map((m) => {
          const isActive = m.pena.id === activePena?.id;
          const Icon = m.userPena.rol === "admin" ? Crown : m.userPena.rol === "mod" ? Shield : User;
          return (
            <button
              key={m.pena.id}
              onClick={() => switchPena(m.pena.id)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 text-sm font-bold lowercase rounded-[var(--radius-md)] border-brutalist shadow-brutalist-sm press-down transition",
                isActive ? "bg-[var(--color-primary)] text-white" : "bg-[var(--bg-surface)]"
              )}
            >
              {m.pena.escudo_url ? (
                <img src={m.pena.escudo_url} alt={m.pena.nombre} className="w-5 h-5 rounded-full border border-[var(--border-color)]" />
              ) : (
                <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold uppercase", isActive ? "bg-white/20" : "bg-[var(--color-primary)]")}>
                  <span className={isActive ? "text-white" : "text-white"}>{m.pena.nombre[0]}</span>
                </div>
              )}
              <span>{m.pena.nombre}</span>
              <Icon className="w-3 h-3 opacity-60" />
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

  if (loading || loadingFiestas) return <LoadingScreen />;

  if (!activePena) return <OnboardingScreen />;

  if (fiestas.length === 0) {
    return (
      <div className="min-h-screen bg-[var(--bg-page)]">
        <nav className="bg-[var(--bg-surface)] border-b-2 border-[var(--border-color)] shadow-brutalist mx-4 rounded-[var(--radius-lg)]">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              {activePena.escudo_url ? (
                <img src={activePena.escudo_url} alt={activePena.nombre} className="w-9 h-9 rounded-full border-2 border-[var(--border-color)] object-cover" />
              ) : (
                <div className="w-9 h-9 bg-[var(--color-primary)] border-2 border-[var(--border-color)] rounded-full flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
              )}
              <span className="font-extrabold text-lg lowercase">{activePena.nombre}</span>
            </Link>
            <div className="flex gap-2">
              <Link href="/pena/crear" className="px-3 py-1.5 bg-[var(--bg-page)] border-brutalist shadow-brutalist-sm rounded-[var(--radius-md)] press-down text-sm font-bold lowercase flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> crear
              </Link>
              <Link href="/pena/unirse" className="px-3 py-1.5 bg-[var(--bg-page)] border-brutalist shadow-brutalist-sm rounded-[var(--radius-md)] press-down text-sm font-bold lowercase flex items-center gap-1">
                <LogIn className="w-3.5 h-3.5" /> unirse
              </Link>
            </div>
          </div>
        </nav>
        <PenaSelector memberships={memberships} activePena={activePena} switchPena={switchPena} />
        <main className="max-w-lg mx-auto px-4 pt-12 text-center space-y-6">
          <CalendarDays className="w-16 h-16 mx-auto opacity-30" />
          <h2 className="text-2xl font-extrabold lowercase">no hay fiestas todavía</h2>
          <p className="text-[var(--text-secondary)]">el administrador debe crear la primera fiesta</p>
          <Link href={`/fiesta/${activePena.id}/admin`} className="inline-block">
            <Button variant="primary" size="lg">ir a administración</Button>
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      <nav className="bg-[var(--bg-surface)] border-b-2 border-[var(--border-color)] shadow-brutalist mx-4 rounded-[var(--radius-lg)]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            {activePena.escudo_url ? (
              <img src={activePena.escudo_url} alt={activePena.nombre} className="w-9 h-9 rounded-full border-2 border-[var(--border-color)] object-cover" />
            ) : (
              <div className="w-9 h-9 bg-[var(--color-primary)] border-2 border-[var(--border-color)] rounded-full flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
            )}
            <span className="font-extrabold text-lg lowercase" style={{ color: activePena.color_primary }}>{activePena.nombre}</span>
          </Link>
          <div className="flex gap-2">
            <Link href="/pena/crear" className="px-3 py-1.5 bg-[var(--bg-page)] border-brutalist shadow-brutalist-sm rounded-[var(--radius-md)] press-down text-sm font-bold lowercase flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> crear
            </Link>
            <Link href="/pena/unirse" className="px-3 py-1.5 bg-[var(--bg-page)] border-brutalist shadow-brutalist-sm rounded-[var(--radius-md)] press-down text-sm font-bold lowercase flex items-center gap-1">
              <LogIn className="w-3.5 h-3.5" /> unirse
            </Link>
          </div>
        </div>
      </nav>

      <PenaSelector memberships={memberships} activePena={activePena} switchPena={switchPena} />

      <main className="max-w-2xl mx-auto px-4 pt-4 pb-8">
        <div className="flex items-center gap-3 mb-6">
          <CalendarDays className="w-6 h-6" />
          <h2 className="text-xl font-extrabold lowercase">fiestas de {activePena.nombre}</h2>
        </div>

        <div className="space-y-3">
          {fiestas.map((f: any) => {
            const pasada = new Date(f.fecha_fin) < new Date();
            const cerrada = !!f.locked;
            return (
              <Link key={f.id} href={`/fiesta/${f.id}`}>
                <Card className={"press-down cursor-pointer " + (pasada ? "opacity-60" : "")}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold">{f.nombre}</p>
                      <p className="text-sm">{f.fecha_inicio} → {f.fecha_fin}</p>
                    </div>
                    <div className="flex gap-2">
                      {cerrada && <Badge variant="danger"><Lock className="w-3 h-3 mr-0.5" /> Cerrada</Badge>}
                      {pasada && !cerrada && <Badge variant="default"><Clock className="w-3 h-3 mr-0.5" /> Finalizada</Badge>}
                      {!pasada && !cerrada && <Badge variant="success">Abierta</Badge>}
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-page)]">
      <div className="w-10 h-10 border-3 border-[var(--border-color)] border-t-[var(--color-primary)] rounded-full animate-spin" />
    </div>
  );
}

function OnboardingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[var(--bg-page)] relative overflow-hidden">
      <svg className="deco top-10 left-10 w-24 h-24 text-[var(--color-yellow)]" viewBox="0 0 40 40"><path d="M20 0l5 15 15 5-15 5-5 15-5-15L0 20l15-5z" fill="currentColor"/></svg>
      <svg className="deco bottom-20 right-16 w-16 h-16 text-[var(--color-teal)] deco-spin" viewBox="0 0 40 40"><path d="M20 0l5 15 15 5-15 5-5 15-5-15L0 20l15-5z" fill="currentColor"/></svg>
      <svg className="deco top-1/3 right-8 w-14 h-14 text-[var(--color-pink)]" viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" fill="currentColor"/></svg>

      <div className="relative z-10 max-w-md w-full text-center space-y-8">
        <div className="mx-auto w-20 h-20 bg-[var(--color-yellow)] border-brutalist shadow-brutalist rounded-full flex items-center justify-center">
          <Sparkles className="w-10 h-10" />
        </div>
        <div>
          <h1 className="text-4xl font-extrabold lowercase">peña app</h1>
          <p className="text-lg mt-2">gestiona las fiestas de tu peña: asistencia, chat en tiempo real, finanzas, comidas y más.</p>
        </div>
        <div className="space-y-3">
          <Link href="/pena/crear" className="block w-full">
            <Button variant="primary" size="lg" className="w-full">crear una peña</Button>
          </Link>
          <Link href="/pena/unirse" className="block w-full">
            <Button variant="outline" size="lg" className="w-full">unirse a una peña</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
