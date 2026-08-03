"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePena } from "@/context/PenaContext";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { toast } from "sonner";
import { Plus, Check, X, UtensilsCrossed } from "lucide-react";
import type { PropuestaMenu, Fiesta, DiaFiesta, UserPena } from "@/types/database";

export default function PropuestasPage() {
  const { pena, userPena } = usePena();
  const supabase = createClient();
  const [propuestas, setPropuestas] = useState<(PropuestaMenu & { proponente?: UserPena; aprobador?: UserPena; dia?: DiaFiesta })[]>([]);
  const [fiestas, setFiestas] = useState<Fiesta[]>([]);
  const [fiestaSel, setFiestaSel] = useState<string>("");
  const [dias, setDias] = useState<DiaFiesta[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const isAdminOrMod = userPena?.rol === "admin" || userPena?.rol === "mod";

  const [form, setForm] = useState({ dia_fiesta_id: "", menu: "", se_encarga: false });

  const loadData = useCallback(async () => {
    if (!supabase || !pena) return;
    const { data: f } = await supabase.from("fiestas").select("*").eq("pena_id", pena.id).order("fecha_inicio");
    setFiestas(f || []);
    if (f?.length && !fiestaSel) setFiestaSel(f[0].id);
    setLoading(false);
  }, [supabase, pena, fiestaSel]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!supabase || !pena || !fiestaSel) return;
    supabase.from("dias_fiesta").select("*").eq("fiesta_id", fiestaSel).order("fecha").then(({ data }) => setDias(data || []));
    supabase.from("propuestas_menu").select("*, proponente:propuesto_por(*), aprobador:aprobado_por(*), dia:dias_fiesta(*)")
      .eq("pena_id", pena.id).eq("fiesta_id", fiestaSel).order("created_at", { ascending: false })
      .then(({ data }) => setPropuestas((data as unknown as (PropuestaMenu & { proponente?: UserPena; aprobador?: UserPena; dia?: DiaFiesta })[]) || []));
  }, [supabase, pena, fiestaSel]);

  const handleSave = async () => {
    if (!supabase || !userPena || !pena) return;
    const { error } = await supabase.from("propuestas_menu").insert({
      pena_id: pena.id, fiesta_id: fiestaSel, dia_fiesta_id: form.dia_fiesta_id, propuesto_por: userPena.id, menu: form.menu, se_encarga: form.se_encarga
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Propuesta enviada");
    setShowModal(false);
    setForm({ dia_fiesta_id: "", menu: "", se_encarga: false });
    loadData();
  };

  const handleAprobar = async (id: string) => {
    if (!supabase || !userPena) return;
    await supabase.from("propuestas_menu").update({ aprobado: true, aprobado_por: userPena.id }).eq("id", id);
    toast.success("Propuesta aprobada");
    loadData();
  };

  const handleDelete = async (id: string) => {
    if (!supabase) return;
    await supabase.from("propuestas_menu").delete().eq("id", id);
    toast.success("Propuesta eliminada");
    loadData();
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Cargando...</div>;

  return (
    <div>
      <PageHeader title="Propuestas de Comida" description="Propón menús para cada día de fiesta" actions={
        <Button onClick={() => setShowModal(true)}><Plus className="w-4 h-4 mr-1" /> Proponer menú</Button>
      } />

      <div className="mb-4">
        <select value={fiestaSel} onChange={e => setFiestaSel(e.target.value)} className="px-4 py-2 border rounded-lg">
          {fiestas.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
        </select>
      </div>

      <div className="space-y-3">
        {propuestas.map(p => (
          <Card key={p.id}>
            <CardContent className="pt-4 flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <UtensilsCrossed className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-500">{p.dia?.fecha} {p.dia?.nombre ? `(${p.dia.nombre})` : ""}</span>
                  <Badge variant={p.aprobado ? "success" : "warning"}>{p.aprobado ? "Aprobado" : "Pendiente"}</Badge>
                  {p.se_encarga && <Badge variant="default">Se encarga: {p.proponente?.nombre_completo}</Badge>}
                </div>
                <p className="font-medium">{p.menu}</p>
                <p className="text-xs text-gray-400 mt-1">Propuesto por {p.proponente?.nombre_completo}</p>
              </div>
              <div className="flex gap-1">
                {isAdminOrMod && !p.aprobado && <Button size="sm" variant="outline" onClick={() => handleAprobar(p.id)}><Check className="w-3.5 h-3.5" /></Button>}
                {(p.propuesto_por === userPena?.id || isAdminOrMod) && <Button size="sm" variant="ghost" onClick={() => handleDelete(p.id)}><X className="w-3.5 h-3.5 text-red-500" /></Button>}
              </div>
            </CardContent>
          </Card>
        ))}
        {propuestas.length === 0 && <p className="text-center text-gray-500 py-8">No hay propuestas para esta fiesta</p>}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nueva propuesta de menú">
        <div className="space-y-3">
          <div><label className="block text-sm font-medium mb-1">Día</label><select value={form.dia_fiesta_id} onChange={e => setForm({ ...form, dia_fiesta_id: e.target.value })} className="w-full px-3 py-2 border rounded-lg" required><option value="">Seleccionar día</option>{dias.map(d => <option key={d.id} value={d.id}>{d.fecha}{d.nombre ? ` - ${d.nombre}` : ""}</option>)}</select></div>
          <div><label className="block text-sm font-medium mb-1">Menú propuesto</label><textarea value={form.menu} onChange={e => setForm({ ...form, menu: e.target.value })} className="w-full px-3 py-2 border rounded-lg" rows={3} placeholder="Ej: Parrillada de carne con ensalada y patatas" required /></div>
          <div className="flex items-center gap-2"><input type="checkbox" id="se_encarga" checked={form.se_encarga} onChange={e => setForm({ ...form, se_encarga: e.target.checked })} /><label htmlFor="se_encarga" className="text-sm">Me encargo de cocinarlo</label></div>
          <Button onClick={handleSave} className="w-full">Enviar propuesta</Button>
        </div>
      </Modal>
    </div>
  );
}
