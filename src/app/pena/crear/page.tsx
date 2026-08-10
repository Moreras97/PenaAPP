"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { crearPena } from "./actions";
import { buscarMunicipios } from "@/data/municipios";
import { usePena } from "@/context/PenaContext";
import { MapPin } from "lucide-react";

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
    <div className="min-h-screen flex items-center justify-center px-4 bg-[var(--bg-page)]">
      <form onSubmit={handleSubmit} className="max-w-md w-full bg-[var(--bg-surface)] border-brutalist shadow-brutalist-lg rounded-[var(--radius-lg)] p-8 space-y-5">
        <h1 className="text-2xl font-extrabold text-center">Crear una peña</h1>

        <div>
          <label className="block text-sm font-bold mb-1.5">Nombre de la peña</label>
          <input type="text" value={nombre}
            onChange={(e) => { setNombre(e.target.value); setSlug(e.target.value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")); }}
            className="w-full px-4 py-2.5 bg-[var(--bg-surface)] border-brutalist shadow-brutalist-sm rounded-[var(--radius-sm)] font-medium focus:outline-none focus:border-[var(--color-primary)] focus:shadow-brutalist transition-all"
            placeholder="Peña Los Amigos" required />
        </div>

        <div>
          <label className="block text-sm font-bold mb-1.5">Identificador único</label>
          <input type="text" value={slug}
            onChange={(e) => setSlug(e.target.value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""))}
            className="w-full px-4 py-2.5 bg-[var(--bg-surface)] border-brutalist shadow-brutalist-sm rounded-[var(--radius-sm)] font-medium focus:outline-none focus:border-[var(--color-primary)] focus:shadow-brutalist transition-all"
            placeholder="pena-los-amigos" required />
        </div>

        <div ref={provRef} className="relative">
          <label className="block text-sm font-bold mb-1.5"><MapPin className="w-3.5 h-3.5 inline mr-1" />Provincia</label>
          <input type="text" value={provincia}
            onChange={(e) => { setProvincia(e.target.value); setProvOpen(true); }}
            onFocus={() => setProvOpen(true)}
            className="w-full px-4 py-2.5 bg-[var(--bg-surface)] border-brutalist shadow-brutalist-sm rounded-[var(--radius-sm)] font-medium focus:outline-none focus:border-[var(--color-primary)] focus:shadow-brutalist transition-all"
            placeholder="Buscar provincia..." />
          {provOpen && filteredProvincias.length > 0 && (
            <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-[var(--bg-surface)] border-brutalist shadow-brutalist rounded-[var(--radius-md)] max-h-48 overflow-auto">
              {filteredProvincias.map(p => (
                <button key={p} type="button"
                  onClick={() => { setProvincia(p); setProvOpen(false); }}
                  className="w-full text-left px-3 py-2 text-sm font-medium hover:bg-[var(--bg-page)] transition">
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>

        <div ref={pobRef} className="relative">
          <label className="block text-sm font-bold mb-1.5"><MapPin className="w-3.5 h-3.5 inline mr-1" />Población</label>
          <input type="text" value={poblacion}
            onChange={(e) => handlePobChange(e.target.value)}
            onFocus={() => { if (pobResults.length > 0) setPobOpen(true); }}
            className="w-full px-4 py-2.5 bg-[var(--bg-surface)] border-brutalist shadow-brutalist-sm rounded-[var(--radius-sm)] font-medium focus:outline-none focus:border-[var(--color-primary)] focus:shadow-brutalist transition-all"
            placeholder="Escribe el nombre de tu pueblo o ciudad..." autoComplete="off" />
          {pobOpen && pobResults.length > 0 && (
            <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-[var(--bg-surface)] border-brutalist shadow-brutalist rounded-[var(--radius-md)] max-h-48 overflow-auto">
              {pobResults.map(r => (
                <button key={r.nombre + r.provincia} type="button"
                  onClick={() => { setPoblacion(r.nombre); setProvincia(r.provincia); setPobOpen(false); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--bg-page)] transition">
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
    </div>
  );
}
