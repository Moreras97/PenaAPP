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

export async function guardarAsistencia(data: { user_pena_id?: string; fiesta_id: string; tipo: string; bebida: string | null; tipo_alcohol?: string | null; marca_alcohol?: string | null; mezcla?: string | null; asistencia_id?: string | null; dias: string[] }) {
  const payload: any = { user_pena_id: data.user_pena_id, fiesta_id: data.fiesta_id, tipo: data.tipo, bebida: data.bebida, tipo_alcohol: data.tipo_alcohol || null, marca_alcohol: data.marca_alcohol || null, mezcla: data.mezcla || null };
  let asId = data.asistencia_id;
  if (asId) {
    await fetchAPI("/rest/v1/asistencias?id=eq." + asId, "PATCH", payload);
    await fetchAPI("/rest/v1/asistencia_dias?asistencia_id=eq." + asId, "DELETE");
  } else {
    const result = await fetchAPI("/rest/v1/asistencias", "POST", payload);
    if (result.error) return { error: result.error.message };
    asId = result[0]?.id;
  }
  if (data.tipo === "dias_sueltos" && data.dias.length > 0 && asId) {
    for (const dId of data.dias) await fetchAPI("/rest/v1/asistencia_dias", "POST", { asistencia_id: asId, dia_fiesta_id: dId });
  }
  revalidatePath("/", "layout");
  return { success: true };
}

export async function cancelarAsistencia(asistenciaId: string) {
  await fetchAPI("/rest/v1/asistencias?id=eq." + asistenciaId, "DELETE");
  revalidatePath("/", "layout");
  return { success: true };
}

export async function cargarDatosAsistencia(fiestaId: string) {
  const as = await fetchAPI("/rest/v1/asistencias?fiesta_id=eq." + fiestaId + "&select=*,asistencia_dias(*)", "GET");
  const d = await fetchAPI("/rest/v1/dias_fiesta?fiesta_id=eq." + fiestaId + "&order=fecha", "GET");
  return { asistencias: as.error ? [] : as, dias: d.error ? [] : d };
}


export async function cargarFiesta(fiestaId: string) {
  const result = await fetchAPI("/rest/v1/fiestas?id=eq." + fiestaId + "&select=*", "GET");
  return result.error ? null : (result[0] || null);
}
