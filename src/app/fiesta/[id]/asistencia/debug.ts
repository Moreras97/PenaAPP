"use server";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SRV = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function debugData(fiestaId: string) {
  const path = "/rest/v1/asistencias?fiesta_id=eq." + fiestaId + "&select=count";
  try {
    const res = await fetch(URL + path, {
      headers: { "apikey": SRV, "Authorization": "Bearer " + SRV },
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, text: text.substring(0, 200), url: URL.substring(0, 30), keyExists: !!SRV, path };
  } catch(e: any) {
    return { error: e.message };
  }
}
