"use server";

import municipiosData from "@/data/municipios.json";

const data = municipiosData as Record<string, string[]>;

export async function buscarMunicipios(query: string) {
  if (!query || query.length < 1) return [];
  const q = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const results: { nombre: string; provincia: string }[] = [];
  for (const [provincia, municipios] of Object.entries(data)) {
    for (const m of municipios) {
      const mn = m.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (mn.includes(q)) {
        results.push({ nombre: m, provincia });
        if (results.length >= 20) return results;
      }
    }
  }
  return results;
}

export async function getProvincias(): Promise<string[]> {
  return Object.keys(data).sort();
}
