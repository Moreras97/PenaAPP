"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function CrearPenaPage() {
  const [nombre, setNombre] = useState("");
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) { toast.error("Supabase no configurado"); return; }
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Debes iniciar sesión"); return; }

    const { data: pena, error } = await supabase
      .from("penas")
      .insert({ nombre, slug, created_by: user.id })
      .select()
      .single();

    if (error) { toast.error(error.message); setLoading(false); return; }

    await supabase.from("users_penas").insert({
      user_id: user.id,
      pena_id: pena.id,
      nombre_completo: user.user_metadata?.full_name || user.email,
      rol: "admin",
    });

    toast.success("Peña creada correctamente");
    router.push("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <form onSubmit={handleSubmit} className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 space-y-4">
        <h1 className="text-2xl font-bold text-center">Crear una peña</h1>
        <div>
          <label className="block text-sm font-medium mb-1">Nombre</label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => { setNombre(e.target.value); setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")); }}
            className="w-full px-3 py-2 border rounded-lg"
            placeholder="Peña Los Amigos"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Slug (identificador único)</label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""))}
            className="w-full px-3 py-2 border rounded-lg"
            placeholder="pena-los-amigos"
            required
          />
        </div>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Creando..." : "Crear peña"}
        </Button>
      </form>
    </div>
  );
}
