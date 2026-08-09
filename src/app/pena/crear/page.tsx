"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { crearPena } from "./actions";

export default function CrearPenaPage() {
  const [nombre, setNombre] = useState("");
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await crearPena(nombre, slug);
    if (result.error) { toast.error(result.error); setLoading(false); return; }
    toast.success("Peña creada correctamente");
    router.push("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[var(--bg-page)]">
      <form onSubmit={handleSubmit} className="max-w-md w-full bg-[var(--bg-surface)] border-brutalist shadow-brutalist-lg rounded-[var(--radius-lg)] p-8 space-y-5">
        <h1 className="text-2xl font-extrabold text-center">Crear una peña</h1>
        <div>
          <label className="block text-sm font-bold mb-1.5">Nombre</label>
          <input type="text" value={nombre}
            onChange={(e) => { setNombre(e.target.value); setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")); }}
            className="w-full px-4 py-2.5 bg-[var(--bg-surface)] border-brutalist shadow-brutalist-sm rounded-[var(--radius-sm)] font-medium focus:outline-none focus:border-[var(--color-primary)] focus:shadow-brutalist transition-all"
            placeholder="Peña Los Amigos" required />
        </div>
        <div>
          <label className="block text-sm font-bold mb-1.5">Identificador único</label>
          <input type="text" value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""))}
            className="w-full px-4 py-2.5 bg-[var(--bg-surface)] border-brutalist shadow-brutalist-sm rounded-[var(--radius-sm)] font-medium focus:outline-none focus:border-[var(--color-primary)] focus:shadow-brutalist transition-all"
            placeholder="pena-los-amigos" required />
        </div>
        <Button type="submit" disabled={loading} className="w-full" size="lg">
          {loading ? "Creando..." : "Crear peña"}
        </Button>
      </form>
    </div>
  );
}
