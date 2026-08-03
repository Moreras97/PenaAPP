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
import { Plus, Trash2, Edit, Upload, Check, X, Crown, Shield, User } from "lucide-react";
import type { Fiesta, UserPena, Pena } from "@/types/database";

export default function AdminPage() {
  const { pena, userPena, refresh } = usePena();
  const supabase = createClient();
  const [tab, setTab] = useState<"fiestas" | "miembros" | "theming">("fiestas");
  const [fiestas, setFiestas] = useState<Fiesta[]>([]);
  const [miembros, setMiembros] = useState<UserPena[]>([]);
  const [loading, setLoading] = useState(true);
  const isAdmin = userPena?.rol === "admin";

  const [showFiestaModal, setShowFiestaModal] = useState(false);
  const [editFiesta, setEditFiesta] = useState<Fiesta | null>(null);
  const [fiestaForm, setFiestaForm] = useState({ nombre: "", fecha_inicio: "", fecha_fin: "" });

  const [showDiaModal, setShowDiaModal] = useState(false);
  const [diaFiestaId, setDiaFiestaId] = useState("");
  const [diaForm, setDiaForm] = useState({ fecha: "", nombre: "" });

  const [themeForm, setThemeForm] = useState({ color_primary: "#6366F1", color_secondary: "#F59E0B" });
  const [escudoFile, setEscudoFile] = useState<File | null>(null);
  const [escudoPreview, setEscudoPreview] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!supabase || !pena) return;
    const [{ data: f }, { data: m }] = await Promise.all([
      supabase.from("fiestas").select("*").eq("pena_id", pena.id).order("fecha_inicio"),
      supabase.from("users_penas").select("*").eq("pena_id", pena.id),
    ]);
    setFiestas(f || []);
    setMiembros(m as UserPena[] || []);
    if (pena) {
      setThemeForm({ color_primary: pena.color_primary, color_secondary: pena.color_secondary });
      setEscudoPreview(pena.escudo_url);
    }
    setLoading(false);
  }, [supabase, pena]);

  useEffect(() => { loadData(); }, [loadData]);

  if (!isAdmin && userPena) return <div className="p-8 text-center text-gray-500">Acceso restringido. Solo administradores.</div>;

  const handleSaveFiesta = async () => {
    if (!supabase || !pena) return;
    if (editFiesta) {
      await supabase.from("fiestas").update(fiestaForm).eq("id", editFiesta.id);
    } else {
      await supabase.from("fiestas").insert({ ...fiestaForm, pena_id: pena.id });
    }
    toast.success(editFiesta ? "Fiesta actualizada" : "Fiesta creada");
    setShowFiestaModal(false);
    setEditFiesta(null);
    setFiestaForm({ nombre: "", fecha_inicio: "", fecha_fin: "" });
    loadData();
  };

  const handleDeleteFiesta = async (id: string) => {
    if (!supabase) return;
    await supabase.from("fiestas").delete().eq("id", id);
    toast.success("Fiesta eliminada");
    loadData();
  };

  const handleAddDia = async () => {
    if (!supabase || !diaFiestaId) return;
    await supabase.from("dias_fiesta").insert({ fiesta_id: diaFiestaId, fecha: diaForm.fecha, nombre: diaForm.nombre || null });
    toast.success("Día añadido");
    setShowDiaModal(false);
    setDiaForm({ fecha: "", nombre: "" });
  };

  const handleChangeRole = async (miembroId: string, rol: string) => {
    if (!supabase) return;
    await supabase.from("users_penas").update({ rol }).eq("id", miembroId);
    toast.success("Rol actualizado");
    loadData();
  };

  const handleUploadEscudo = async () => {
    if (!supabase || !pena || !escudoFile) return;
    const path = `${pena.id}/${Date.now()}-${escudoFile.name}`;
    const { error } = await supabase.storage.from("escudos").upload(path, escudoFile);
    if (error) { toast.error(error.message); return; }
    const { data: { publicUrl } } = supabase.storage.from("escudos").getPublicUrl(path);
    await supabase.from("penas").update({ escudo_url: publicUrl }).eq("id", pena.id);
    toast.success("Escudo actualizado");
    refresh();
  };

  const handleSaveTheme = async () => {
    if (!supabase || !pena) return;
    await supabase.from("penas").update({ color_primary: themeForm.color_primary, color_secondary: themeForm.color_secondary }).eq("id", pena.id);
    if (typeof document !== "undefined") {
      document.documentElement.style.setProperty("--color-primary", themeForm.color_primary);
      document.documentElement.style.setProperty("--color-secondary", themeForm.color_secondary);
    }
    toast.success("Colores actualizados");
    refresh();
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Cargando...</div>;

  return (
    <div>
      <PageHeader title="Administración" description="Gestiona tu peña" />

      <div className="flex gap-2 mb-6">
        {(["fiestas", "miembros", "theming"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === t ? "bg-indigo-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            {t === "fiestas" ? "Fiestas" : t === "miembros" ? "Miembros" : "Tematización"}
          </button>
        ))}
      </div>

      {tab === "fiestas" && (
        <div>
          <div className="flex justify-between mb-4">
            <h2 className="text-lg font-semibold">Fiestas</h2>
            <Button size="sm" onClick={() => { setEditFiesta(null); setFiestaForm({ nombre: "", fecha_inicio: "", fecha_fin: "" }); setShowFiestaModal(true); }}><Plus className="w-3.5 h-3.5 mr-1" /> Nueva fiesta</Button>
          </div>
          {fiestas.map(f => (
            <Card key={f.id} className="mb-3">
              <CardContent className="pt-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{f.nombre}</p>
                  <p className="text-sm text-gray-500">{f.fecha_inicio} → {f.fecha_fin} {f.activa && <Badge variant="success">Activa</Badge>}</p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => { setDiaFiestaId(f.id); setShowDiaModal(true); }}><Plus className="w-3.5 h-3.5" /> Día</Button>
                  <Button size="sm" variant="outline" onClick={() => { setEditFiesta(f); setFiestaForm({ nombre: f.nombre, fecha_inicio: f.fecha_inicio, fecha_fin: f.fecha_fin }); setShowFiestaModal(true); }}><Edit className="w-3.5 h-3.5" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDeleteFiesta(f.id)}><Trash2 className="w-3.5 h-3.5 text-red-400" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {fiestas.length === 0 && <p className="text-center text-gray-500 py-4">No hay fiestas. Crea la primera.</p>}
        </div>
      )}

      {tab === "miembros" && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Miembros de la peña</h2>
          {miembros.map(m => (
            <Card key={m.id} className="mb-3">
              <CardContent className="pt-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold">
                    {m.rol === "admin" ? <Crown className="w-4 h-4 text-yellow-500" /> : m.rol === "mod" ? <Shield className="w-4 h-4 text-blue-500" /> : <User className="w-4 h-4 text-gray-400" />}
                  </div>
                  <div><p className="font-medium">{m.nombre_completo} {m.apodo && <span className="text-gray-400">({m.apodo})</span>}</p><p className="text-xs text-gray-500">{m.rol}</p></div>
                </div>
                <div className="flex gap-1">
                  {m.rol !== "admin" && isAdmin && (
                    <Button size="sm" variant="outline" onClick={() => handleChangeRole(m.id, m.rol === "mod" ? "miembro" : "mod")}>
                      {m.rol === "mod" ? "Quitar mod" : "Hacer mod"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {tab === "theming" && (
        <div className="max-w-md">
          <Card className="mb-4">
            <CardContent className="pt-4">
              <h2 className="text-lg font-semibold mb-4">Escudo / Logo</h2>
              {escudoPreview && <img src={escudoPreview} alt="Escudo" className="w-24 h-24 rounded-full object-cover mb-4 border" />}
              <div className="flex gap-2">
                <input type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) { setEscudoFile(f); setEscudoPreview(URL.createObjectURL(f)); } }} className="text-sm" />
                <Button size="sm" onClick={handleUploadEscudo} disabled={!escudoFile}><Upload className="w-3.5 h-3.5 mr-1" /> Subir</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <h2 className="text-lg font-semibold mb-4">Colores de la peña</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium w-32">Color primario</label>
                  <input type="color" value={themeForm.color_primary} onChange={e => setThemeForm({ ...themeForm, color_primary: e.target.value })} className="w-12 h-8 border rounded cursor-pointer" />
                  <input type="text" value={themeForm.color_primary} onChange={e => setThemeForm({ ...themeForm, color_primary: e.target.value })} className="flex-1 px-2 py-1 border rounded text-sm" />
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium w-32">Color secundario</label>
                  <input type="color" value={themeForm.color_secondary} onChange={e => setThemeForm({ ...themeForm, color_secondary: e.target.value })} className="w-12 h-8 border rounded cursor-pointer" />
                  <input type="text" value={themeForm.color_secondary} onChange={e => setThemeForm({ ...themeForm, color_secondary: e.target.value })} className="flex-1 px-2 py-1 border rounded text-sm" />
                </div>
                <div className="flex gap-2 mt-2">
                  <div className="w-12 h-12 rounded-lg" style={{ backgroundColor: themeForm.color_primary }} />
                  <div className="w-12 h-12 rounded-lg" style={{ backgroundColor: themeForm.color_secondary }} />
                </div>
                <Button onClick={handleSaveTheme} className="w-full">Guardar colores</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Modal open={showFiestaModal} onClose={() => setShowFiestaModal(false)} title={editFiesta ? "Editar fiesta" : "Nueva fiesta"}>
        <div className="space-y-3">
          <div><label className="block text-sm font-medium mb-1">Nombre</label><input value={fiestaForm.nombre} onChange={e => setFiestaForm({ ...fiestaForm, nombre: e.target.value })} className="w-full px-3 py-2 border rounded-lg" placeholder="Fiestas de Mayo 2026" required /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="block text-sm font-medium mb-1">Fecha inicio</label><input type="date" value={fiestaForm.fecha_inicio} onChange={e => setFiestaForm({ ...fiestaForm, fecha_inicio: e.target.value })} className="w-full px-3 py-2 border rounded-lg" required /></div>
            <div><label className="block text-sm font-medium mb-1">Fecha fin</label><input type="date" value={fiestaForm.fecha_fin} onChange={e => setFiestaForm({ ...fiestaForm, fecha_fin: e.target.value })} className="w-full px-3 py-2 border rounded-lg" required /></div>
          </div>
          <Button onClick={handleSaveFiesta} className="w-full">{editFiesta ? "Actualizar" : "Crear"} fiesta</Button>
        </div>
      </Modal>

      <Modal open={showDiaModal} onClose={() => setShowDiaModal(false)} title="Añadir día a la fiesta">
        <div className="space-y-3">
          <div><label className="block text-sm font-medium mb-1">Fecha</label><input type="date" value={diaForm.fecha} onChange={e => setDiaForm({ ...diaForm, fecha: e.target.value })} className="w-full px-3 py-2 border rounded-lg" required /></div>
          <div><label className="block text-sm font-medium mb-1">Nombre (opcional)</label><input value={diaForm.nombre} onChange={e => setDiaForm({ ...diaForm, nombre: e.target.value })} className="w-full px-3 py-2 border rounded-lg" placeholder="Viernes - Parrillada" /></div>
          <Button onClick={handleAddDia} className="w-full">Añadir día</Button>
        </div>
      </Modal>
    </div>
  );
}
