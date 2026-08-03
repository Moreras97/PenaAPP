"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePena } from "@/context/PenaContext";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { Fiesta, DiaFiesta, Asistencia } from "@/types/database";
import { Plus, Trash2, Beer } from "lucide-react";

type Bebida = "cerveza" | "tinto" | "refresco" | "agua" | "nada";

const BEBIDA_LABELS: Record<Bebida, string> = {
  cerveza: "Cerveza", tinto: "Tinto", refresco: "Refresco", agua: "Agua", nada: "Sin bebida"
};

export default function AsistenciaPage() {
  const { pena, userPena } = usePena();
  const supabase = createClient();
  const [fiestas, setFiestas] = useState<Fiesta[]>([]);
  const [fiestaActiva, setFiestaActiva] = useState<Fiesta | null>(null);
  const [dias, setDias] = useState<DiaFiesta[]>([]);
  const [miAsistencia, setMiAsistencia] = useState<Asistencia | null>(null);
  const [diasSeleccionados, setDiasSeleccionados] = useState<string[]>([]);
  const [bebida, setBebida] = useState<Bebida>("cerveza");
  const [tipo, setTipo] = useState<"semana_completa" | "dias_sueltos">("dias_sueltos");
  const [dashboard, setDashboard] = useState<{ dia: string; total: number; cervezas: number; tintos: number; refrescos: number; aguas: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!supabase || !pena) return;
    setLoading(true);

    const { data: f } = await supabase.from("fiestas").select("*").eq("pena_id", pena.id).eq("activa", true).order("fecha_inicio");
    setFiestas(f || []);
    const activa = f?.find(ff => ff.activa) || f?.[0] || null;
    setFiestaActiva(activa);

    if (activa) {
      const { data: d } = await supabase.from("dias_fiesta").select("*").eq("fiesta_id", activa.id).order("fecha");
      setDias(d || []);

      if (userPena) {
        const { data: as } = await supabase.from("asistencias").select("*, asistencia_dias(*)").eq("user_pena_id", userPena.id).eq("fiesta_id", activa.id).single();
        setMiAsistencia((as as unknown as Asistencia) || null);
        if (as) {
          setTipo(as.tipo);
          setBebida((as.bebida as Bebida) || "cerveza");
          setDiasSeleccionados((as as unknown as { asistencia_dias: { dia_fiesta_id: string }[] }).asistencia_dias?.map((ad: { dia_fiesta_id: string }) => ad.dia_fiesta_id) || []);
        } else {
          setTipo("dias_sueltos");
          setDiasSeleccionados([]);
        }
      }

      const { data: stats } = await supabase.from("asistencias").select("*, asistencia_dias!inner(dia_fiesta_id), dias_fiesta!asistencia_dias(*)").eq("fiesta_id", activa.id);
      if (stats && d) {
        const daily = d.map(dia => {
          const sem = stats.filter(s => s.tipo === "semana_completa").length;
          const suelt = stats.filter(s => s.tipo === "dias_sueltos" && (s as unknown as { asistencia_dias: { dia_fiesta_id: string }[] }).asistencia_dias?.some(ad => ad.dia_fiesta_id === dia.id)).length;
          return {
            dia: dia.fecha,
            total: sem + suelt,
            cervezas: stats.filter(s => s.bebida === "cerveza" && (s.tipo === "semana_completa" || (s as unknown as { asistencia_dias: { dia_fiesta_id: string }[] }).asistencia_dias?.some(ad => ad.dia_fiesta_id === dia.id))).length,
            tintos: stats.filter(s => s.bebida === "tinto" && (s.tipo === "semana_completa" || (s as unknown as { asistencia_dias: { dia_fiesta_id: string }[] }).asistencia_dias?.some(ad => ad.dia_fiesta_id === dia.id))).length,
            refrescos: stats.filter(s => s.bebida === "refresco" && (s.tipo === "semana_completa" || (s as unknown as { asistencia_dias: { dia_fiesta_id: string }[] }).asistencia_dias?.some(ad => ad.dia_fiesta_id === dia.id))).length,
            aguas: stats.filter(s => s.bebida === "agua" && (s.tipo === "semana_completa" || (s as unknown as { asistencia_dias: { dia_fiesta_id: string }[] }).asistencia_dias?.some(ad => ad.dia_fiesta_id === dia.id))).length,
          };
        });
        setDashboard(daily);
      }
    }
    setLoading(false);
  }, [supabase, pena, userPena]);

  useEffect(() => { loadData(); }, [loadData]);

  const toggleDia = (diaId: string) => {
    const updated = diasSeleccionados.includes(diaId)
      ? diasSeleccionados.filter(d => d !== diaId)
      : [...diasSeleccionados, diaId];
    setDiasSeleccionados(updated);
    if (updated.length >= 3 && updated.length >= dias.length * 0.5) {
      setTipo("semana_completa");
    }
  };

  const handleSave = async () => {
    if (!supabase || !userPena || !fiestaActiva) return;

    const finalTipo = diasSeleccionados.length >= 3 ? "semana_completa" : tipo;

    if (miAsistencia) {
      await supabase.from("asistencia_dias").delete().eq("asistencia_id", miAsistencia.id);
      await supabase.from("asistencias").update({ tipo: finalTipo, bebida: bebida === "nada" ? null : bebida }).eq("id", miAsistencia.id);
      if (finalTipo === "dias_sueltos") {
        for (const dId of diasSeleccionados) {
          await supabase.from("asistencia_dias").insert({ asistencia_id: miAsistencia.id, dia_fiesta_id: dId });
        }
      }
    } else {
      const { data: as } = await supabase.from("asistencias").insert({
        user_pena_id: userPena.id, fiesta_id: fiestaActiva.id, tipo: finalTipo, bebida: bebida === "nada" ? null : bebida
      }).select().single();
      if (as && finalTipo === "dias_sueltos") {
        for (const dId of diasSeleccionados) {
          await supabase.from("asistencia_dias").insert({ asistencia_id: as.id, dia_fiesta_id: dId });
        }
      }
    }
    toast.success("Asistencia guardada");
    loadData();
  };

  const handleDelete = async () => {
    if (!supabase || !miAsistencia) return;
    await supabase.from("asistencias").delete().eq("id", miAsistencia.id);
    setMiAsistencia(null);
    setDiasSeleccionados([]);
    toast.success("Inscripción cancelada");
    loadData();
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Cargando...</div>;

  return (
    <div>
      <PageHeader title="Asistencia" description="Registra tu asistencia y preferencias de bebida" />
      {!fiestaActiva ? (
        <div className="p-8 text-center text-gray-500">No hay fiestas activas. El admin debe crear una.</div>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-lg font-semibold mb-4">{fiestaActiva.nombre}</h2>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Tipo de asistencia</label>
                <div className="flex gap-2">
                  <button onClick={() => setTipo("semana_completa")} className={`px-4 py-2 rounded-lg border text-sm ${tipo === "semana_completa" ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-gray-300"}`}>Semana Completa</button>
                  <button onClick={() => setTipo("dias_sueltos")} className={`px-4 py-2 rounded-lg border text-sm ${tipo === "dias_sueltos" ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-gray-300"}`}>Días Sueltos</button>
                </div>
              </div>

              {tipo === "dias_sueltos" && (
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Días que asistirás ({diasSeleccionados.length} seleccionados) {diasSeleccionados.length >= 3 && <Badge variant="warning">Se aplicará Semana Completa</Badge>}</label>
                  <div className="flex flex-wrap gap-2">
                    {dias.map(d => (
                      <button key={d.id} onClick={() => toggleDia(d.id)}
                        className={`px-3 py-1.5 rounded-lg border text-sm ${diasSeleccionados.includes(d.id) ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-gray-300"}`}>
                        {d.fecha} {d.nombre ? `(${d.nombre})` : ""}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Bebida preferida</label>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(BEBIDA_LABELS) as Bebida[]).map(b => (
                    <button key={b} onClick={() => setBebida(b)}
                      className={`px-3 py-1.5 rounded-lg border text-sm flex items-center gap-1 ${bebida === b ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-gray-300"}`}>
                      <Beer className="w-3.5 h-3.5" /> {BEBIDA_LABELS[b]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSave}>{miAsistencia ? "Actualizar" : "Guardar"} inscripción</Button>
                {miAsistencia && <Button variant="danger" onClick={handleDelete}><Trash2 className="w-4 h-4 mr-1" /> Cancelar</Button>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h2 className="text-lg font-semibold mb-4">Dashboard de recuento</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Día</th>
                      <th className="text-center py-2">Personas</th>
                      <th className="text-center py-2">🍺</th>
                      <th className="text-center py-2">🍷</th>
                      <th className="text-center py-2">🥤</th>
                      <th className="text-center py-2">💧</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.map(d => (
                      <tr key={d.dia} className="border-b">
                        <td className="py-2">{d.dia}</td>
                        <td className="text-center font-semibold">{d.total}</td>
                        <td className="text-center">{d.cervezas}</td>
                        <td className="text-center">{d.tintos}</td>
                        <td className="text-center">{d.refrescos}</td>
                        <td className="text-center">{d.aguas}</td>
                      </tr>
                    ))}
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
