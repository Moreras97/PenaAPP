"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePena } from "@/context/PenaContext";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { Fiesta, DiaFiesta, Asistencia } from "@/types/database";
import { guardarAsistencia, cancelarAsistencia } from "./actions";
import { Trash2, Beer, Wine, GlassWater, Martini } from "lucide-react";

type Bebida = "cerveza" | "tinto" | "refresco" | "agua" | "nada" | "cubatas";
type TipoAlcohol = "ron" | "whisky" | "vodka" | "ginebra";

const BEBIDA_LABELS: Record<Bebida, string> = {
  cerveza: "Cerveza", tinto: "Tinto", refresco: "Refresco", agua: "Agua", nada: "Sin bebida", cubatas: "Cubatas"
};

const BEBIDA_ICONS: Record<Bebida, typeof Beer> = {
  cerveza: Beer, tinto: Wine, refresco: GlassWater, agua: GlassWater, nada: Trash2, cubatas: Martini
};

const MARCAS: Record<TipoAlcohol, string[]> = {
  ron: ["Brugal", "Barceló", "Cacique", "Havana Club", "Diplomático", "Santa Teresa", "Arehucas", "Negrita", "Legendario", "Pampero"],
  whisky: ["Johnnie Walker", "Ballantine's", "DYC", "J&B", "Jack Daniel's", "Chivas Regal", "Cutty Sark", "White Horse", "Cardhu", "VAT 69"],
  vodka: ["Absolut", "Smirnoff", "Eristoff", "Grey Goose", "Cîroc", "Stolichnaya", "Belvedere", "Ketel One", "Moskovskaya", "Svedka"],
  ginebra: ["Larios", "Beefeater", "Tanqueray", "Bombay Sapphire", "Puerto de Indias", "Seagram's", "Nordés", "Hendrick's", "Martin Miller's", "Bulldog"],
};

const MEZCLAS = ["Coca-Cola", "Coca-Cola Zero", "Fanta Naranja", "Fanta Limón", "Tónica", "Sprite", "Seven Up", "Nestea", "Red Bull", "Agua con gas"];

export default function AsistenciaPage() {
  const { activePena: pena, activeUserPena: userPena, triggerRefresh } = usePena();
  const router = useRouter(); const params = useParams<{ id: string }>();
  const fiestaId = params.id;
  const supabase = createClient();
  const [fiestaActiva, setFiestaActiva] = useState<Fiesta | null>(null);
  const [dias, setDias] = useState<DiaFiesta[]>([]);
  const [miAsistencia, setMiAsistencia] = useState<Asistencia | null>(null);
  const [diasSeleccionados, setDiasSeleccionados] = useState<string[]>([]);
  const [maxDiasSueltos, setMaxDiasSueltos] = useState<number>(999);
  const [bebida, setBebida] = useState<Bebida>("cerveza");
  const [tipo, setTipo] = useState<"semana_completa" | "dias_sueltos">("dias_sueltos");
  const [tipoAlcohol, setTipoAlcohol] = useState<TipoAlcohol>("ron");
  const [marca, setMarca] = useState("");
  const [mezcla, setMezcla] = useState("");
  const [dashboard, setDashboard] = useState<{ dia: string; total: number; cervezas: number; tintos: number; refrescos: number; aguas: number; cubatas: number; rones: number; vodkas: number; whiskies: number; ginebras: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [debug, setDebug] = useState("");

  const loadData = useCallback(async () => {
    if (!pena) { setDebug("no pena"); return; }
    if (!fiestaId) { setDebug("no fiestaId: " + JSON.stringify(fiestaId)); setLoading(false); return; }
    setLoading(true);
    setDebug("cargando...");

    // try
    const res = await fetch("/api/asistencia?fiestaId=" + fiestaId);
      if (!res.ok) { setDebug("API error: " + res.status); setLoading(false); return; }
      const json = await res.json();
      const { fiesta, asistencias, dias } = json;
      setDebug("OK: fiesta=" + (fiesta?.nombre||"?") + ", asistencias=" + (asistencias?.length||0) + ", dias=" + (dias?.length||0));

    if (fiesta) {
      setFiestaActiva(fiesta);
      const mds = (fiesta as any).max_dias_sueltos;
      setMaxDiasSueltos(mds === null || mds === undefined ? 0 : mds);
    }

    if (fiesta && dias) {
      const d = dias || [];
      setDias(d);

      if (userPena) {
        const as = (asistencias || []).find((a: any) => a.user_pena_id === userPena.id) || null;
        if (as) {
          setMiAsistencia(as as unknown as Asistencia);
          setTipo(as.tipo);
          setBebida((as.bebida as Bebida) || "cerveza");
          const raw = as as any;
          if (raw.tipo_alcohol) setTipoAlcohol(raw.tipo_alcohol as TipoAlcohol);
          if (raw.marca_alcohol) setMarca(raw.marca_alcohol);
          if (raw.mezcla) setMezcla(raw.mezcla);
          setDiasSeleccionados((as as unknown as { asistencia_dias: { dia_fiesta_id: string }[] }).asistencia_dias?.map(ad => ad.dia_fiesta_id) || []);
        } else {
          setTipo("dias_sueltos");
          setDiasSeleccionados([]);
          setBebida("cerveza");
          setTipoAlcohol("ron");
          setMarca("");
          setMezcla("");
        }
      }

      const stats = asistencias || [];
      if (stats) {
        const diasArr = d || [];
        if (diasArr.length > 0) {
          const daily = diasArr.map((dia: any) => {
            const sem = stats.filter((s: any) => s.tipo === "semana_completa").length;
            const suelt = stats.filter((s: any) => s.tipo === "dias_sueltos" && s.asistencia_dias?.some((ad: any) => ad.dia_fiesta_id === dia.id)).length;
            const total = sem + suelt;
            const fil = (arr: any[]) => arr.filter((s: any) => s.tipo === "semana_completa" || s.asistencia_dias?.some((ad: any) => ad.dia_fiesta_id === dia.id));
            const f2 = fil(stats);
            return {
              dia: dia.fecha,
              total,
              cervezas: f2.filter((s: any) => s.bebida === "cerveza").length,
              tintos: f2.filter((s: any) => s.bebida === "tinto").length,
              refrescos: f2.filter((s: any) => s.bebida === "refresco").length,
              aguas: f2.filter((s: any) => s.bebida === "agua").length,
              cubatas: f2.filter((s: any) => s.bebida === "cubatas").length,
              rones: f2.filter((s: any) => s.tipo_alcohol === "ron").length,
              vodkas: f2.filter((s: any) => s.tipo_alcohol === "vodka").length,
              whiskies: f2.filter((s: any) => s.tipo_alcohol === "whisky").length,
              ginebras: f2.filter((s: any) => s.tipo_alcohol === "ginebra").length,
            };
          });
          setDashboard(daily);
        } else {
          const total = stats.length;
          setDashboard([{
            dia: "Total inscritos",
            total,
            cervezas: stats.filter((s: any) => s.bebida === "cerveza").length,
            tintos: stats.filter((s: any) => s.bebida === "tinto").length,
            refrescos: stats.filter((s: any) => s.bebida === "refresco").length,
            aguas: stats.filter((s: any) => s.bebida === "agua").length,
            cubatas: stats.filter((s: any) => s.bebida === "cubatas").length,
            rones: stats.filter((s: any) => s.tipo_alcohol === "ron").length,
            vodkas: stats.filter((s: any) => s.tipo_alcohol === "vodka").length,
            whiskies: stats.filter((s: any) => s.tipo_alcohol === "whisky").length,
            ginebras: stats.filter((s: any) => s.tipo_alcohol === "ginebra").length,
          }]);
        }
      }
    }
    setLoading(false);
  }, [pena, userPena, fiestaId]);

  useEffect(() => { loadData(); }, [loadData]);

  const toggleDia = (diaId: string) => {
    setDiasSeleccionados(prev => {
      if (prev.includes(diaId)) return prev.filter(d => d !== diaId);
      if (maxDiasSueltos > 0 && maxDiasSueltos < 999 && prev.length >= maxDiasSueltos) {
        toast.error("Maximo " + maxDiasSueltos + " dias sueltos permitidos");
        return prev;
      }
      return [...prev, diaId];
    });
  };

  const handleSave = async () => {
    if (!userPena || !fiestaActiva) return;
    const r: any = await guardarAsistencia({
      user_pena_id: userPena.id,
      fiesta_id: fiestaActiva.id,
      tipo,
      bebida: bebida === "nada" ? null : bebida,
      tipo_alcohol: bebida === "cubatas" ? tipoAlcohol : null,
      marca_alcohol: bebida === "cubatas" ? marca : null,
      mezcla: bebida === "cubatas" ? mezcla : null,
      asistencia_id: miAsistencia?.id || null,
      dias: tipo === "dias_sueltos" ? diasSeleccionados : [],
    });
    if (r.error) { toast.error(r.error); return; }
    toast.success("Asistencia guardada");
    loadData();
    triggerRefresh();
  };

  const handleDelete = async () => {
    if (!miAsistencia) return;
    const r: any = await cancelarAsistencia(miAsistencia.id);
    if (r.error) { toast.error(r.error); return; }
    setMiAsistencia(null);
    setDiasSeleccionados([]);
    toast.success("Inscripción cancelada");
    loadData();
    triggerRefresh();
  };

  return (
    <div>
      <PageHeader title="Asistencia" description="Registra tu asistencia y preferencias de bebida" />

      {!fiestaActiva ? (
        <div className="text-center py-12 px-4">
          <p className="text-lg font-bold mb-2">Fiesta no encontrada</p>
          <p className="text-sm">La fiesta solicitada no existe o no pertenece a esta peña.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-lg font-bold mb-4">{fiestaActiva.nombre}</h2>

              <div className="mb-5">
                <label className="block text-sm font-bold mb-2">Tipo de asistencia</label>
                <div className="flex gap-2">
                  <button onClick={() => setTipo("semana_completa")}
                    className={"px-4 py-2 text-sm font-bold rounded-[var(--radius-md)] border-brutalist shadow-brutalist-sm press-down " + (tipo === "semana_completa" ? "bg-[var(--color-primary)] text-white" : "bg-[var(--bg-page)]")}>
                    Semana Completa
                  </button>
                  <button onClick={() => setTipo("dias_sueltos")} disabled={maxDiasSueltos === 0}
                    className={"px-4 py-2 text-sm font-bold rounded-[var(--radius-md)] border-brutalist shadow-brutalist-sm press-down " + (tipo === "dias_sueltos" ? "bg-[var(--color-primary)] text-white" : "bg-[var(--bg-page)]") + (maxDiasSueltos === 0 ? " opacity-50 cursor-not-allowed" : "")}>
                    Dias Sueltos{maxDiasSueltos === 0 ? " (no disponible)" : ""}
                  </button>
                </div>
                {maxDiasSueltos > 0 && maxDiasSueltos < 999 && diasSeleccionados.length >= maxDiasSueltos && tipo === "dias_sueltos" && (
                  <div className="mt-2"><Badge variant="warning">Has llegado al maximo de {maxDiasSueltos} dias sueltos</Badge></div>
                )}
              </div>

              {tipo === "dias_sueltos" && (
                <div className="mb-5">
                  <label className="block text-sm font-bold mb-2">
                    Días ({diasSeleccionados.length} seleccionados)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {dias.map(d => (
                      <button key={d.id} onClick={() => toggleDia(d.id)}
                        className={"px-3 py-1.5 text-sm font-bold rounded-[var(--radius-md)] border-brutalist shadow-brutalist-sm press-down " + (diasSeleccionados.includes(d.id) ? "bg-[var(--color-primary)] text-white" : "bg-[var(--bg-page)]")}>
                        {d.fecha} {d.nombre ? `(${d.nombre})` : ""}
                      </button>
                    ))}
                  </div>
                  {dias.length === 0 && <p className="text-sm mt-2">El admin no ha añadido días a esta fiesta.</p>}
                </div>
              )}

              <div className="mb-5">
                <label className="block text-sm font-bold mb-2">Bebida</label>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(BEBIDA_LABELS) as Bebida[]).map(b => {
                    const Icon = BEBIDA_ICONS[b];
                    return (
                      <button key={b} onClick={() => setBebida(b)}
                        className={"px-3 py-1.5 text-sm font-bold rounded-[var(--radius-md)] border-brutalist shadow-brutalist-sm press-down flex items-center gap-1.5 " + (bebida === b ? "bg-[var(--color-primary)] text-white" : "bg-[var(--bg-page)]")}>
                        <Icon className="w-3.5 h-3.5" /> {BEBIDA_LABELS[b]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {bebida === "cubatas" && (
                <div className="mb-5 bg-[var(--bg-page)] border-brutalist rounded-[var(--radius-md)] p-4 space-y-4">
                  <p className="text-sm font-bold">Detalles del cubata</p>

                  <div>
                    <label className="block text-sm font-bold mb-1.5">Tipo de alcohol</label>
                    <div className="flex flex-wrap gap-2">
                      {(Object.keys(MARCAS) as TipoAlcohol[]).map(t => (
                        <button key={t} onClick={() => { setTipoAlcohol(t); setMarca(""); }}
                          className={"px-3 py-1.5 text-sm font-bold rounded-[var(--radius-md)] border-brutalist shadow-brutalist-sm press-down capitalize " + (tipoAlcohol === t ? "bg-[var(--color-secondary)] text-white" : "bg-[var(--bg-surface)]")}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-1.5">Marca</label>
                    <div className="flex flex-wrap gap-2">
                      {MARCAS[tipoAlcohol].map(m => (
                        <button key={m} onClick={() => setMarca(m)}
                          className={"px-3 py-1.5 text-sm font-bold rounded-[var(--radius-md)] border-brutalist shadow-brutalist-sm press-down " + (marca === m ? "bg-[var(--color-yellow)] text-[var(--text-primary)]" : "bg-[var(--bg-surface)]")}>
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-1.5">Mezcla</label>
                    <div className="flex flex-wrap gap-2">
                      {MEZCLAS.map(m => (
                        <button key={m} onClick={() => setMezcla(m)}
                          className={"px-3 py-1.5 text-sm font-bold rounded-[var(--radius-md)] border-brutalist shadow-brutalist-sm press-down " + (mezcla === m ? "bg-[var(--color-teal)] text-[var(--text-primary)]" : "bg-[var(--bg-surface)]")}>
                          {m.replace(" ", "\u00A0")}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={handleSave} size="lg">
                  {miAsistencia ? "Actualizar" : "Guardar"} inscripción
                </Button>
                {miAsistencia && (
                  <Button variant="danger" size="lg" onClick={handleDelete}>
                    <Trash2 className="w-4 h-4 mr-1" /> Cancelar
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h2 className="text-lg font-bold mb-4">Recuento público</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-[var(--border-color)]">
                      <th className="text-left py-2 font-bold">Dia</th>
                      <th className="text-center py-2 font-bold">Total</th>
                      <th className="text-center py-2">🍺</th>
                      <th className="text-center py-2">🍷</th>
                      <th className="text-center py-2">🥤</th>
                      <th className="text-center py-2">💧</th>
                      <th className="text-center py-2">🍹</th>
                      <th className="text-center py-2 text-xs" title="Ron">🥃R</th>
                      <th className="text-center py-2 text-xs" title="Vodka">🥃V</th>
                      <th className="text-center py-2 text-xs" title="Whisky">🥃W</th>
                      <th className="text-center py-2 text-xs" title="Ginebra">🥃G</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.map(d => (
                      <tr key={d.dia} className="border-b border-[var(--border-color)]">
                        <td className="py-2 font-medium">{d.dia}</td>
                        <td className="text-center font-bold">{d.total}</td>
                        <td className="text-center">{d.cervezas}</td>
                        <td className="text-center">{d.tintos}</td>
                        <td className="text-center">{d.refrescos}</td>
                        <td className="text-center">{d.aguas}</td>
                        <td className="text-center">{d.cubatas}</td>
                        <td className="text-center text-xs">{d.rones || 0}</td>
                        <td className="text-center text-xs">{d.vodkas || 0}</td>
                        <td className="text-center text-xs">{d.whiskies || 0}</td>
                        <td className="text-center text-xs">{d.ginebras || 0}</td>
                      </tr>
                    ))}
                    {dashboard.length > 1 && (
                      <tr className="border-t-2 border-[var(--border-color)] bg-[var(--bg-page)] font-bold">
                        <td className="py-2">Total fiesta</td>
                        <td className="text-center">{dashboard.reduce((s, d) => s + d.total, 0)}</td>
                        <td className="text-center">{dashboard.reduce((s, d) => s + d.cervezas, 0)}</td>
                        <td className="text-center">{dashboard.reduce((s, d) => s + d.tintos, 0)}</td>
                        <td className="text-center">{dashboard.reduce((s, d) => s + d.refrescos, 0)}</td>
                        <td className="text-center">{dashboard.reduce((s, d) => s + d.aguas, 0)}</td>
                        <td className="text-center">{dashboard.reduce((s, d) => s + d.cubatas, 0)}</td>
                        <td className="text-center text-xs">{dashboard.reduce((s, d) => s + (d.rones || 0), 0)}</td>
                        <td className="text-center text-xs">{dashboard.reduce((s, d) => s + (d.vodkas || 0), 0)}</td>
                        <td className="text-center text-xs">{dashboard.reduce((s, d) => s + (d.whiskies || 0), 0)}</td>
                        <td className="text-center text-xs">{dashboard.reduce((s, d) => s + (d.ginebras || 0), 0)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
