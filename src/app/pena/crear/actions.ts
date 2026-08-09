"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

export async function crearPena(nombre: string, slug: string) {
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
    .insert({ nombre, slug, created_by: user.id })
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

  revalidatePath("/", "layout");

  return { success: true };
}
