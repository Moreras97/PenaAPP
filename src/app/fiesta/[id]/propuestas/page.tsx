"use client";

import { useState, useEffect, useCallback } from "react";
import { usePena } from "@/context/PenaContext";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { toast } from "sonner";
import { Plus, Check, X, UtensilsCrossed, ChefHat, UserPlus, Sun, Moon, Clock } from "lucide-react";
import type { PropuestaMenu, DiaFiesta, UserPena, PropuestaCocinero } from "@/types/database";
import { crearPropuesta, toggleCocinero, aprobarPropuesta, eliminarPropuesta, cargarDatosPropuestas } from "./actions";

interface PropuestaExt extends PropuestaMenu {
  proponente?: UserPena;
  aprobador?: UserPena;
  dia?: DiaFiesta;
  cocineros?: (PropuestaCocinero & { user_pena?: UserPena })[];
}

export default function PropuestasPage() {
  const { activePena: pena, activeUserPena: userPena } = usePena();
  const params = useParams<{ id: string }>();
  const fiestaSel = params.id;
  const [propuestas, setPropuestas] = useState<PropuestaExt[]>([]);
  const [dias, setDias] = useState<DiaFiesta[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const isAdminOrMod = userPena?.rol === "admin" || userPena?.rol === "mod";

  const [form, setForm] = useState({
    dia_fiesta_id: "",
    menu: "",
    tipo_comida: "comida" as "comida" | "cena",
    hora: "",
    se_encarga: false,
  });

  const loadData = useCallback(async () => {
    if (!pena) return;
    const { propuestas, dias } = await cargarDatosPropuestas(pena.id, fiestaSel);
    setPropuestas((propuestas as PropuestaExt[]) || []);
    setDias((dias as DiaFiesta[]) || []);
    setLoading(false);
  }, [pena, fiestaSel]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSave = async () => {
    if (!userPena || !pena || !form.dia_fiesta_id || !form.menu.trim()) {
      toast.error("Completa todos los campos requeridos");
      return;
    }
    const r = await crearPropuesta({
      pena_id: pena.id,
      fiesta_id: fiestaSel,
      dia_fiesta_id: form.dia_fiesta_id,
      propuesto_por: userPena.id,
      menu: form.menu,
      tipo_comida: form.tipo_comida,
      hora: form.hora || null,
      se_encarga: form.se_encarga,
    });
    if ((r as any).error) { toast.error((r as any).error); return; }
    toast.success("Propuesta enviada");
    setShowModal(false);
    setForm({ dia_fiesta_id: "", menu: "", tipo_comida: "comida", hora: "", se_encarga: false });
    loadData();
  };

  const handleToggleCocinero = async (propuestaId: string) => {
    if (!userPena) return;
    const r = await toggleCocinero(propuestaId, userPena.id);
    if ((r as any).error) { toast.error((r as any).error); return; }
    loadData();
  };

  const handleAprobar = async (id: string) => {
    if (!userPena) return;
    const r = await aprobarPropuesta(id, userPena.id);
    if ((r as any).error) { toast.error((r as any).error); return; }
    toast.success("Propuesta aprobada");
    loadData();
  };

  const handleDelete = async (id: string) => {
    const r = await eliminarPropuesta(id);
    if ((r as any).error) { toast.error((r as any).error); return; }
    toast.success("Propuesta eliminada");
    loadData();
  };

  const esCocinero = (p: PropuestaExt) =>
    p.cocineros?.some(c => c.user_pena_id === userPena?.id);

  if (loading) return <div className="p-8 text-center text-gray-500">Cargando...</div>;

  return (
    <div>
      <PageHeader title="Propuestas de Comida" description="Propón menús para cada día de fiesta" actions={
        <Button onClick={() => setShowModal(true)}><Plus className="w-4 h-4 mr-1" /> Proponer menú</Button>
      } />

      <div className="space-y-3">
        {propuestas.map(p => {
          const cocineros = p.cocineros || [];
          const esProponente = p.propuesto_por === userPena?.id;
          return (
            <Card key={p.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <UtensilsCrossed className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium">{p.dia?.fecha} {p.dia?.nombre ? `(${p.dia.nombre})` : ""}</span>
                      <Badge variant={p.tipo_comida === "comida" ? "default" : "primary"} className="flex items-center gap-1">
                        {p.tipo_comida === "comida" ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
                        {p.tipo_comida === "comida" ? "Comida" : "Cena"}
                      </Badge>
                      {p.hora && (
                        <Badge variant="default" className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {p.hora.slice(0, 5)}
                        </Badge>
                      )}
                      <Badge variant={p.aprobado ? "success" : "warning"}>
                        {p.aprobado ? "Aprobado" : "Pendiente"}
                      </Badge>
                    </div>
                    <p className="font-medium mb-2">{p.menu}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs text-gray-400">
                        Propuesto por {p.proponente?.nombre_completo}
                        {p.se_encarga && " (se encarga)"}
                      </p>
                      {cocineros.length > 0 && (
                        <div className="flex items-center gap-1">
                          <ChefHat className="w-3.5 h-3.5 text-[var(--color-yellow)]" />
                          <span className="text-xs text-gray-500">
                            {cocineros.map(c => c.user_pena?.nombre_completo || "?").join(", ")}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 ml-2">
                    <div className="flex gap-1">
                      {isAdminOrMod && !p.aprobado && (
                        <Button size="sm" variant="teal" onClick={() => handleAprobar(p.id)} title="Aprobar">
                          <Check className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {(esProponente || isAdminOrMod) && (
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(p.id)} title="Eliminar">
                          <X className="w-3.5 h-3.5 text-red-500" />
                        </Button>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant={esCocinero(p) ? "secondary" : "outline"}
                      onClick={() => handleToggleCocinero(p.id)}
                      title={esCocinero(p) ? "Ya soy cocinero" : "Apuntarme como cocinero"}
                    >
                      <UserPlus className="w-3.5 h-3.5 mr-1" />
                      {esCocinero(p) ? "Apuntado" : "Cocinar"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {propuestas.length === 0 && (
          <p className="text-center text-[var(--text-secondary)] py-8">No hay propuestas para esta fiesta</p>
        )}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nueva propuesta de menú">
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-bold mb-1">Día</label>
            <select value={form.dia_fiesta_id} onChange={e => setForm({ ...form, dia_fiesta_id: e.target.value })}
              className="w-full border-brutalist shadow-brutalist-sm rounded-[var(--radius-sm)] px-3 py-2 font-medium" required>
              <option value="">Seleccionar día</option>
              {dias.map(d => (
                <option key={d.id} value={d.id}>{d.fecha}{d.nombre ? ` - ${d.nombre}` : ""}</option>
              ))}
            </select>
            {dias.length === 0 && (
              <p className="text-xs text-red-500 mt-1">No hay días configurados. El admin debe añadir días o crear una fiesta nueva.</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">Tipo</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setForm({ ...form, tipo_comida: "comida" })}
                className={"flex-1 px-3 py-2 text-sm font-bold rounded-[var(--radius-md)] border-brutalist shadow-brutalist-sm press-down " + (form.tipo_comida === "comida" ? "bg-[var(--color-yellow)]" : "bg-[var(--bg-page)]")}>
                <Sun className="w-4 h-4 inline mr-1" /> Comida
              </button>
              <button type="button" onClick={() => setForm({ ...form, tipo_comida: "cena" })}
                className={"flex-1 px-3 py-2 text-sm font-bold rounded-[var(--radius-md)] border-brutalist shadow-brutalist-sm press-down " + (form.tipo_comida === "cena" ? "bg-[var(--color-secondary)] text-white" : "bg-[var(--bg-page)]")}>
                <Moon className="w-4 h-4 inline mr-1" /> Cena
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">Hora (opcional)</label>
            <input type="time" value={form.hora} onChange={e => setForm({ ...form, hora: e.target.value })}
              className="w-full border-brutalist shadow-brutalist-sm rounded-[var(--radius-sm)] px-3 py-2 font-medium" />
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">Menú propuesto</label>
            <textarea value={form.menu} onChange={e => setForm({ ...form, menu: e.target.value })}
              className="w-full border-brutalist shadow-brutalist-sm rounded-[var(--radius-sm)] px-3 py-2 font-medium" rows={3}
              placeholder="Ej: Parrillada de carne con ensalada y patatas" required />
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="se_encarga" checked={form.se_encarga}
              onChange={e => setForm({ ...form, se_encarga: e.target.checked })} />
            <label htmlFor="se_encarga" className="text-sm font-medium">Me encargo de cocinarlo</label>
          </div>

          <Button onClick={handleSave} className="w-full">Enviar propuesta</Button>
        </div>
      </Modal>
    </div>
  );
}
