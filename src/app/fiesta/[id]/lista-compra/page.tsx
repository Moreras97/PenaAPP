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
import { RefreshCw, ShoppingCart, Plus, Trash2, Edit } from "lucide-react";

interface ProductoDB {
  id: string; nombre: string; categoria: string; tipo_producto: string;
  precio_estimado: number; precio_referencia: number | null; precio_manual: number | null;
  litros_por_unidad: number; fuente_precio: string; unidad: string;
}

interface FilaCompra {
  producto: ProductoDB;
  marca: string;
  personas: string[];
  total_unidades: number;
  litros_totales: number;
  coste_unitario: number;
  coste_total: number;
}

// Factores de consumo por persona/día — valores por defecto
// El admin puede sobrescribirlos desde Administración > Consumo
const DEFAULT_CONSUMO: Record<string, number> = {
  cubata: 0.35,
  cerveza: 1.0,
  tinto: 0.375,
  refresco: 1.5,
  agua: 1.0,
  hielo: 0.5,
};

function getConsumo(pena: any): Record<string, number> {
  return {
    cubata: pena?.consumo_cubata ?? DEFAULT_CONSUMO.cubata,
    cerveza: pena?.consumo_cerveza ?? DEFAULT_CONSUMO.cerveza,
    tinto: pena?.consumo_tinto ?? DEFAULT_CONSUMO.tinto,
    refresco: pena?.consumo_refresco ?? DEFAULT_CONSUMO.refresco,
    agua: pena?.consumo_agua ?? DEFAULT_CONSUMO.agua,
    hielo: pena?.consumo_hielo ?? DEFAULT_CONSUMO.hielo,
  };
}

export default function ListaCompraPage() {
  const { activePena: pena, activeUserPena: userPena, refreshKey } = usePena();
  const params = useParams<{ id: string }>();
  const supabase = createClient();
  const [filas, setFilas] = useState<FilaCompra[]>([]);
  const [totalCoste, setTotalCoste] = useState(0);
  const [totalLitrosAlcohol, setTotalLitrosAlcohol] = useState(0);
  const [loading, setLoading] = useState(true);
  const isAdmin = userPena?.rol === "admin";
  const [refreshLoading, setRefreshLoading] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualForm, setManualForm] = useState({ nombre: "", categoria: "", precio: "", litros: "" });

  const [productos, setProductos] = useState<ProductoDB[]>([]);

  const loadProductos = useCallback(async () => {
    if (!supabase || !pena) return;
    const { data } = await supabase.from("productos_catalogo").select("*").eq("pena_id", pena.id);
    setProductos(data || []);
  }, [supabase, pena]);

  useEffect(() => { loadProductos(); }, [loadProductos]);

  const calcularLista = useCallback(async () => {
    if (!supabase || !pena || !params.id) return;
    setLoading(true);

    const consumo = getConsumo(pena);
    const { data: asistencias } = await supabase
      .from("asistencias")
      .select("*, users_penas!inner(*), asistencia_dias(*)")
      .eq("fiesta_id", params.id);

    // 2. Obtener días de la fiesta
    const { data: dias } = await supabase.from("dias_fiesta").select("*").eq("fiesta_id", params.id).order("fecha");

    if (!dias?.length || !asistencias?.length) { setFilas([]); setLoading(false); return; }

    // 3. Calcular persona-días: para cada asistencia, cuántos días asiste
    // fiestas_completas: todos los días, dias_sueltos: los días seleccionados
    const totalDias = dias.length;

    // Agrupar: marca_alcohol -> {personas: string[], dias_persona: number}
    const cubatasPorMarca: Record<string, { personas: Set<string>; personaDias: number }> = {};
    let cervezaPersonas = 0;
    let cervezaDias = 0;
    let tintoPersonas = 0;
    let tintoDias = 0;
    let refrescoPersonas = 0;
    let refrescoDias = 0;
    let aguaPersonas = 0;
    let aguaDias = 0;
    let hieloPersonaDias = 0;

    for (const a of (asistencias || []) as any[]) {
      const diasAsiste = a.tipo === "semana_completa" ? totalDias : (a.asistencia_dias?.length || 0);
      const nombre = a.users_penas?.nombre_completo || "?";

      if (a.bebida === "cubatas" && a.marca_alcohol) {
        const key = a.marca_alcohol;
        if (!cubatasPorMarca[key]) cubatasPorMarca[key] = { personas: new Set(), personaDias: 0 };
        cubatasPorMarca[key].personas.add(nombre);
        cubatasPorMarca[key].personaDias += diasAsiste;
      } else if (a.bebida === "cerveza") {
        cervezaPersonas++;
        cervezaDias += diasAsiste;
      } else if (a.bebida === "tinto") {
        tintoPersonas++;
        tintoDias += diasAsiste;
      } else if (a.bebida === "refresco") {
        refrescoPersonas++;
        refrescoDias += diasAsiste;
      } else if (a.bebida === "agua") {
        aguaPersonas++;
        aguaDias += diasAsiste;
      }

      hieloPersonaDias += diasAsiste;
    }

    const rows: FilaCompra[] = [];

    // Cubatas por marca
    for (const [marca, data] of Object.entries(cubatasPorMarca)) {
      if (data.personaDias === 0) continue;
      const prod = productos.find(p => p.nombre === marca);
            const ref = prod ? { precio: prod.precio_referencia || prod.precio_estimado || 0, litros: prod.litros_por_unidad || 0.7, categoria: prod.categoria } : null;
      if (!ref) continue;
      const litrosNecesarios = data.personaDias * consumo.cubata;
      const botellas = Math.ceil(litrosNecesarios / ref.litros);
      const coste = botellas * ref.precio;
      rows.push({
        producto: { id: "", nombre: marca, categoria: ref.categoria, tipo_producto: "bebida", precio_estimado: ref.precio, precio_referencia: ref.precio, precio_manual: null, litros_por_unidad: ref.litros, fuente_precio: "referencia", unidad: "botella 70cl" },
        marca,
        personas: Array.from(data.personas),
        total_unidades: botellas,
        litros_totales: Math.round(litrosNecesarios * 100) / 100,
        coste_unitario: ref.precio,
        coste_total: Math.round(coste * 100) / 100,
      });
    }

    // Cerveza
    if (cervezaDias > 0) {
      const prod = productos.find(p => p.nombre === "Cerveza lata 33cl");
        const ref = prod ? { precio: prod.precio_referencia || prod.precio_estimado, litros: prod.litros_por_unidad || 0.33 } : null;
        if (ref) {
      const litros = cervezaDias * consumo.cerveza;
      const latas = Math.ceil(litros / ref.litros);
      rows.push({
        producto: { id: "", nombre: "Cerveza (lata)", categoria: "cerveza", tipo_producto: "bebida", precio_estimado: ref.precio, precio_referencia: ref.precio, precio_manual: null, litros_por_unidad: ref.litros, fuente_precio: "referencia", unidad: "lata 33cl" },
        marca: "Cerveza",
        personas: [],
        total_unidades: latas,
        litros_totales: Math.round(litros * 100) / 100,
        coste_unitario: ref.precio,
        coste_total: Math.round(latas * ref.precio * 100) / 100,
      });
        }
    }

    // Tinto
    if (tintoDias > 0) {
      const prod = productos.find(p => p.nombre === "Tinto botella 75cl");
        const ref = prod ? { precio: prod.precio_referencia || prod.precio_estimado, litros: prod.litros_por_unidad || 0.75 } : null;
        if (ref) {
      const litros = tintoDias * consumo.tinto;
      const botellas = Math.ceil(litros / ref.litros);
      rows.push({
        producto: { id: "", nombre: "Vino tinto (botella)", categoria: "vino", tipo_producto: "bebida", precio_estimado: ref.precio, precio_referencia: ref.precio, precio_manual: null, litros_por_unidad: ref.litros, fuente_precio: "referencia", unidad: "botella 75cl" },
        marca: "Tinto",
        personas: [],
        total_unidades: botellas,
        litros_totales: Math.round(litros * 100) / 100,
        coste_unitario: ref.precio,
        coste_total: Math.round(botellas * ref.precio * 100) / 100,
      });
        }
    }

    // Refrescos para mezcla
    if (refrescoDias > 0) {
      const prod = productos.find(p => p.nombre === "Coca-Cola 2L");
        const ref = prod ? { precio: prod.precio_referencia || prod.precio_estimado, litros: prod.litros_por_unidad || 2.0 } : null;
        if (ref) {
      const litros = refrescoDias * consumo.refresco;
      const botellas = Math.ceil(litros / ref.litros);
      rows.push({
        producto: { id: "", nombre: "Refrescos (varios)", categoria: "refresco", tipo_producto: "bebida", precio_estimado: ref.precio, precio_referencia: ref.precio, precio_manual: null, litros_por_unidad: ref.litros, fuente_precio: "referencia", unidad: "botella 2L" },
        marca: "Refresco",
        personas: [],
        total_unidades: botellas,
        litros_totales: Math.round(litros * 100) / 100,
        coste_unitario: ref.precio,
        coste_total: Math.round(botellas * ref.precio * 100) / 100,
      });
        }
    }

    // Agua
    if (aguaDias > 0) {
      const prod = productos.find(p => p.nombre === "Agua 1.5L");
        const ref = prod ? { precio: prod.precio_referencia || prod.precio_estimado, litros: prod.litros_por_unidad || 1.5 } : null;
        if (ref) {
      const litros = aguaDias * consumo.agua;
      const botellas = Math.ceil(litros / ref.litros);
      rows.push({
        producto: { id: "", nombre: "Agua (botella)", categoria: "agua", tipo_producto: "bebida", precio_estimado: ref.precio, precio_referencia: ref.precio, precio_manual: null, litros_por_unidad: ref.litros, fuente_precio: "referencia", unidad: "botella 1.5L" },
        marca: "Agua",
        personas: [],
        total_unidades: botellas,
        litros_totales: Math.round(litros * 100) / 100,
        coste_unitario: ref.precio,
        coste_total: Math.round(botellas * ref.precio * 100) / 100,
      });
        }
    }

    // Hielo
    if (hieloPersonaDias > 0) {
      const prod = productos.find(p => p.nombre === "Hielo (bolsa 2kg)");
        const ref = prod ? { precio: prod.precio_referencia || prod.precio_estimado, litros: prod.litros_por_unidad || 2.0 } : null;
        if (ref) {
      const kilos = hieloPersonaDias * consumo.hielo;
      const bolsas = Math.ceil(kilos / ref.litros);
      rows.push({
        producto: { id: "", nombre: "Hielo (bolsa)", categoria: "hielo", tipo_producto: "hielo", precio_estimado: ref.precio, precio_referencia: ref.precio, precio_manual: null, litros_por_unidad: ref.litros, fuente_precio: "referencia", unidad: "bolsa 2kg" },
        marca: "Hielo",
        personas: [],
        total_unidades: bolsas,
        litros_totales: Math.round(kilos * 100) / 100,
        coste_unitario: ref.precio,
        coste_total: Math.round(bolsas * ref.precio * 100) / 100,
      });
        }
    }

    setFilas(rows);
    const total = rows.reduce((s, r) => s + r.coste_total, 0);
    setTotalCoste(Math.round(total * 100) / 100);

    const litrosAlcohol = rows.filter(r => ["ron", "whisky", "vodka", "ginebra"].includes(r.producto.categoria)).reduce((s, r) => s + r.litros_totales, 0);
    setTotalLitrosAlcohol(Math.round(litrosAlcohol * 100) / 100);
    setLoading(false);
  }, [supabase, pena, params.id, productos, refreshKey]);

  useEffect(() => { calcularLista(); }, [calcularLista, refreshKey]);

  const handleRefreshPrecios = async () => {
    setRefreshLoading(true);
    await new Promise(r => setTimeout(r, 800)); // simulate
    calcularLista();
    setRefreshLoading(false);
    toast.success("Precios actualizados (referencia)");
  };

  if (loading) return <div className="p-8 text-center">Calculando lista de compra...</div>;

  return (
    <div>
      <PageHeader title="Lista de compra" description="Generada automáticamente desde los registros de asistencia" actions={
        <div className="flex gap-2">
          {isAdmin && (
            <Button size="sm" variant="outline" onClick={handleRefreshPrecios} disabled={refreshLoading}>
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${refreshLoading ? "animate-spin" : ""}`} /> Precios
            </Button>
          )}
        </div>
      } />

      {filas.length === 0 ? (
        <div className="text-center py-12">
          <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-bold">No hay datos de asistencia aún</p>
          <p className="text-sm">Cuando los miembros se inscriban, la lista se generará automáticamente.</p>
        </div>
      ) : (
        <>
          <Card className="mb-6 bg-[var(--color-yellow)]/20">
            <CardContent className="pt-4 text-center space-y-1">
              <p className="text-3xl font-extrabold">{totalCoste.toFixed(2)}€</p>
              <p className="text-sm font-bold">coste total estimado</p>
              {totalLitrosAlcohol > 0 && <p className="text-xs">({totalLitrosAlcohol}L de alcohol + refrescos + hielo)</p>}
              <p className="text-xs opacity-60 mt-1">Precios de la base de datos. Actualizalos desde Supabase &gt; productos_catalogo.</p>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {filas.map((fila, i) => (
              <Card key={i}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-bold">{fila.producto.nombre}</h3>
                      <p className="text-xs capitalize">{fila.producto.categoria}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-extrabold">{fila.coste_total.toFixed(2)}€</p>
                      <p className="text-xs">{fila.total_unidades} uds × {fila.coste_unitario.toFixed(2)}€</p>
                    </div>
                  </div>

                  {fila.producto.tipo_producto === "bebida" && fila.producto.litros_por_unidad > 0 && (
                    <div className="grid grid-cols-3 gap-2 mb-2 text-xs">
                      <div className="bg-[var(--bg-page)] px-2 py-1 rounded text-center">
                        <span className="font-bold">{fila.total_unidades}</span> unidades
                      </div>
                      <div className="bg-[var(--bg-page)] px-2 py-1 rounded text-center">
                        <span className="font-bold">{fila.litros_totales}</span> litros totales
                      </div>
                      <div className="bg-[var(--bg-page)] px-2 py-1 rounded text-center">
                        <span className="font-bold">{(fila.coste_total / fila.litros_totales).toFixed(2)}€</span> / litro
                      </div>
                    </div>
                  )}

                  {fila.personas.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {fila.personas.map(p => (
                        <Badge key={p} variant="primary" className="text-xs">{p}</Badge>
                      ))}
                    </div>
                  )}

                  {fila.producto.fuente_precio === "referencia" && (
                    <p className="text-xs opacity-50 mt-1">Precio de referencia</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
