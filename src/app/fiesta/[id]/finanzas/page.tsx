"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePena } from "@/context/PenaContext";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { toast } from "sonner";
import { Plus, Check } from "lucide-react";
import type { Gasto, Fiesta, UserPena } from "@/types/database";

export default function FinanzasPage() {
  const { activePena: pena, activeUserPena: userPena } = usePena();
  const params = useParams<{ id: string }>();
  const fiestaId = params.id;
  const supabase = createClient();
  const [gastos, setGastos] = useState<(Gasto & { creador?: UserPena; beneficiario?: UserPena })[]>([]);
  const [fiestas, setFiestas] = useState<Fiesta[]>([]);
  const [miembros, setMiembros] = useState<UserPena[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const isAdmin = userPena?.rol === "admin" || userPena?.rol === "mod";

  const [form, setForm] = useState({ tipo: "bote_comun" as "bote_comun" | "adelanto_personal", concepto: "", importe: "", fecha: new Date().toISOString().slice(0, 10), beneficiario_id: "", fiesta_id: fiestaId });

  const loadData = useCallback(async () => {
    if (!supabase || !pena) return;
    const [{ data: g }, { data: f }, { data: m }] = await Promise.all([
      supabase.from("gastos").select("*, creador:creado_por(*), beneficiario:beneficiario_id(*)").eq("pena_id", pena.id).order("fecha", { ascending: false }),
      supabase.from("fiestas").select("*").eq("pena_id", pena.id).order("fecha_inicio"),
      supabase.from("users_penas").select("*").eq("pena_id", pena.id),
    ]);
    setGastos((g as unknown as (Gasto & { creador?: UserPena; beneficiario?: UserPena })[]) || []);
    setFiestas(f || []);
    setMiembros(m as UserPena[] || []);
    setLoading(false);
  }, [supabase, pena]);

  useEffect(() => { loadData(); }, [loadData]);

  const totalBote = gastos.filter(g => g.tipo === "bote_comun").reduce((s, g) => s + g.importe, 0);
  const totalAdelantos = gastos.filter(g => g.tipo === "adelanto_personal").reduce((s, g) => s + (g.saldado ? 0 : g.importe), 0);
  const miembrosCuotas = miembros.filter(m => !m.cuota_pagada);

  const handleSave = async () => {
    if (!supabase || !userPena) return;
    const { error } = await supabase.from("gastos").insert({
      pena_id: pena!.id,
      creado_por: userPena.id,
      tipo: form.tipo,
      concepto: form.concepto,
      importe: parseFloat(form.importe),
      fecha: form.fecha,
      beneficiario_id: form.tipo === "adelanto_personal" ? (form.beneficiario_id || userPena.id) : null,
      fiesta_id: form.fiesta_id || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Gasto registrado");
    setShowModal(false);
    setForm({ tipo: "bote_comun", concepto: "", importe: "", fecha: new Date().toISOString().slice(0, 10), beneficiario_id: "", fiesta_id: fiestaId });
    loadData();
  };

  const handleSaldar = async (gastoId: string) => {
    if (!supabase) return;
    await supabase.from("gastos").update({ saldado: true }).eq("id", gastoId);
    toast.success("Marcado como saldado");
    loadData();
  };

  const handleToggleCuota = async (miembroId: string, cuota: boolean) => {
    if (!supabase || !isAdmin) return;
    await supabase.from("users_penas").update({ cuota_pagada: !cuota }).eq("id", miembroId);
    toast.success("Cuota actualizada");
    loadData();
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Cargando...</div>;

  return (
    <div>
      <PageHeader title="Finanzas" description="Bote común, gastos y adelantos" actions={
        <Button onClick={() => setShowModal(true)}><Plus className="w-4 h-4 mr-1" /> Nuevo gasto</Button>
      } />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card><CardContent className="pt-4 text-center"><p className="text-sm text-gray-500">Gastos bote común</p><p className="text-2xl font-bold text-red-600">{totalBote.toFixed(2)}€</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-sm text-gray-500">Adelantos pendientes</p><p className="text-2xl font-bold text-orange-600">{totalAdelantos.toFixed(2)}€</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-sm text-gray-500">Cuotas pendientes</p><p className="text-2xl font-bold text-gray-600">{miembrosCuotas.length} miembros</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="pt-4">
          <h2 className="text-lg font-semibold mb-3">Cuotas de miembros</h2>
          <div className="space-y-2 mb-6">
            {miembros.map(m => (
              <div key={m.id} className="flex items-center justify-between py-2 border-b">
                <span>{m.nombre_completo} {m.apodo && <span className="text-gray-400">({m.apodo})</span>}</span>
                <Badge variant={m.cuota_pagada ? "success" : "danger"}>
                  {m.cuota_pagada ? "Pagado" : "Pendiente"}
                  {isAdmin && <Check className="w-3 h-3 ml-1 cursor-pointer hover:opacity-70" onClick={() => handleToggleCuota(m.id, m.cuota_pagada)} />}
                </Badge>
              </div>
            ))}
          </div>

          <h2 className="text-lg font-semibold mb-3">Registro de gastos</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b"><th className="text-left py-2">Fecha</th><th className="text-left py-2">Concepto</th><th className="text-left py-2">Tipo</th><th className="text-right py-2">Importe</th><th className="text-center py-2">Estado</th>{isAdmin && <th className="text-right py-2">Acción</th>}</tr></thead>
              <tbody>
                {gastos.map(g => (
                  <tr key={g.id} className="border-b">
                    <td className="py-2">{g.fecha}</td>
                    <td className="py-2">{g.concepto}{g.beneficiario && <span className="text-gray-400 text-xs ml-1">({g.beneficiario.nombre_completo})</span>}</td>
                    <td className="py-2"><Badge variant={g.tipo === "bote_comun" ? "default" : "warning"}>{g.tipo === "bote_comun" ? "Bote" : "Adelanto"}</Badge></td>
                    <td className="text-right py-2 font-medium">{g.importe.toFixed(2)}€</td>
                    <td className="text-center py-2">{g.tipo === "adelanto_personal" && <Badge variant={g.saldado ? "success" : "danger"}>{g.saldado ? "Saldado" : "Pendiente"}</Badge>}</td>
                    {isAdmin && <td className="text-right py-2">{g.tipo === "adelanto_personal" && !g.saldado && <Button size="sm" variant="outline" onClick={() => handleSaldar(g.id)}>Saldar</Button>}</td>}
                  </tr>
                ))}
                {gastos.length === 0 && <tr><td colSpan={6} className="text-center py-4 text-gray-500">Sin gastos registrados</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nuevo gasto">
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Tipo</label>
            <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value as typeof form.tipo })} className="w-full px-3 py-2 border rounded-[var(--radius-md)]">
              <option value="bote_comun">Gasto del bote común</option>
              <option value="adelanto_personal">Adelanto personal</option>
            </select>
          </div>
          <div><label className="block text-sm font-medium mb-1">Concepto</label><input value={form.concepto} onChange={e => setForm({ ...form, concepto: e.target.value })} className="w-full px-3 py-2 border rounded-[var(--radius-md)]" required /></div>
          <div><label className="block text-sm font-medium mb-1">Importe (€)</label><input type="number" step="0.01" value={form.importe} onChange={e => setForm({ ...form, importe: e.target.value })} className="w-full px-3 py-2 border rounded-[var(--radius-md)]" required /></div>
          <div><label className="block text-sm font-medium mb-1">Fecha</label><input type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} className="w-full px-3 py-2 border rounded-[var(--radius-md)]" /></div>
          <div><label className="block text-sm font-medium mb-1">Fiesta (opcional)</label><select value={form.fiesta_id} onChange={e => setForm({ ...form, fiesta_id: e.target.value })} className="w-full px-3 py-2 border rounded-[var(--radius-md)]"><option value="">Sin asignar</option>{fiestas.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}</select></div>
          {form.tipo === "adelanto_personal" && (
            <div><label className="block text-sm font-medium mb-1">Beneficiario</label><select value={form.beneficiario_id} onChange={e => setForm({ ...form, beneficiario_id: e.target.value })} className="w-full px-3 py-2 border rounded-[var(--radius-md)]"><option value="">Seleccionar (por defecto: tú)</option>{miembros.map(m => <option key={m.id} value={m.id}>{m.nombre_completo}</option>)}</select></div>
          )}
          <Button onClick={handleSave} className="w-full">Registrar gasto</Button>
        </div>
      </Modal>
    </div>
  );
}
