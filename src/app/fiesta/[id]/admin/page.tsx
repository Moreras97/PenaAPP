"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { usePena } from "@/context/PenaContext";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { toast } from "sonner";
import { Plus, Trash2, Edit, Upload, Check, X, Crown, Shield, User, UserPlus } from "lucide-react";
import { adminDeleteFiesta, adminSaveFiesta, adminAddDia, adminChangeRole, adminToggleApproval, adminApproveOrReject, adminUploadEscudo, adminSaveTheme, adminSaveConsumo } from "./actions";
import { adminUpdateProfile, adminSavePenaInfo } from "@/app/pena/actions";
import type { Fiesta, UserPena } from "@/types/database";

interface PendingMember {
  id: string; pena_id: string; user_id: string;
  nombre_completo: string; apodo: string | null; created_at: string;
}

export default function AdminPage() {
  const { activePena: pena, activeUserPena: userPena, refresh, triggerRefresh } = usePena();
  const supabase = createClient();
  const [tab, setTab] = useState<"fiestas" | "miembros" | "aprobaciones" | "theming" | "consumo">("fiestas");
  const [fiestas, setFiestas] = useState<Fiesta[]>([]);
  const [miembros, setMiembros] = useState<UserPena[]>([]);
  const [pendingMembers, setPendingMembers] = useState<PendingMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [requiresApproval, setRequiresApproval] = useState(false);
  const router = useRouter();
  const isAdmin = userPena?.rol === "admin";

  const [showFiestaModal, setShowFiestaModal] = useState(false);
  const [editFiesta, setEditFiesta] = useState<Fiesta | null>(null);
  const [fiestaForm, setFiestaForm] = useState({ nombre: "", fecha_inicio: "", fecha_fin: "", max_dias_sueltos: null as number|null, locked: false });
  const [showDiaModal, setShowDiaModal] = useState(false);
  const [diaFiestaId, setDiaFiestaId] = useState("");
  const [diaForm, setDiaForm] = useState({ fecha: "", nombre: "" });
  const [themeForm, setThemeForm] = useState({ color_primary: "#E8635A", color_secondary: "#7B6CF6" });
  const [consumoForm, setConsumoForm] = useState({ consumo_cerveza: 1.0, consumo_tinto: 0.375, consumo_cubata: 0.35, consumo_refresco: 1.5, consumo_agua: 1.0, consumo_hielo: 0.5 });
  const [escudoFile, setEscudoFile] = useState<File | null>(null);
  const [escudoPreview, setEscudoPreview] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteFiestaId, setDeleteFiestaId] = useState("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const loadData = useCallback(async () => {
    if (!supabase || !pena) return;
    const [{ data: f }, { data: m }, { data: p }] = await Promise.all([
      supabase.from("fiestas").select("*").eq("pena_id", pena.id).order("fecha_inicio"),
      supabase.from("users_penas").select("*").eq("pena_id", pena.id),
      isAdmin ? supabase.from("pending_members").select("*").eq("pena_id", pena.id).order("created_at") : Promise.resolve({ data: [] }),
    ]);
    setFiestas(f || []);
    setMiembros((m as UserPena[]) || []);
    setPendingMembers((p as PendingMember[]) || []);
    if (pena) {
      setRequiresApproval(!!(pena as any).requires_approval);
      setThemeForm({ color_primary: pena.color_primary, color_secondary: pena.color_secondary });
      setEscudoPreview(pena.escudo_url);
      const p = pena as any;
      setConsumoForm({
        consumo_cerveza: p.consumo_cerveza ?? 1.0,
        consumo_tinto: p.consumo_tinto ?? 0.375,
        consumo_cubata: p.consumo_cubata ?? 0.35,
        consumo_refresco: p.consumo_refresco ?? 1.5,
        consumo_agua: p.consumo_agua ?? 1.0,
        consumo_hielo: p.consumo_hielo ?? 0.5,
      });
    }
    setLoading(false);
  }, [supabase, pena, isAdmin]);

  useEffect(() => { loadData(); }, [loadData]);

  if (!isAdmin && userPena) return <div className="p-8 text-center">Acceso restringido. Solo administradores.</div>;

  const handleSaveFiesta = async () => {
    if (!pena) return;

    // Si es nueva fiesta y hay fiestas activas, avisar
    if (!editFiesta) {
      const activas = fiestas.filter(f => f.activa);
      if (activas.length > 0) {
        const nombres = activas.map(f => f.nombre).join(", ");
        if (!confirm(`Hay ${activas.length === 1 ? "una fiesta activa" : "fiestas activas"}: ${nombres}. Crear una nueva fiesta las desactivará. ¿Estás seguro de continuar?`)) {
          return;
        }
      }
    }

    const payload = { ...fiestaForm, pena_id: pena.id, max_dias_sueltos: fiestaForm.max_dias_sueltos ?? null, locked: fiestaForm.locked || false };
    const r = await adminSaveFiesta(editFiesta?.id || null, payload);
    if (r.error) { toast.error(r.error); return; }
    if (requiresApproval !== !!(pena as any).requires_approval) {
      await adminToggleApproval(pena.id, requiresApproval);
    }
    if ((r as any).desactivadas?.length > 0) {
      toast.warning("Se han desactivado: " + (r as any).desactivadas.join(", "));
    }
    toast.success(editFiesta ? "Fiesta actualizada" : "Fiesta creada");
    setShowFiestaModal(false); setEditFiesta(null); setFiestaForm({ nombre: "", fecha_inicio: "", fecha_fin: "", max_dias_sueltos: null, locked: false });
    loadData();
    triggerRefresh();

    // Redirigir a la nueva fiesta
    if (!editFiesta && (r as any).fiestaId) {
      router.push(`/fiesta/${(r as any).fiestaId}`);
    }
  };

  const handleDeleteFiestaRequest = (id: string) => {
    setDeleteFiestaId(id);
    setDeleteConfirmText("");
    setShowDeleteModal(true);
  };

  const handleDeleteFiestaConfirm = async () => {
    if (deleteConfirmText !== "Eliminar fiesta") return;
    const r = await adminDeleteFiesta(deleteFiestaId);
    if (r.error) { toast.error(r.error); return; }
    toast.success("Fiesta eliminada");
    setShowDeleteModal(false);
    loadData();
    triggerRefresh();
  };

  const handleAddDia = async () => {
    if (!diaFiestaId) return;
    const r = await adminAddDia(diaFiestaId, diaForm.fecha, diaForm.nombre || null);
    if (r.error) { toast.error(r.error); return; }
    toast.success("Día añadido"); setShowDiaModal(false); setDiaForm({ fecha: "", nombre: "" });
  };

  const handleChangeRole = async (miembroId: string, rol: string) => {
    const r = await adminChangeRole(miembroId, rol);
    if (r.error) { toast.error(r.error); return; }
    toast.success(rol === "admin" ? "Nuevo administrador" : "Rol actualizado");
    loadData();
  };

  const handleToggleApproval = async () => {
    if (!pena) return;
    const nuevo = !requiresApproval;
    const r = await adminToggleApproval(pena.id, nuevo);
    if (r.error) { toast.error(r.error); return; }
    setRequiresApproval(nuevo);
    toast.success(nuevo ? "Ahora se requiere aprobación" : "Acceso libre");
  };

  const handleApproveMember = async (pending: PendingMember) => {
    const r = await adminApproveOrReject(pending.id, true);
    if (r.error) { toast.error(r.error); return; }
    toast.success(pending.nombre_completo + " aprobado");
    loadData();
  };

  const handleRejectMember = async (pending: PendingMember) => {
    const r = await adminApproveOrReject(pending.id, false);
    if (r.error) { toast.error(r.error); return; }
    toast.success(pending.nombre_completo + " rechazado");
    loadData();
  };

  const handleUploadEscudo = async () => {
    if (!pena || !escudoFile) return;
    const reader = new FileReader();
    const b64 = await new Promise<string>((res) => { reader.onload = () => res((reader.result as string).split(",")[1]); reader.readAsDataURL(escudoFile); });
    const r = await adminUploadEscudo(pena.id, b64, escudoFile.name);
    if (r.error) { toast.error(r.error); return; }
    toast.success("Escudo actualizado"); refresh();
  };

  const handleSaveTheme = async () => {
    if (!pena) return;
    const r = await adminSaveTheme(pena.id, themeForm.color_primary, themeForm.color_secondary);
    if (r.error) { toast.error(r.error); return; }
    toast.success("Colores actualizados"); refresh();
  };

  const handleSaveConsumo = async () => {
    if (!pena) return;
    const r = await adminSaveConsumo(pena.id, consumoForm);
    if (r.error) { toast.error(r.error); return; }
    toast.success("Factores de consumo actualizados"); refresh();
  };

  if (loading) return <div className="p-8 text-center">Cargando...</div>;

  const tabs = [
    { key: "fiestas" as const, label: "Fiestas" },
    { key: "miembros" as const, label: "Miembros" },
    ...(isAdmin ? [{ key: "aprobaciones" as const, label: "Aprobaciones" + (pendingMembers.length > 0 ? " (" + pendingMembers.length + ")" : "") }] : []),
    { key: "theming" as const, label: "Personalización" },
    { key: "consumo" as const, label: "Consumo" },
  ];

  return (
    <div>
      <PageHeader title="Administración" description="Gestiona tu peña" />
      <div className="flex gap-2 mb-6 flex-wrap">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={"px-4 py-2 text-sm font-bold rounded-[var(--radius-md)] border-brutalist shadow-brutalist-sm press-down transition " + (tab === t.key ? "bg-[var(--color-primary)] text-white" : "bg-[var(--bg-page)]")}>
            {t.label}
          </button>
        ))}
      </div>

      {isAdmin && (
        <div className="bg-[var(--bg-surface)] border-brutalist shadow-brutalist rounded-[var(--radius-lg)] p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold">Nuevos miembros</p>
              <p className="text-sm">{requiresApproval ? "Requieren aprobación del admin" : "Entrada libre con el identificador"}</p>
            </div>
            <button onClick={handleToggleApproval}
              className={"px-4 py-2 text-sm font-bold border-brutalist shadow-brutalist-sm rounded-[var(--radius-md)] press-down transition " + (requiresApproval ? "bg-[var(--color-yellow)]" : "bg-[var(--color-teal)]")}>
              {requiresApproval ? "Con aprobación" : "Acceso libre"}
            </button>
          </div>
        </div>
      )}

      {tab === "fiestas" && (
        <div>
          <div className="flex justify-between mb-4">
            <h2 className="text-lg font-bold">Fiestas</h2>
            <Button size="sm" onClick={() => { setEditFiesta(null); setFiestaForm({ nombre: "", fecha_inicio: "", fecha_fin: "", max_dias_sueltos: null, locked: false }); setShowFiestaModal(true); }}><Plus className="w-3.5 h-3.5 mr-1" /> Nueva fiesta</Button>
          </div>
          {fiestas.map(f => (
            <Card key={f.id} className={"mb-3 " + (new Date(f.fecha_fin) < new Date() ? "opacity-60" : "")}>
              <CardContent className="pt-4 flex items-center justify-between">
                <div><p className="font-bold">{f.nombre} {(f as any).locked && <Badge variant="danger">Cerrada</Badge>} {new Date(f.fecha_fin) < new Date() && <Badge variant="default">Finalizada</Badge>}</p><p className="text-sm">{f.fecha_inicio} a {f.fecha_fin} {f.activa && <Badge variant="success">Activa</Badge>}</p></div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => { setDiaFiestaId(f.id); setShowDiaModal(true); }}><Plus className="w-3.5 h-3.5" /> Día</Button>
                  <Button size="sm" variant="outline" onClick={() => { setEditFiesta(f); setFiestaForm({ nombre: f.nombre, fecha_inicio: f.fecha_inicio, fecha_fin: f.fecha_fin, max_dias_sueltos: (f as any).max_dias_sueltos ?? null, locked: !!(f as any).locked }); setShowFiestaModal(true); }}><Edit className="w-3.5 h-3.5" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDeleteFiestaRequest(f.id)}><Trash2 className="w-3.5 h-3.5 text-red-400" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {tab === "miembros" && (
        <div>
          <h2 className="text-lg font-bold mb-4">Miembros</h2>
          {miembros.map(m => (
            <Card key={m.id} className="mb-3">
              <CardContent className="pt-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full border-2 border-[var(--border-color)] shadow-brutalist-sm flex items-center justify-center bg-[var(--bg-page)]">
                    {m.rol === "admin" ? <Crown className="w-5 h-5 text-[var(--color-yellow)]" /> : m.rol === "mod" ? <Shield className="w-5 h-5 text-[var(--color-secondary)]" /> : <User className="w-5 h-5" />}
                  </div>
                  <div><p className="font-bold">{m.nombre_completo} {m.apodo && <span className="text-sm">({m.apodo})</span>}</p><p className="text-xs capitalize">{m.rol}</p></div>
                </div>
      {(tab === "miembros" || tab === "aprobaciones") && isAdmin && (
                  <div className="flex gap-1">
                    {m.rol === "miembro" && <Button size="sm" variant="outline" onClick={() => handleChangeRole(m.id, "mod")}>Hacer mod</Button>}
                    {m.rol === "mod" && <Button size="sm" variant="outline" onClick={() => handleChangeRole(m.id, "miembro")}>Quitar mod</Button>}
                    {m.rol !== "admin" && <Button size="sm" variant="secondary" onClick={() => handleChangeRole(m.id, "admin")}><Crown className="w-3.5 h-3.5 mr-1" /> Admin</Button>}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {tab === "aprobaciones" && (
        <div>
          <h2 className="text-lg font-bold mb-4">Solicitudes pendientes</h2>
          {pendingMembers.length === 0 ? (
            <p className="text-center py-8">No hay solicitudes pendientes</p>
          ) : (
            pendingMembers.map(p => (
              <Card key={p.id} className="mb-3">
                <CardContent className="pt-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full border-2 border-[var(--border-color)] shadow-brutalist-sm flex items-center justify-center bg-[var(--bg-page)]">
                      <UserPlus className="w-5 h-5 text-[var(--color-secondary)]" />
                    </div>
                    <div><p className="font-bold">{p.nombre_completo} {p.apodo && <span className="text-sm">({p.apodo})</span>}</p></div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="teal" onClick={() => handleApproveMember(p)}><Check className="w-3.5 h-3.5 mr-1" /> Aprobar</Button>
                    <Button size="sm" variant="danger" onClick={() => handleRejectMember(p)}><X className="w-3.5 h-3.5" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === "theming" && (
        <div className="max-w-md">
          <Card className="mb-4">
            <CardContent className="pt-4">
              <h2 className="text-lg font-bold mb-4">Tu perfil</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-bold mb-1">Nombre completo</label>
                  <input type="text" value={userPena?.nombre_completo || ""}
                    onChange={e => { /* handled by ref */ }}
                    id="profile-nombre"
                    className="w-full border-brutalist shadow-brutalist-sm rounded-[var(--radius-sm)] px-3 py-2 font-medium" />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">Apodo</label>
                  <input type="text" defaultValue={userPena?.apodo || ""}
                    id="profile-apodo"
                    className="w-full border-brutalist shadow-brutalist-sm rounded-[var(--radius-sm)] px-3 py-2 font-medium" />
                </div>
                <Button size="sm" onClick={async () => {
                  const nombre = (document.getElementById("profile-nombre") as HTMLInputElement)?.value;
                  const apodo = (document.getElementById("profile-apodo") as HTMLInputElement)?.value;
                  if (!nombre || !userPena) return;
                  const r = await adminUpdateProfile(userPena.id, nombre, apodo || null);
                  if (r.error) { toast.error(r.error); return; }
                  toast.success("Perfil actualizado"); refresh();
                }}>Guardar perfil</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-4">
            <CardContent className="pt-4">
              <h2 className="text-lg font-bold mb-4">Ubicación de la peña</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-bold mb-1">Provincia</label>
                  <input type="text" defaultValue={pena?.provincia || ""}
                    id="pena-provincia"
                    className="w-full border-brutalist shadow-brutalist-sm rounded-[var(--radius-sm)] px-3 py-2 font-medium" />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">Población</label>
                  <input type="text" defaultValue={pena?.poblacion || ""}
                    id="pena-poblacion"
                    className="w-full border-brutalist shadow-brutalist-sm rounded-[var(--radius-sm)] px-3 py-2 font-medium" />
                </div>
                <Button size="sm" onClick={async () => {
                  const prov = (document.getElementById("pena-provincia") as HTMLInputElement)?.value;
                  const pob = (document.getElementById("pena-poblacion") as HTMLInputElement)?.value;
                  if (!pena) return;
                  const r = await adminSavePenaInfo(pena.id, prov || null, pob || null);
                  if (r.error) { toast.error(r.error); return; }
                  toast.success("Ubicación actualizada"); refresh();
                }}>Guardar ubicación</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-4">
            <CardContent className="pt-4">
              <h2 className="text-lg font-bold mb-4">Escudo / Logo</h2>
              {escudoPreview && <img src={escudoPreview} alt="Escudo" className="w-24 h-24 rounded-full border-2 border-[var(--border-color)] object-cover mb-4" />}
              <div className="flex flex-col sm:flex-row gap-2"><input type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) { setEscudoFile(f); setEscudoPreview(URL.createObjectURL(f)); } }} className="text-sm w-full sm:w-auto" /><Button size="sm" onClick={handleUploadEscudo} disabled={!escudoFile} className="w-full sm:w-auto"><Upload className="w-3.5 h-3.5 mr-1" /> Subir</Button></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <h2 className="text-lg font-bold mb-4">Colores</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3"><label className="text-sm font-bold w-32">Color primario</label><input type="color" value={themeForm.color_primary} onChange={e => setThemeForm({ ...themeForm, color_primary: e.target.value })} className="w-12 h-8 border-2 border-[var(--border-color)] rounded cursor-pointer" /><input type="text" value={themeForm.color_primary} onChange={e => setThemeForm({ ...themeForm, color_primary: e.target.value })} className="flex-1 border-brutalist shadow-brutalist-sm rounded-[var(--radius-sm)] px-2 py-1 text-sm" /></div>
                <div className="flex items-center gap-3"><label className="text-sm font-bold w-32">Color secundario</label><input type="color" value={themeForm.color_secondary} onChange={e => setThemeForm({ ...themeForm, color_secondary: e.target.value })} className="w-12 h-8 border-2 border-[var(--border-color)] rounded cursor-pointer" /><input type="text" value={themeForm.color_secondary} onChange={e => setThemeForm({ ...themeForm, color_secondary: e.target.value })} className="flex-1 border-brutalist shadow-brutalist-sm rounded-[var(--radius-sm)] px-2 py-1 text-sm" /></div>
                <div className="flex gap-2 mt-2"><div className="w-12 h-12 rounded-[var(--radius-md)] border-brutalist" style={{ backgroundColor: themeForm.color_primary }} /><div className="w-12 h-12 rounded-[var(--radius-md)] border-brutalist" style={{ backgroundColor: themeForm.color_secondary }} /></div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  <span className="text-xs font-bold opacity-50">presets:</span>
                  {[
                    ["#E8635A","#7B6CF6"],["#4ECDC4","#FFE566"],["#6366F1","#F59E0B"],
                    ["#EC4899","#8B5CF6"],["#10B981","#3B82F6"],["#F97316","#06B6D4"]
                  ].map(([p,s]) => (
                    <button key={p} onClick={() => setThemeForm({ color_primary: p, color_secondary: s })}
                      className="w-7 h-7 rounded-full border-2 border-[var(--border-color)] press-down overflow-hidden"
                      title={p + " / " + s}>
                      <span className="block w-1/2 h-full float-left" style={{backgroundColor:p}}></span>
                      <span className="block w-1/2 h-full float-left" style={{backgroundColor:s}}></span>
                    </button>
                  ))}
                </div>
                {(() => {
                  const isBad = (c1: string, c2: string) => {
                    const hex = (h: string) => parseInt(h.replace("#",""),16);
                    const lum = (h: string) => {
                      const x = hex(h); return (0.299*((x>>16)&0xff) + 0.587*((x>>8)&0xff) + 0.114*(x&0xff))/255;
                    };
                    return Math.abs(lum(c1)-lum(c2)) < 0.3;
                  };
                  return isBad(themeForm.color_primary, themeForm.color_secondary) ? (
                    <p className="text-xs text-[var(--color-primary)] font-bold mb-2">Cuidado: los colores son muy parecidos y pueden ser dificiles de leer.</p>
                  ) : null;
                })()}
                <Button onClick={handleSaveTheme} className="w-full">Guardar colores</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "consumo" && (
        <div className="max-w-md">
          <Card>
            <CardContent className="pt-4">
              <h2 className="text-lg font-bold mb-4">Factores de consumo por persona y dia</h2>
              <p className="text-sm mb-4">Estos valores se usan en la lista de la compra para estimar cantidades. Ajustalos segun tu peña.</p>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-bold block mb-1">Cerveza (L/persona/dia)</label>
                  <div className="flex items-center gap-2">
                    <input type="range" min="0.1" max="3" step="0.1" value={consumoForm.consumo_cerveza}
                      onChange={e => setConsumoForm({ ...consumoForm, consumo_cerveza: parseFloat(e.target.value) })}
                      className="flex-1" />
                    <input type="number" min="0.1" max="3" step="0.1" value={consumoForm.consumo_cerveza}
                      onChange={e => setConsumoForm({ ...consumoForm, consumo_cerveza: parseFloat(e.target.value) || 0 })}
                      className="w-16 border-brutalist shadow-brutalist-sm rounded-[var(--radius-sm)] px-2 py-1 text-sm text-center" />
                    <span className="text-xs w-10">L/dia</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-bold block mb-1">Tinto (L/persona/dia)</label>
                  <div className="flex items-center gap-2">
                    <input type="range" min="0.1" max="2" step="0.05" value={consumoForm.consumo_tinto}
                      onChange={e => setConsumoForm({ ...consumoForm, consumo_tinto: parseFloat(e.target.value) })}
                      className="flex-1" />
                    <input type="number" min="0.1" max="2" step="0.05" value={consumoForm.consumo_tinto}
                      onChange={e => setConsumoForm({ ...consumoForm, consumo_tinto: parseFloat(e.target.value) || 0 })}
                      className="w-16 border-brutalist shadow-brutalist-sm rounded-[var(--radius-sm)] px-2 py-1 text-sm text-center" />
                    <span className="text-xs w-10">L/dia</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-bold block mb-1">Cubatas (L/persona/dia) — 35cl = media botella</label>
                  <div className="flex items-center gap-2">
                    <input type="range" min="0.1" max="1" step="0.05" value={consumoForm.consumo_cubata}
                      onChange={e => setConsumoForm({ ...consumoForm, consumo_cubata: parseFloat(e.target.value) })}
                      className="flex-1" />
                    <input type="number" min="0.1" max="1" step="0.05" value={consumoForm.consumo_cubata}
                      onChange={e => setConsumoForm({ ...consumoForm, consumo_cubata: parseFloat(e.target.value) || 0 })}
                      className="w-16 border-brutalist shadow-brutalist-sm rounded-[var(--radius-sm)] px-2 py-1 text-sm text-center" />
                    <span className="text-xs w-10">L/dia</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-bold block mb-1">Refresco (L/persona/dia)</label>
                  <div className="flex items-center gap-2">
                    <input type="range" min="0.5" max="4" step="0.1" value={consumoForm.consumo_refresco}
                      onChange={e => setConsumoForm({ ...consumoForm, consumo_refresco: parseFloat(e.target.value) })}
                      className="flex-1" />
                    <input type="number" min="0.5" max="4" step="0.1" value={consumoForm.consumo_refresco}
                      onChange={e => setConsumoForm({ ...consumoForm, consumo_refresco: parseFloat(e.target.value) || 0 })}
                      className="w-16 border-brutalist shadow-brutalist-sm rounded-[var(--radius-sm)] px-2 py-1 text-sm text-center" />
                    <span className="text-xs w-10">L/dia</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-bold block mb-1">Agua (L/persona/dia)</label>
                  <div className="flex items-center gap-2">
                    <input type="range" min="0.5" max="3" step="0.1" value={consumoForm.consumo_agua}
                      onChange={e => setConsumoForm({ ...consumoForm, consumo_agua: parseFloat(e.target.value) })}
                      className="flex-1" />
                    <input type="number" min="0.5" max="3" step="0.1" value={consumoForm.consumo_agua}
                      onChange={e => setConsumoForm({ ...consumoForm, consumo_agua: parseFloat(e.target.value) || 0 })}
                      className="w-16 border-brutalist shadow-brutalist-sm rounded-[var(--radius-sm)] px-2 py-1 text-sm text-center" />
                    <span className="text-xs w-10">L/dia</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-bold block mb-1">Hielo (kg/persona/dia)</label>
                  <div className="flex items-center gap-2">
                    <input type="range" min="0.1" max="2" step="0.1" value={consumoForm.consumo_hielo}
                      onChange={e => setConsumoForm({ ...consumoForm, consumo_hielo: parseFloat(e.target.value) })}
                      className="flex-1" />
                    <input type="number" min="0.1" max="2" step="0.1" value={consumoForm.consumo_hielo}
                      onChange={e => setConsumoForm({ ...consumoForm, consumo_hielo: parseFloat(e.target.value) || 0 })}
                      className="w-16 border-brutalist shadow-brutalist-sm rounded-[var(--radius-sm)] px-2 py-1 text-sm text-center" />
                    <span className="text-xs w-10">kg/dia</span>
                  </div>
                </div>
                <Button onClick={handleSaveConsumo} className="w-full">Guardar factores</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Modal open={showFiestaModal} onClose={() => setShowFiestaModal(false)} title={editFiesta ? "Editar fiesta" : "Nueva fiesta"}>
        <div className="space-y-3">
          <div><label className="block text-sm font-bold mb-1">Nombre</label><input value={fiestaForm.nombre} onChange={e => setFiestaForm({ ...fiestaForm, nombre: e.target.value })} className="w-full border-brutalist shadow-brutalist-sm rounded-[var(--radius-sm)] px-3 py-2 font-medium" placeholder="Fiestas de Mayo 2026" required /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="block text-sm font-bold mb-1">Fecha inicio</label><input type="date" value={fiestaForm.fecha_inicio} onChange={e => setFiestaForm({ ...fiestaForm, fecha_inicio: e.target.value })} className="w-full border-brutalist shadow-brutalist-sm rounded-[var(--radius-sm)] px-3 py-2" required /></div>
            <div><label className="block text-sm font-bold mb-1">Fecha fin</label><input type="date" value={fiestaForm.fecha_fin} onChange={e => setFiestaForm({ ...fiestaForm, fecha_fin: e.target.value })} className="w-full border-brutalist shadow-brutalist-sm rounded-[var(--radius-sm)] px-3 py-2" required /></div>
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-bold">Modalidad de asistencia</label>
            <div className="flex items-center gap-2">
              <button type="button"
                onClick={() => setFiestaForm({ ...fiestaForm, max_dias_sueltos: 0 })}
                className={"px-3 py-2 text-sm font-bold rounded-[var(--radius-md)] border-brutalist shadow-brutalist-sm press-down " + ((fiestaForm.max_dias_sueltos ?? 0) === 0 ? "bg-[var(--color-primary)] text-white" : "bg-[var(--bg-page)]")}>
                Solo fiestas completas
              </button>
              <button type="button"
                onClick={() => setFiestaForm({ ...fiestaForm, max_dias_sueltos: fiestaForm.max_dias_sueltos === 0 || fiestaForm.max_dias_sueltos == null ? 1 : fiestaForm.max_dias_sueltos })}
                className={"px-3 py-2 text-sm font-bold rounded-[var(--radius-md)] border-brutalist shadow-brutalist-sm press-down " + ((fiestaForm.max_dias_sueltos ?? 0) > 0 ? "bg-[var(--color-primary)] text-white" : "bg-[var(--bg-page)]")}>
                Permitir días sueltos
              </button>
            </div>
            {(() => {
              const inicio = new Date(fiestaForm.fecha_inicio);
              const fin = new Date(fiestaForm.fecha_fin);
              const diff = fiestaForm.fecha_inicio && fiestaForm.fecha_fin && fin >= inicio
                ? Math.floor((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)) + 1
                : 0;
              return null;
            })()}
            {(fiestaForm.max_dias_sueltos ?? 0) > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <label className="text-sm font-bold shrink-0">Máximo de días sueltos:</label>
                <input type="number" min={1} max={999} value={fiestaForm.max_dias_sueltos ?? 1}
                  onChange={e => setFiestaForm({ ...fiestaForm, max_dias_sueltos: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="w-16 border-brutalist shadow-brutalist-sm rounded-[var(--radius-sm)] px-2 py-1 text-sm text-center font-bold" />
              </div>
            )}
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              {(fiestaForm.max_dias_sueltos ?? 0) === 0
                ? "Los miembros deben asistir todos los días de la fiesta."
                : "Cada miembro puede elegir los días que quiera venir. Si alcanza el máximo, se le asignará automáticamente las fiestas completas."}
            </p>
          </div>

          {editFiesta && (
            <div className="flex items-center gap-3">
              <label className="text-sm font-bold">Cerrada (solo consulta)</label>
              <button type="button" onClick={() => setFiestaForm({ ...fiestaForm, locked: !fiestaForm.locked })}
                className={"px-3 py-1 text-sm font-bold rounded-[var(--radius-md)] border-brutalist shadow-brutalist-sm press-down " + (fiestaForm.locked ? "bg-[var(--color-yellow)]" : "bg-[var(--bg-page)]")}>
                {fiestaForm.locked ? "Cerrada" : "Abierta"}
              </button>
            </div>
          )}

          <Button onClick={handleSaveFiesta} className="w-full">{editFiesta ? "Actualizar" : "Crear"} fiesta</Button>
        </div>
      </Modal>

      <Modal open={showDiaModal} onClose={() => setShowDiaModal(false)} title="Añadir día">
        <div className="space-y-3">
          <div><label className="block text-sm font-bold mb-1">Fecha</label><input type="date" value={diaForm.fecha} onChange={e => setDiaForm({ ...diaForm, fecha: e.target.value })} className="w-full border-brutalist shadow-brutalist-sm rounded-[var(--radius-sm)] px-3 py-2" required /></div>
          <div><label className="block text-sm font-bold mb-1">Nombre (opcional)</label><input value={diaForm.nombre} onChange={e => setDiaForm({ ...diaForm, nombre: e.target.value })} className="w-full border-brutalist shadow-brutalist-sm rounded-[var(--radius-sm)] px-3 py-2" placeholder="Viernes - Parrillada" /></div>
          <Button onClick={handleAddDia} className="w-full">Añadir día</Button>
        </div>
      </Modal>

      <Modal open={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Eliminar fiesta">
        <div className="space-y-4">
          <p className="text-sm font-bold">Accion permanente. Escribe <span className="text-[var(--color-primary)] font-extrabold">Eliminar fiesta</span>:</p>
          <input type="text" value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)}
            className="w-full border-brutalist shadow-brutalist-sm rounded-[var(--radius-sm)] px-3 py-2 font-medium"
            placeholder="Eliminar fiesta" />
          <Button variant="danger" className="w-full" disabled={deleteConfirmText !== "Eliminar fiesta"} onClick={handleDeleteFiestaConfirm}>
            Eliminar fiesta permanentemente
          </Button>
        </div>
      </Modal>
    </div>
  );
}
