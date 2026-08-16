"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { crearPena } from "./actions";
import { buscarMunicipios } from "@/data/municipios";
import { usePena } from "@/context/PenaContext";
import { MapPin } from "lucide-react";
import Link from "next/link";

const PROVINCIAS = [
  "A Coruña","Álava","Albacete","Alicante","Almería","Asturias","Ávila","Badajoz",
  "Baleares","Barcelona","Burgos","Cáceres","Cádiz","Cantabria","Castellón",
  "Ceuta","Ciudad Real","Córdoba","Cuenca","Girona","Granada","Guadalajara",
  "Gipuzkoa","Huelva","Huesca","Jaén","La Rioja","Las Palmas","León","Lleida",
  "Lugo","Madrid","Málaga","Melilla","Murcia","Navarra","Ourense","Palencia",
  "Pontevedra","Salamanca","Santa Cruz de Tenerife","Segovia","Sevilla","Soria",
  "Tarragona","Teruel","Toledo","Valencia","Valladolid","Bizkaia","Zamora",
  "Zaragoza"
];

export default function CrearPenaPage() {
  const [nombre, setNombre] = useState("");
  const [slug, setSlug] = useState("");
  const [provincia, setProvincia] = useState("");
  const [poblacion, setPoblacion] = useState("");
  const [pobResults, setPobResults] = useState<{nombre:string;provincia:string}[]>([]);
  const [pobOpen, setPobOpen] = useState(false);
  const [provOpen, setProvOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { refresh } = usePena();
  const pobRef = useRef<HTMLDivElement>(null);
  const provRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (pobRef.current && !pobRef.current.contains(e.target as Node)) setPobOpen(false);
      if (provRef.current && !provRef.current.contains(e.target as Node)) setProvOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const handlePobChange = (val: string) => {
    setPoblacion(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!val || val.length < 2) { setPobResults([]); setPobOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      const results = await buscarMunicipios(val, provincia || undefined);
      setPobResults(results);
      setPobOpen(results.length > 0);
    }, 200);
  };

  const filteredProvincias = provincia
    ? PROVINCIAS.filter(p => p.toLowerCase().includes(provincia.toLowerCase()))
    : PROVINCIAS;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await crearPena(nombre, slug, provincia, poblacion);
    if ((result as any).error) { toast.error((result as any).error); setLoading(false); return; }
    toast.success("Peña creada correctamente");
    refresh();
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      <header className="bg-[var(--bg-surface)] border-b border-[var(--border-color)]">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="font-bold text-lg">Peña App</Link>
          <Link href="/pena/unirse" className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]">¿Ya tienes un ID? Únete</Link>
        </div>
      </header>
      <main className="max-w-md mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-center mb-2">Crear una peña</h1>
        <p className="text-sm text-center mb-8">Crea el grupo para organizar las fiestas de tu cuadrilla o pueblo.</p>
        <form onSubmit={handleSubmit} className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-[var(--radius-lg)] shadow-[var(--shadow-md)] p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold mb-1.5">Nombre de la peña</label>
            <input type="text" value={nombre}
              onChange={(e) => { setNombre(e.target.value); setSlug(e.target.value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")); }}
              className="w-full"
              placeholder="Peña Los Amigos" required />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1.5">Identificador (para compartir)</label>
            <input type="text" value={slug}
              onChange={(e) => setSlug(e.target.value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""))}
              className="w-full"
              placeholder="pena-los-amigos" required />
            <p className="text-xs mt-1.5 text-[var(--text-secondary)]">Con este ID tus amigos podrán encontrar la peña y unirse.</p>
          </div>

          <div ref={provRef} className="relative">
            <label className="block text-sm font-semibold mb-1.5"><MapPin className="w-3.5 h-3.5 inline mr-1" />Provincia</label>
            <input type="text" value={provincia}
              onChange={(e) => { setProvincia(e.target.value); setProvOpen(true); }}
              onFocus={() => setProvOpen(true)}
              className="w-full"
              placeholder="Buscar provincia..." />
            {provOpen && filteredProvincias.length > 0 && (
              <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-[var(--shadow-lg)] rounded-[var(--radius-md)] max-h-48 overflow-auto">
                {filteredProvincias.map(p => (
                  <button key={p} type="button"
                    onClick={() => { setProvincia(p); setProvOpen(false); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--bg-page)]">
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div ref={pobRef} className="relative">
            <label className="block text-sm font-semibold mb-1.5"><MapPin className="w-3.5 h-3.5 inline mr-1" />Población</label>
            <input type="text" value={poblacion}
              onChange={(e) => handlePobChange(e.target.value)}
              onFocus={() => { if (pobResults.length > 0) setPobOpen(true); }}
              className="w-full"
              placeholder="Escribe tu pueblo o ciudad..." autoComplete="off" />
            {pobOpen && pobResults.length > 0 && (
              <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-[var(--shadow-lg)] rounded-[var(--radius-md)] max-h-48 overflow-auto">
                {pobResults.map(r => (
                  <button key={r.nombre + r.provincia} type="button"
                    onClick={() => { setPoblacion(r.nombre); setProvincia(r.provincia); setPobOpen(false); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--bg-page)]">
                    <span className="font-medium">{r.nombre}</span>
                    <span className="text-xs opacity-50 ml-2">({r.provincia})</span>
                  </button>
                ))}
              </div>
            )}
            {poblacion && pobResults.length === 0 && (
              <p className="text-xs text-[var(--text-secondary)] mt-1">Escribe al menos 2 letras para buscar</p>
            )}
          </div>

          <Button type="submit" disabled={loading} className="w-full" size="lg">
            {loading ? "Creando..." : "Crear peña"}
          </Button>
        </form>
      </main>
    </div>
  );
}
