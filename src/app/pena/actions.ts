"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

const getAuthClient = async () => {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll(cs) { cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } } }
  );
};

const getAdminClient = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function salirDePena(penaId: string) {
  const supabase = await getAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };
  const admin = getAdminClient();

  const { count } = await admin.from("users_penas").select("*", { count: "exact", head: true }).eq("pena_id", penaId);
  const esUltimo = count === 1;

  await admin.from("users_penas").delete().eq("user_id", user.id).eq("pena_id", penaId);
  revalidatePath("/", "layout");
  return { success: true, esUltimo };
}

export async function adminUpdateProfile(miembroId: string, nombre_completo: string, apodo: string | null) {
  const supabase = await getAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };
  const admin = getAdminClient();
  const { error } = await admin.from("users_penas").update({ nombre_completo, apodo: apodo || null }).eq("id", miembroId);
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { success: true };
}

export async function adminSavePenaInfo(penaId: string, provincia: string | null, poblacion: string | null) {
  const supabase = await getAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };
  const admin = getAdminClient();
  const { error } = await admin.from("penas").update({ provincia: provincia || null, poblacion: poblacion || null }).eq("id", penaId);
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { success: true };
}
