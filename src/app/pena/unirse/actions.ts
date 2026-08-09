"use server";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SRV = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function fetchAPI(path: string, method: string, body?: any) {
  const headers: any = { "apikey": SRV, "Authorization": "Bearer " + SRV, "Content-Type": "application/json" };
  if (method !== "GET" && method !== "DELETE") headers["Prefer"] = "return=representation";
  const res = await fetch(URL + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) return null;
  const data = await res.json();
  return data;
}

export async function buscarPenaPorSlug(slug: string) {
  const data = await fetchAPI("/rest/v1/penas?select=id,nombre,requires_approval&slug=eq." + encodeURIComponent(slug), "GET");
  if (!data || data.length === 0) return null;
  return data[0];
}

export async function unirseAPena(data: {
  userId: string; penaId: string; nombreCompleto: string;
  apodo: string | null; requiresApproval: boolean;
}) {
  if (data.requiresApproval) {
    const result = await fetchAPI("/rest/v1/pending_members", "POST", {
      user_id: data.userId, pena_id: data.penaId,
      nombre_completo: data.nombreCompleto, apodo: data.apodo,
    });
    if (!result) return { error: "Error al enviar solicitud" };
  } else {
    const result = await fetchAPI("/rest/v1/users_penas", "POST", {
      user_id: data.userId, pena_id: data.penaId,
      nombre_completo: data.nombreCompleto, apodo: data.apodo, rol: "miembro",
    });
    if (!result) return { error: "Error al unirse" };
  }
  return { success: true };
}
