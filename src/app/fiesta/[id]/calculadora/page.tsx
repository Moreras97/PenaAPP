"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePena } from "@/context/PenaContext";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Edit, Download, Copy, FileText, Zap } from "lucide-react";
import type { ProductoCatalogo, Fiesta, Asistencia } from "@/types/database";
import { jsPDF } from "jspdf";

function getConsumo(pena: any): Record<string, number> {
  return {
    cerveza: pena?.consumo_cerveza ?? 1.0,
    tinto: pena?.consumo_tinto ?? 0.375,
    cubata: pena?.consumo_cubata ?? 0.35,
    refresco: pena?.consumo_refresco ?? 1.5,
    agua: pena?.consumo_agua ?? 1.0,
    hielo: pena?.consumo_hielo ?? 0.5,
  };
}

export default function CalculadoraPage() {
  const { activePena: pena, activeUserPena: userPena, refreshKey } = usePena();
  const params = useParams<{ id: string }>();
  const fiestaCalc = params.id;
  const supabase = createClient();
  const [productos, setProductos] = useState<ProductoCatalogo[]>([]);
  const [showProductoModal, setShowProductoModal] = useState(false);
  const [editProducto, setEditProducto] = useState<ProductoCatalogo | null>(null);
  const [form, setForm] = useState({ nombre: "", categoria: "", precio_estimado: "", unidad: "ud" });
  const [fiestas, setFiestas] = useState<Fiesta[]>([]);
  const [totalPersonas, setTotalPersonas] = useState(0);
  const [seleccionados, setSeleccionados] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const isAdmin = userPena?.rol === "admin";

  const loadProductos = useCallback(async () => {
    if (!supabase || !pena) return;
    const { data } = await supabase.from("productos_catalogo").select("*").eq("pena_id", pena.id).order("categoria");
    setProductos(data as ProductoCatalogo[] || []);
    const { data: f } = await supabase.from("fiestas").select("*").eq("pena_id", pena.id).order("fecha_inicio");
    setFiestas(f || []);
    setLoading(false);
  }, [supabase, pena]);

  useEffect(() => { loadProductos(); }, [loadProductos]);

  useEffect(() => {
    if (!supabase || !pena || !fiestaCalc) return;
    supabase.from("asistencias").select("id").eq("fiesta_id", fiestaCalc).then(({ data }) => {
      setTotalPersonas(data?.length || 0);
    });
  }, [supabase, pena, fiestaCalc, refreshKey]);

  const handleSaveProducto = async () => {
    if (!supabase || !pena) return;
    const payload = { pena_id: pena.id, nombre: form.nombre, categoria: form.categoria || "general", precio_estimado: parseFloat(form.precio_estimado), unidad: form.unidad };
    if (editProducto) {
      await supabase.from("productos_catalogo").update(payload).eq("id", editProducto.id);
    } else {
      await supabase.from("productos_catalogo").insert(payload);
    }
    toast.success(editProducto ? "Producto actualizado" : "Producto añadido");
    setShowProductoModal(false);
    setEditProducto(null);
    setForm({ nombre: "", categoria: "", precio_estimado: "", unidad: "ud" });
    loadProductos();
  };

  const handleDeleteProducto = async (id: string) => {
    if (!supabase) return;
    await supabase.from("productos_catalogo").delete().eq("id", id);
    toast.success("Producto eliminado");
    loadProductos();
  };

  const autoFillFromAttendance = async () => {
    if (!supabase || !pena) { toast.error("Sin conexion"); return; }
    const { data: asistencias } = await supabase
      .from("asistencias")
      .select("*, asistencia_dias(*)")
      .eq("fiesta_id", fiestaCalc);
    if (!asistencias?.length) { toast.error("No hay asistentes registrados"); return; }

    const { data: dias } = await supabase
      .from("dias_fiesta")
      .select("id")
      .eq("fiesta_id", fiestaCalc);

    const totalDias = dias?.length || 1;
    let cervezaDias = 0, tintoDias = 0, refrescoDias = 0, aguaDias = 0, hieloDias = 0;
    const cubataDias: Record<string, number> = {};

    for (const a of asistencias as any[]) {
      const diasAsiste = a.tipo === "semana_completa" ? totalDias : (a.asistencia_dias?.length || 0);
      hieloDias += diasAsiste;
      if (a.bebida === "cerveza") cervezaDias += diasAsiste;
      else if (a.bebida === "tinto") tintoDias += diasAsiste;
      else if (a.bebida === "cubatas" && a.marca_alcohol) {
        cubataDias[a.marca_alcohol] = (cubataDias[a.marca_alcohol] || 0) + diasAsiste;
      }
      if (a.bebida !== "nada") { refrescoDias += diasAsiste; aguaDias += diasAsiste; }
    }

    const c = getConsumo(pena);
    const newSeleccionados: Record<string, number> = {};

    for (const prod of productos) {
      const name = prod.nombre.toLowerCase();
      const cat = (prod.categoria || "").toLowerCase();

      if (cervezaDias > 0 && (name.includes("cerveza") || name.includes("lata"))) {
        newSeleccionados[prod.id] = Math.ceil(cervezaDias * c.cerveza / 0.33);
      } else if (tintoDias > 0 && (name.includes("tinto") || name.includes("vino"))) {
        newSeleccionados[prod.id] = Math.ceil(tintoDias * c.tinto / 0.75);
      } else if (refrescoDias > 0 && (name.includes("cola") || name.includes("refresco") || name.includes("fanta") || name.includes("sprite") || cat === "refresco")) {
        newSeleccionados[prod.id] = Math.ceil(refrescoDias * c.refresco / 2.0);
      } else if (aguaDias > 0 && name.includes("agua")) {
        newSeleccionados[prod.id] = Math.ceil(aguaDias * c.agua / 1.5);
      } else if (hieloDias > 0 && (name.includes("hielo") || cat === "hielo")) {
        newSeleccionados[prod.id] = Math.ceil(hieloDias * c.hielo / 2.0);
      }

      for (const [marca, pDias] of Object.entries(cubataDias)) {
        if (name.toLowerCase().includes(marca.toLowerCase())) {
          newSeleccionados[prod.id] = Math.ceil(pDias * c.cubata / 0.7);
        }
      }
    }

    setSeleccionados(newSeleccionados);
    const total = Object.keys(newSeleccionados).length;
    toast.success(total > 0 ? "Cantidades estimadas desde " + (asistencias.length) + " asistentes" : "No se encontraron productos compatibles en el catalogo");
  };

  const subtotal = Object.entries(seleccionados).reduce((sum, [pid, cant]) => {
    const p = productos.find(pr => pr.id === pid);
    return sum + (p ? p.precio_estimado * cant : 0);
  }, 0);
  const margen = subtotal * 0.10;
  const total = subtotal + margen;

  const listaCompra = Object.entries(seleccionados)
    .filter(([, c]) => c > 0)
    .map(([pid, cant]) => {
      const p = productos.find(pr => pr.id === pid);
      return p ? `${cant}x ${p.nombre} (${p.unidad}) — ${(p.precio_estimado * cant).toFixed(2)}€` : "";
    }).join("\n");

  const copiarWhatsApp = () => {
    const texto = `*Lista de la compra — ${pena?.nombre || "Peña"}*\n` +
      `Total personas: ${totalPersonas}\n\n` +
      listaCompra.replace(/\n/g, "\n") +
      `\n\nSubtotal: ${subtotal.toFixed(2)}€\n` +
      `Fondo imprevistos (10%): ${margen.toFixed(2)}€\n` +
      `*TOTAL: ${total.toFixed(2)}€*`;
    navigator.clipboard.writeText(texto).then(() => toast.success("Copiado para WhatsApp"));
  };

  const exportarPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`Lista de la Compra — ${pena?.nombre || "Peña"}`, 10, 20);
    doc.setFontSize(12);
    doc.text(`Total personas: ${totalPersonas}`, 10, 30);
    let y = 40;
    Object.entries(seleccionados).filter(([, c]) => c > 0).forEach(([pid, cant]) => {
      const p = productos.find(pr => pr.id === pid);
      if (p) { doc.text(`${cant}x ${p.nombre} — ${(p.precio_estimado * cant).toFixed(2)}€`, 10, y); y += 8; }
    });
    y += 4;
    doc.text(`Subtotal: ${subtotal.toFixed(2)}€`, 10, y); y += 8;
    doc.text(`Fondo imprevistos (10%): ${margen.toFixed(2)}€`, 10, y); y += 8;
    doc.text(`TOTAL: ${total.toFixed(2)}€`, 10, y);
    doc.save("lista-compra.pdf");
    toast.success("PDF descargado");
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Cargando...</div>;

  return (
    <div>
      <PageHeader title="Calculadora" description="Estima el presupuesto del bote para las fiestas" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Catálogo de productos</h2>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={autoFillFromAttendance} title="Auto-rellenar cantidades desde asistencia"><Zap className="w-3.5 h-3.5 mr-1" /> Auto-rellenar</Button>
                  {isAdmin && <Button size="sm" onClick={() => { setEditProducto(null); setForm({ nombre: "", categoria: "", precio_estimado: "", unidad: "ud" }); setShowProductoModal(true); }}><Plus className="w-3.5 h-3.5 mr-1" /> Añadir</Button>}
                </div>
              </div>
              <div className="space-y-2">
                {productos.map(p => (
                  <div key={p.id} className="flex items-center justify-between py-2 border-b">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{p.nombre}</p>
                      <p className="text-xs text-gray-500">{p.categoria} • {p.precio_estimado.toFixed(2)}€/{p.unidad}</p>
                    </div>
                    <input type="number" min="0" value={seleccionados[p.id] || 0}
                      onChange={e => setSeleccionados(prev => ({ ...prev, [p.id]: parseInt(e.target.value) || 0 }))}
                      className="w-16 px-2 py-1 border rounded text-sm text-center" />
                    {isAdmin && <button onClick={() => handleDeleteProducto(p.id)} className="ml-2 p-1 hover:bg-[var(--bg-page)] rounded"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>}
                  </div>
                ))}
                {productos.length === 0 && <p className="text-center text-[var(--text-secondary)] py-4">Sin productos. El admin debe añadirlos.</p>}
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardContent className="pt-4">
              <h2 className="text-lg font-semibold mb-4">Presupuesto</h2>
              <p className="text-sm mb-4">Asistentes registrados: <strong>{totalPersonas}</strong></p>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm"><span>Subtotal productos</span><span>{subtotal.toFixed(2)}€</span></div>
                <div className="flex justify-between text-sm text-orange-600"><span>Fondo imprevistos (10%)</span><span>+{margen.toFixed(2)}€</span></div>
                <div className="flex justify-between font-bold text-lg border-t pt-2"><span>TOTAL</span><span>{total.toFixed(2)}€</span></div>
                {totalPersonas > 0 && <div className="flex justify-between text-sm text-gray-500"><span>Por persona</span><span>{(total / totalPersonas).toFixed(2)}€</span></div>}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={copiarWhatsApp}><Copy className="w-4 h-4 mr-1" /> WhatsApp</Button>
                <Button variant="outline" onClick={exportarPDF}><FileText className="w-4 h-4 mr-1" /> PDF</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Modal open={showProductoModal} onClose={() => setShowProductoModal(false)} title={editProducto ? "Editar producto" : "Nuevo producto"}>
        <div className="space-y-3">
          <div><label className="block text-sm font-medium mb-1">Nombre</label><input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} className="w-full px-3 py-2 border rounded-[var(--radius-md)]" required /></div>
          <div><label className="block text-sm font-medium mb-1">Categoría</label><input value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} className="w-full px-3 py-2 border rounded-[var(--radius-md)]" placeholder="Ej: Bebida, Comida, Varios" /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="block text-sm font-medium mb-1">Precio (€)</label><input type="number" step="0.01" value={form.precio_estimado} onChange={e => setForm({ ...form, precio_estimado: e.target.value })} className="w-full px-3 py-2 border rounded-[var(--radius-md)]" required /></div>
            <div><label className="block text-sm font-medium mb-1">Unidad</label><select value={form.unidad} onChange={e => setForm({ ...form, unidad: e.target.value })} className="w-full px-3 py-2 border rounded-[var(--radius-md)]"><option value="ud">ud</option><option value="kg">kg</option><option value="L">L</option><option value="pack">pack</option><option value="botella">botella</option></select></div>
          </div>
          <Button onClick={handleSaveProducto} className="w-full">{editProducto ? "Actualizar" : "Añadir"} producto</Button>
        </div>
      </Modal>
    </div>
  );
}
