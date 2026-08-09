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
};

const getAdminClient = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function adminDeleteFiesta(fiestaId: string) {
  const supabase = await getAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const admin = getAdminClient();
  const { error } = await admin.from("fiestas").delete().eq("id", fiestaId);
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { success: true };
}

export async function adminSaveFiesta(fiestaId: string | null, data: any) {
  const supabase = await getAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const admin = getAdminClient();
  if (fiestaId) {
    const { error } = await admin.from("fiestas").update(data as any).eq("id", fiestaId);
    if (error) return { error: error.message };
  } else {
    const { data: inserted, error } = await admin.from("fiestas").insert(data).select("id");
    if (error) return { error: error.message };

    const newId = inserted?.[0]?.id;
    if (newId && data.fecha_inicio && data.fecha_fin) {
      const start = new Date(data.fecha_inicio);
      const end = new Date(data.fecha_fin);
      const dias = [];
      const cur = new Date(start);
      while (cur <= end) {
        dias.push({ fiesta_id: newId, fecha: cur.toISOString().slice(0, 10), nombre: null });
        cur.setDate(cur.getDate() + 1);
      }
      if (dias.length > 0) {
        const { error: diaError } = await admin.from("dias_fiesta").insert(dias);
        if (diaError) console.error("Error creando dias:", diaError.message);
      }
    }
  }

  revalidatePath("/", "layout");
  return { success: true };
}

export async function adminAddDia(fiestaId: string, fecha: string, nombre: string | null) {
  const supabase = await getAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const admin = getAdminClient();
  const { error } = await admin.from("dias_fiesta").insert({ fiesta_id: fiestaId, fecha, nombre: nombre || null });
  if (error) return { error: error.message };
  return { success: true };
}

export async function adminChangeRole(miembroId: string, rol: string) {
  const supabase = await getAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const admin = getAdminClient();
  const { error } = await admin.from("users_penas").update({ rol }).eq("id", miembroId);
  if (error) return { error: error.message };
  return { success: true };
}

export async function adminToggleApproval(penaId: string, value: boolean) {
  const supabase = await getAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const admin = getAdminClient();
  const { error } = await admin.from("penas").update({ requires_approval: value } as any).eq("id", penaId);
  if (error) return { error: error.message };
  return { success: true };
}

export async function adminApproveOrReject(pendingId: string, approve: boolean) {
  const supabase = await getAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const admin = getAdminClient();
  if (approve) {
    const { data: pending } = await admin.from("pending_members").select("*").eq("id", pendingId).single();
    if (!pending) return { error: "Solicitud no encontrada" };
    await admin.from("users_penas").insert({ user_id: pending.user_id, pena_id: pending.pena_id, nombre_completo: pending.nombre_completo, apodo: pending.apodo || null, rol: "miembro" });
  }
  const { error } = await admin.from("pending_members").delete().eq("id", pendingId);
  if (error) return { error: error.message };
  return { success: true };
}

export async function adminUploadEscudo(penaId: string, base64Data: string, fileName: string) {
  const supabase = await getAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const admin = getAdminClient();
  const bin = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
  const path = `${penaId}/${Date.now()}-${fileName}`;
  const { error } = await admin.storage.from("escudos").upload(path, bin, { contentType: "image/*", upsert: false });
  if (error) return { error: error.message };
  const { data: urlData } = admin.storage.from("escudos").getPublicUrl(path);
  await admin.from("penas").update({ escudo_url: urlData.publicUrl }).eq("id", penaId);
  return { success: true, url: urlData.publicUrl };
}

export async function adminSaveTheme(penaId: string, color_primary: string, color_secondary: string) {
  const supabase = await getAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const admin = getAdminClient();
  const { error } = await admin.from("penas").update({ color_primary, color_secondary }).eq("id", penaId);
  if (error) return { error: error.message };
  return { success: true };
}
