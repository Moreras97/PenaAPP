"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function UnirsePenaPage() {
  const [slug, setSlug] = useState("");
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [apodo, setApodo] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) { toast.error("Supabase no configurado"); return; }
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Debes iniciar sesión"); return; }

    const { data: pena, error: penaError } = await supabase
      .from("penas")
      .select("id")
      .eq("slug", slug)
      .single();

    if (penaError || !pena) { toast.error("No se encontró esa peña"); setLoading(false); return; }

    const { error } = await supabase.from("users_penas").insert({
      user_id: user.id,
      pena_id: pena.id,
      nombre_completo: nombreCompleto,
      apodo: apodo || null,
      rol: "miembro",
    });

    if (error) {
      toast.error(error.code === "23505" ? "Ya perteneces a esta peña" : error.message);
      setLoading(false);
      return;
    }

    toast.success("Te has unido a la peña");
    router.push("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <form onSubmit={handleSubmit} className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 space-y-4">
        <h1 className="text-2xl font-bold text-center">Unirse a una peña</h1>
        <div>
          <label className="block text-sm font-medium mb-1">Slug de la peña</label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            placeholder="pena-los-amigos"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Tu nombre completo</label>
          <input
            type="text"
            value={nombreCompleto}
            onChange={(e) => setNombreCompleto(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            placeholder="Juan García"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Apodo (opcional)</label>
          <input
            type="text"
            value={apodo}
            onChange={(e) => setApodo(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            placeholder="Juancar"
          />
        </div>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Uniéndose..." : "Unirse"}
        </Button>
      </form>
    </div>
  );
}
