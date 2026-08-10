"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

export async function crearPena(nombre: string, slug: string, provincia: string, poblacion: string) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (!user) return { error: `Sesion invalida. ${authErr?.message || ""}` };

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: pena, error } = await admin
    .from("penas")
    .insert({ nombre, slug, provincia: provincia || null, poblacion: poblacion || null, created_by: user.id })
    .select()
    .single();

  if (error) return { error: error.message };

  const { error: memberError } = await admin.from("users_penas").insert({
    user_id: user.id,
    pena_id: pena.id,
    nombre_completo: user.user_metadata?.full_name || user.email,
    rol: "admin",
  });

  if (memberError) return { error: memberError.message };

  // Seed del catálogo de productos por defecto
  const productosDefault = [
    { pena_id: pena.id, nombre: "Cerveza lata 33cl", categoria: "cerveza", precio_estimado: 0.55, precio_referencia: 0.55, litros_por_unidad: 0.33, fuente_precio: "referencia", unidad: "lata 33cl", tipo_producto: "bebida" },
    { pena_id: pena.id, nombre: "Tinto botella 75cl", categoria: "vino", precio_estimado: 3.50, precio_referencia: 3.50, litros_por_unidad: 0.75, fuente_precio: "referencia", unidad: "botella 75cl", tipo_producto: "bebida" },
    { pena_id: pena.id, nombre: "Coca-Cola 2L", categoria: "refresco", precio_estimado: 1.85, precio_referencia: 1.85, litros_por_unidad: 2.0, fuente_precio: "referencia", unidad: "botella 2L", tipo_producto: "bebida" },
    { pena_id: pena.id, nombre: "Agua 1.5L", categoria: "agua", precio_estimado: 0.60, precio_referencia: 0.60, litros_por_unidad: 1.5, fuente_precio: "referencia", unidad: "botella 1.5L", tipo_producto: "bebida" },
    { pena_id: pena.id, nombre: "Hielo (bolsa 2kg)", categoria: "hielo", precio_estimado: 1.20, precio_referencia: 1.20, litros_por_unidad: 2.0, fuente_precio: "referencia", unidad: "bolsa 2kg", tipo_producto: "hielo" },
    { pena_id: pena.id, nombre: "Brugal", categoria: "ron", precio_estimado: 12.50, precio_referencia: 12.50, litros_por_unidad: 0.7, fuente_precio: "referencia", unidad: "botella 70cl", tipo_producto: "bebida" },
    { pena_id: pena.id, nombre: "Barceló", categoria: "ron", precio_estimado: 12.50, precio_referencia: 12.50, litros_por_unidad: 0.7, fuente_precio: "referencia", unidad: "botella 70cl", tipo_producto: "bebida" },
    { pena_id: pena.id, nombre: "Cacique", categoria: "ron", precio_estimado: 14.95, precio_referencia: 14.95, litros_por_unidad: 0.7, fuente_precio: "referencia", unidad: "botella 70cl", tipo_producto: "bebida" },
    { pena_id: pena.id, nombre: "Havana Club", categoria: "ron", precio_estimado: 15.95, precio_referencia: 15.95, litros_por_unidad: 0.7, fuente_precio: "referencia", unidad: "botella 70cl", tipo_producto: "bebida" },
    { pena_id: pena.id, nombre: "Diplomático", categoria: "ron", precio_estimado: 18.90, precio_referencia: 18.90, litros_por_unidad: 0.7, fuente_precio: "referencia", unidad: "botella 70cl", tipo_producto: "bebida" },
    { pena_id: pena.id, nombre: "Santa Teresa", categoria: "ron", precio_estimado: 13.90, precio_referencia: 13.90, litros_por_unidad: 0.7, fuente_precio: "referencia", unidad: "botella 70cl", tipo_producto: "bebida" },
    { pena_id: pena.id, nombre: "Johnnie Walker", categoria: "whisky", precio_estimado: 17.95, precio_referencia: 17.95, litros_por_unidad: 0.7, fuente_precio: "referencia", unidad: "botella 70cl", tipo_producto: "bebida" },
    { pena_id: pena.id, nombre: "Ballantine's", categoria: "whisky", precio_estimado: 13.95, precio_referencia: 13.95, litros_por_unidad: 0.7, fuente_precio: "referencia", unidad: "botella 70cl", tipo_producto: "bebida" },
    { pena_id: pena.id, nombre: "DYC", categoria: "whisky", precio_estimado: 8.95, precio_referencia: 8.95, litros_por_unidad: 0.7, fuente_precio: "referencia", unidad: "botella 70cl", tipo_producto: "bebida" },
    { pena_id: pena.id, nombre: "J&B", categoria: "whisky", precio_estimado: 12.95, precio_referencia: 12.95, litros_por_unidad: 0.7, fuente_precio: "referencia", unidad: "botella 70cl", tipo_producto: "bebida" },
    { pena_id: pena.id, nombre: "Jack Daniel's", categoria: "whisky", precio_estimado: 21.95, precio_referencia: 21.95, litros_por_unidad: 0.7, fuente_precio: "referencia", unidad: "botella 70cl", tipo_producto: "bebida" },
    { pena_id: pena.id, nombre: "Absolut", categoria: "vodka", precio_estimado: 14.95, precio_referencia: 14.95, litros_por_unidad: 0.7, fuente_precio: "referencia", unidad: "botella 70cl", tipo_producto: "bebida" },
    { pena_id: pena.id, nombre: "Smirnoff", categoria: "vodka", precio_estimado: 12.95, precio_referencia: 12.95, litros_por_unidad: 0.7, fuente_precio: "referencia", unidad: "botella 70cl", tipo_producto: "bebida" },
    { pena_id: pena.id, nombre: "Larios", categoria: "ginebra", precio_estimado: 10.95, precio_referencia: 10.95, litros_por_unidad: 0.7, fuente_precio: "referencia", unidad: "botella 70cl", tipo_producto: "bebida" },
    { pena_id: pena.id, nombre: "Beefeater", categoria: "ginebra", precio_estimado: 14.95, precio_referencia: 14.95, litros_por_unidad: 0.7, fuente_precio: "referencia", unidad: "botella 70cl", tipo_producto: "bebida" },
    { pena_id: pena.id, nombre: "Tanqueray", categoria: "ginebra", precio_estimado: 18.95, precio_referencia: 18.95, litros_por_unidad: 0.7, fuente_precio: "referencia", unidad: "botella 70cl", tipo_producto: "bebida" },
    { pena_id: pena.id, nombre: "Bombay Sapphire", categoria: "ginebra", precio_estimado: 17.95, precio_referencia: 17.95, litros_por_unidad: 0.7, fuente_precio: "referencia", unidad: "botella 70cl", tipo_producto: "bebida" },
    { pena_id: pena.id, nombre: "Puerto de Indias", categoria: "ginebra", precio_estimado: 15.95, precio_referencia: 15.95, litros_por_unidad: 0.7, fuente_precio: "referencia", unidad: "botella 70cl", tipo_producto: "bebida" },
    { pena_id: pena.id, nombre: "Nordés", categoria: "ginebra", precio_estimado: 24.95, precio_referencia: 24.95, litros_por_unidad: 0.7, fuente_precio: "referencia", unidad: "botella 70cl", tipo_producto: "bebida" },
    { pena_id: pena.id, nombre: "Fanta Naranja 2L", categoria: "refresco", precio_estimado: 1.85, precio_referencia: 1.85, litros_por_unidad: 2.0, fuente_precio: "referencia", unidad: "botella 2L", tipo_producto: "bebida" },
    { pena_id: pena.id, nombre: "Fanta Limón 2L", categoria: "refresco", precio_estimado: 1.85, precio_referencia: 1.85, litros_por_unidad: 2.0, fuente_precio: "referencia", unidad: "botella 2L", tipo_producto: "bebida" },
    { pena_id: pena.id, nombre: "Tónica 2L", categoria: "refresco", precio_estimado: 1.85, precio_referencia: 1.85, litros_por_unidad: 2.0, fuente_precio: "referencia", unidad: "botella 2L", tipo_producto: "bebida" },
    { pena_id: pena.id, nombre: "Sprite 2L", categoria: "refresco", precio_estimado: 1.85, precio_referencia: 1.85, litros_por_unidad: 2.0, fuente_precio: "referencia", unidad: "botella 2L", tipo_producto: "bebida" },
    { pena_id: pena.id, nombre: "Red Bull lata 25cl", categoria: "refresco", precio_estimado: 1.50, precio_referencia: 1.50, litros_por_unidad: 0.25, fuente_precio: "referencia", unidad: "lata 25cl", tipo_producto: "bebida" },
    { pena_id: pena.id, nombre: "Vasos plástico (pack 50)", categoria: "varios", precio_estimado: 3.50, precio_referencia: 3.50, litros_por_unidad: 1, fuente_precio: "referencia", unidad: "pack 50", tipo_producto: "varios" },
    { pena_id: pena.id, nombre: "Platos plástico (pack 50)", categoria: "varios", precio_estimado: 4.50, precio_referencia: 4.50, litros_por_unidad: 1, fuente_precio: "referencia", unidad: "pack 50", tipo_producto: "varios" },
    { pena_id: pena.id, nombre: "Cubiertos plástico (pack 50)", categoria: "varios", precio_estimado: 2.95, precio_referencia: 2.95, litros_por_unidad: 1, fuente_precio: "referencia", unidad: "pack 50", tipo_producto: "varios" },
    { pena_id: pena.id, nombre: "Servilletas (pack 100)", categoria: "varios", precio_estimado: 1.50, precio_referencia: 1.50, litros_por_unidad: 1, fuente_precio: "referencia", unidad: "pack 100", tipo_producto: "varios" },
    { pena_id: pena.id, nombre: "Carbón (saco 5kg)", categoria: "varios", precio_estimado: 6.95, precio_referencia: 6.95, litros_por_unidad: 5, fuente_precio: "referencia", unidad: "saco 5kg", tipo_producto: "varios" },
    { pena_id: pena.id, nombre: "Pan de molde", categoria: "comida", precio_estimado: 1.20, precio_referencia: 1.20, litros_por_unidad: 1, fuente_precio: "referencia", unidad: "ud", tipo_producto: "comida" },
    { pena_id: pena.id, nombre: "Aceite girasol 1L", categoria: "comida", precio_estimado: 2.50, precio_referencia: 2.50, litros_por_unidad: 1, fuente_precio: "referencia", unidad: "botella 1L", tipo_producto: "comida" },
    { pena_id: pena.id, nombre: "Salchichas frescas (kg)", categoria: "comida", precio_estimado: 5.50, precio_referencia: 5.50, litros_por_unidad: 1, fuente_precio: "referencia", unidad: "kg", tipo_producto: "comida" },
    { pena_id: pena.id, nombre: "Chorizo criollo (kg)", categoria: "comida", precio_estimado: 7.95, precio_referencia: 7.95, litros_por_unidad: 1, fuente_precio: "referencia", unidad: "kg", tipo_producto: "comida" },
    { pena_id: pena.id, nombre: "Morcilla (kg)", categoria: "comida", precio_estimado: 4.95, precio_referencia: 4.95, litros_por_unidad: 1, fuente_precio: "referencia", unidad: "kg", tipo_producto: "comida" },
    { pena_id: pena.id, nombre: "Panceta (kg)", categoria: "comida", precio_estimado: 6.50, precio_referencia: 6.50, litros_por_unidad: 1, fuente_precio: "referencia", unidad: "kg", tipo_producto: "comida" },
    { pena_id: pena.id, nombre: "Patatas fritas bolsa grande", categoria: "comida", precio_estimado: 2.50, precio_referencia: 2.50, litros_por_unidad: 1, fuente_precio: "referencia", unidad: "ud", tipo_producto: "comida" },
    { pena_id: pena.id, nombre: "Aceitunas (lata)", categoria: "comida", precio_estimado: 1.80, precio_referencia: 1.80, litros_por_unidad: 1, fuente_precio: "referencia", unidad: "ud", tipo_producto: "comida" },
    { pena_id: pena.id, nombre: "Ketchup (botella)", categoria: "comida", precio_estimado: 2.20, precio_referencia: 2.20, litros_por_unidad: 1, fuente_precio: "referencia", unidad: "ud", tipo_producto: "comida" },
    { pena_id: pena.id, nombre: "Mostaza (botella)", categoria: "comida", precio_estimado: 1.80, precio_referencia: 1.80, litros_por_unidad: 1, fuente_precio: "referencia", unidad: "ud", tipo_producto: "comida" },
    { pena_id: pena.id, nombre: "Bolsas basura (pack 50)", categoria: "varios", precio_estimado: 3.95, precio_referencia: 3.95, litros_por_unidad: 1, fuente_precio: "referencia", unidad: "pack 50", tipo_producto: "varios" },
  ];
  await admin.from("productos_catalogo").insert(productosDefault);

  revalidatePath("/", "layout");

  return { success: true };
}
