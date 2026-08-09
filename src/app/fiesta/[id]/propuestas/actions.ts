"use server";

import { revalidatePath } from "next/cache";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SRV = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function fetchAPI(path: string, method: string, body?: any) {
  const headers: any = { "apikey": SRV, "Authorization": "Bearer " + SRV, "Content-Type": "application/json" };
  if (method !== "GET" && method !== "DELETE") headers["Prefer"] = "return=representation";
  const res = await fetch(URL + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  if (!res.ok) return { error: { message: text } };
  try { return JSON.parse(text); } catch { return text; }
}

export async function crearPropuesta(data: {
  pena_id: string; fiesta_id: string; dia_fiesta_id: string;
  propuesto_por: string; menu: string; tipo_comida: string; hora: string | null;
  se_encarga: boolean;
}) {
  const result = await fetchAPI("/rest/v1/propuestas_menu", "POST", data);
  if (result.error) return { error: result.error.message };

  if (data.se_encarga && result[0]) {
    await fetchAPI("/rest/v1/propuestas_cocineros", "POST", {
      propuesta_id: result[0].id, user_pena_id: data.propuesto_por
    }).catch(() => {});
  }

  revalidatePath("/", "layout");
  return { success: true };
}

export async function toggleCocinero(propuestaId: string, userPenaId: string) {
  const existing = await fetchAPI(
    "/rest/v1/propuestas_cocineros?propuesta_id=eq." + propuestaId + "&user_pena_id=eq." + userPenaId,
    "GET"
  );

  if (Array.isArray(existing) && existing.length > 0) {
    await fetchAPI("/rest/v1/propuestas_cocineros?id=eq." + existing[0].id, "DELETE");
  } else {
    await fetchAPI("/rest/v1/propuestas_cocineros", "POST", {
      propuesta_id: propuestaId, user_pena_id: userPenaId
    });
  }

  revalidatePath("/", "layout");
  return { success: true };
}

export async function aprobarPropuesta(propuestaId: string, userPenaId: string) {
  await fetchAPI("/rest/v1/propuestas_menu?id=eq." + propuestaId, "PATCH", {
    aprobado: true, aprobado_por: userPenaId
  });
  revalidatePath("/", "layout");
  return { success: true };
}

export async function eliminarPropuesta(propuestaId: string) {
  await fetchAPI("/rest/v1/propuestas_menu?id=eq." + propuestaId, "DELETE");
  revalidatePath("/", "layout");
  return { success: true };
}

export async function cargarDatosPropuestas(penaId: string, fiestaId: string) {
  const [propRes, diasRes] = await Promise.all([
    fetchAPI(
      "/rest/v1/propuestas_menu?pena_id=eq." + penaId + "&fiesta_id=eq." + fiestaId
      + "&select=*,proponente:propuesto_por(*),aprobador:aprobado_por(*),dia:dias_fiesta(*),cocineros:propuestas_cocineros(*,user_pena:users_penas(id,nombre_completo,apodo))" 
      + "&order=created_at",
      "GET"
    ),
    fetchAPI(
      "/rest/v1/dias_fiesta?fiesta_id=eq." + fiestaId + "&order=fecha",
      "GET"
    ),
  ]);

  return {
    propuestas: propRes.error ? [] : propRes,
    dias: diasRes.error ? [] : diasRes,
  };
}
