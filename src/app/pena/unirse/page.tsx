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

    const { data: pena } = await supabase.from("penas").select("id, requires_approval").eq("slug", slug).single();
    if (!pena) { toast.error("No se encontró esa peña"); setLoading(false); return; }

    const { data: existing } = await supabase.from("users_penas").select("id").eq("user_id", user.id).eq("pena_id", pena.id).maybeSingle();
    if (existing) { toast.error("Ya perteneces a esta peña"); setLoading(false); return; }

    const { data: pending } = await supabase.from("pending_members").select("id").eq("user_id", user.id).eq("pena_id", pena.id).maybeSingle();
    if (pending) { toast.error("Ya has solicitado unirte. Espera aprobación."); setLoading(false); return; }

    if (pena.requires_approval) {
      const { error } = await supabase.from("pending_members").insert({
        user_id: user.id, pena_id: pena.id,
        nombre_completo: nombreCompleto, apodo: apodo || null,
      });
      if (error) { toast.error(error.message); setLoading(false); return; }
      toast.success("Solicitud enviada. El admin debe aprobarla.");
    } else {
      const { error } = await supabase.from("users_penas").insert({
        user_id: user.id, pena_id: pena.id,
        nombre_completo: nombreCompleto, apodo: apodo || null, rol: "miembro",
      });
      if (error) { toast.error(error.message); setLoading(false); return; }
      toast.success("Te has unido a la peña");
    }
    router.push("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[var(--bg-page)]">
      <form onSubmit={handleSubmit} className="max-w-md w-full bg-[var(--bg-surface)] border-brutalist shadow-brutalist-lg rounded-[var(--radius-lg)] p-8 space-y-5">
        <h1 className="text-2xl font-extrabold text-center">Unirse a una peña</h1>
        <div>
          <label className="block text-sm font-bold mb-1.5">Identificador único</label>
          <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)}
            className="w-full px-4 py-2.5 bg-[var(--bg-surface)] border-brutalist shadow-brutalist-sm rounded-[var(--radius-sm)] font-medium focus:outline-none focus:border-[var(--color-primary)] focus:shadow-brutalist transition-all"
            placeholder="pena-los-amigos" required />
        </div>
        <div>
          <label className="block text-sm font-bold mb-1.5">Tu nombre completo</label>
          <input type="text" value={nombreCompleto} onChange={(e) => setNombreCompleto(e.target.value)}
            className="w-full px-4 py-2.5 bg-[var(--bg-surface)] border-brutalist shadow-brutalist-sm rounded-[var(--radius-sm)] font-medium focus:outline-none focus:border-[var(--color-primary)] focus:shadow-brutalist transition-all"
            placeholder="Juan García" required />
        </div>
        <div>
          <label className="block text-sm font-bold mb-1.5">Apodo (opcional)</label>
          <input type="text" value={apodo} onChange={(e) => setApodo(e.target.value)}
            className="w-full px-4 py-2.5 bg-[var(--bg-surface)] border-brutalist shadow-brutalist-sm rounded-[var(--radius-sm)] font-medium focus:outline-none focus:border-[var(--color-primary)] focus:shadow-brutalist transition-all"
            placeholder="Juancar" />
        </div>
        <Button type="submit" disabled={loading} className="w-full" size="lg">
          {loading ? "Uniéndose..." : "Unirse"}
        </Button>
      </form>
    </div>
  );
}
