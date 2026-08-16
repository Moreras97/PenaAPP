"use client";

import { useState, useEffect, useCallback } from "react";
import { usePena } from "@/context/PenaContext";
import { createClient } from "@/lib/supabase/client";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CalendarCheck, Utensils, Wallet, MessageCircle, ShoppingCart, CalendarDays, CheckCircle2, Circle, Users, Lock, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FiestaData {
  id: string;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  locked?: boolean;
  max_dias_sueltos?: number | null;
}

export default function FiestaHome() {
  const { activePena: pena, activeUserPena: userPena, triggerRefresh } = usePena();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();
  const fiestaId = params.id;

  const [fiesta, setFiesta] = useState<FiestaData | null>(null);
  const [apuntados, setApuntados] = useState<any[]>([]);
  const [miAsistencia, setMiAsistencia] = useState<any>(null);
  const [dias, setDias] = useState<any[]>([]);
  const [nPropuestas, setNPropuestas] = useState(0);
  const [nGastos, setNGastos] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!fiestaId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/asistencia?fiestaId=" + fiestaId + "&_t=" + Date.now(), { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        if (json.fiesta) setFiesta(json.fiesta);
        setApuntados(json.asistencias || []);
        setDias(json.dias || []);
        if (userPena) {
          setMiAsistencia((json.asistencias || []).find((a: any) => a.user_pena_id === userPena.id) || null);
        }
      }
    } catch {}
    if (supabase && pena) {
      const [{ count: pc }, { count: gc }] = await Promise.all([
        supabase.from("propuestas_menu").select("*", { count: "exact", head: true }).eq("fiesta_id", fiestaId),
        supabase.from("gastos").select("*", { count: "exact", head: true }).eq("pena_id", pena.id),
      ]);
      setNPropuestas(pc || 0);
      setNGastos(gc || 0);
    }
    setLoading(false);
  }, [fiestaId, supabase, pena, userPena]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return <div className="py-20 text-center text-[var(--text-secondary)]">Cargando la fiesta...</div>;
  }

  if (!fiesta) {
    return (
      <Card className="text-center py-12">
        <h1 className="text-xl font-bold">No se encontró la fiesta</h1>
        <p className="mt-2">Esta fiesta no existe o no pertenece a tu peña.</p>
        <div className="mt-5">
          <Link href="/">
            <Button variant="outline">Volver al inicio</Button>
          </Link>
        </div>
      </Card>
    );
  }

  const pasada = new Date(fiesta.fecha_fin) < new Date();
  const totalApuntados = new Set(apuntados.map((a: any) => a.user_pena_id)).size;
  const bebidaLabel = miAsistencia?.bebida === "nada" || !miAsistencia?.bebida
    ? "Sin bebida"
    : (miAsistencia?.bebida === "cubatas" ? "Cubatas" : miAsistencia?.bebida?.charAt(0).toUpperCase() + miAsistencia?.bebida?.slice(1));

  const steps = [
    {
      done: !!miAsistencia,
      href: `/fiesta/${fiestaId}/asistencia`,
      icon: CalendarCheck,
      title: "¿Vengo?",
      desc: miAsistencia ? "Estás apuntado a la fiesta" : "Apúntate para que el resto sepa que vienes",
    },
    {
      done: nPropuestas > 0,
      href: `/fiesta/${fiestaId}/propuestas`,
      icon: Utensils,
      title: "¿Qué se come?",
      desc: nPropuestas > 0 ? "Hay propuestas de comida y cena" : "Propón o mira las comidas y cenas",
    },
    {
      done: nGastos > 0,
      href: `/fiesta/${fiestaId}/finanzas`,
      icon: Wallet,
      title: "Dinero",
      desc: nGastos > 0 ? "Hay gastos registrados" : "Lleva el control del dinero de la peña",
    },
    {
      done: false,
      href: `/fiesta/${fiestaId}/lista-compra`,
      icon: ShoppingCart,
      title: "La compra",
      desc: "Consulta la lista de la compra generada",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-[var(--radius-lg)] p-5 shadow-[var(--shadow-sm)]">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold truncate">{fiesta.nombre}</h1>
            <p className="text-sm mt-1 flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4" />
              {formatFecha(fiesta.fecha_inicio)} → {formatFecha(fiesta.fecha_fin)}
            </p>
            <div className="mt-2 flex gap-1.5 flex-wrap">
              {fiesta.locked && <Badge variant="danger"><Lock className="w-3 h-3 mr-1" /> Cerrada</Badge>}
              {pasada && !fiesta.locked && <Badge variant="default"><Clock className="w-3 h-3 mr-1" /> Finalizada</Badge>}
              {!pasada && !fiesta.locked && <Badge variant="success">Abierta</Badge>}
              <Badge variant="primary"><Users className="w-3 h-3 mr-1" /> {totalApuntados} apuntados</Badge>
            </div>
          </div>
        </div>
      </div>

      <Card className="border-2 !border-[var(--color-primary)]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold">¿Vas a venir?</h2>
            <p className="text-sm mt-0.5">
              {miAsistencia
                ? <>Estás apuntado · <span className="font-medium text-[var(--text-primary)]">{bebidaLabel}</span></>
                : "Apúntate y di qué vas a beber para preparar la compra"}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Link href={`/fiesta/${fiestaId}/asistencia`}>
              <Button size="lg" fullWidth>
                <CalendarCheck className="w-5 h-5" /> {miAsistencia ? "Ver mi inscripción" : "Me apunto"}
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      <div>
        <h2 className="text-base font-semibold mb-3">Pasos de la fiesta</h2>
        <div className="space-y-2.5">
          {steps.map((s) => (
            <Link key={s.href} href={s.href}>
              <Card className={cn("flex items-center gap-3 hover:border-[var(--color-primary)] transition-colors", s.done && "bg-[var(--color-primary-soft)]/50")}>
                {s.done
                  ? <CheckCircle2 className="w-5 h-5 text-[var(--color-primary)] shrink-0" />
                  : <Circle className="w-5 h-5 text-[var(--text-secondary)] shrink-0" />}
                <s.icon className="w-5 h-5 text-[var(--text-secondary)] shrink-0" />
                <div className="min-w-0">
                  <p className="font-semibold">{s.title}</p>
                  <p className="text-sm">{s.desc}</p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link href={`/fiesta/${fiestaId}/chat`}>
          <Card className="flex items-center gap-3 hover:border-[var(--color-primary)] transition-colors">
            <MessageCircle className="w-5 h-5 text-[var(--color-primary)] shrink-0" />
            <div>
              <p className="font-semibold">Charlar</p>
              <p className="text-sm">Hablemos de la fiesta entre todos</p>
            </div>
          </Card>
        </Link>
        <Link href={`/fiesta/${fiestaId}/calculadora`}>
          <Card className="flex items-center gap-3 hover:border-[var(--color-primary)] transition-colors">
            <Wallet className="w-5 h-5 text-[var(--color-primary)] shrink-0" />
            <div>
              <p className="font-semibold">Presupuesto</p>
              <p className="text-sm">Calcula el presupuesto estimado</p>
            </div>
          </Card>
        </Link>
      </div>
    </div>
  );
}

function formatFecha(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "long" });
  } catch {
    return iso;
  }
}
