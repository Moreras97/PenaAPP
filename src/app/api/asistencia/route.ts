import { NextRequest, NextResponse } from "next/server";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SRV = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  const fiestaId = request.nextUrl.searchParams.get("fiestaId");
  if (!fiestaId) return NextResponse.json({ error: "fiestaId required" }, { status: 400 });

  const [fiRes, asRes, dRes] = await Promise.all([
    fetch(URL + "/rest/v1/fiestas?id=eq." + fiestaId + "&select=*", { headers: { apikey: SRV, Authorization: "Bearer " + SRV } }),
    fetch(URL + "/rest/v1/asistencias?fiesta_id=eq." + fiestaId + "&select=*,asistencia_dias(*)", { headers: { apikey: SRV, Authorization: "Bearer " + SRV } }),
    fetch(URL + "/rest/v1/dias_fiesta?fiesta_id=eq." + fiestaId + "&order=fecha", { headers: { apikey: SRV, Authorization: "Bearer " + SRV } }),
  ]);

  const [fiData, asData, dData] = await Promise.all([fiRes.json(), asRes.json(), dRes.json()]);
  return NextResponse.json({ fiesta: fiData[0] || null, asistencias: asData, dias: dData });
}
