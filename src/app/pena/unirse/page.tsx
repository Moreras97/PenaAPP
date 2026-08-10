"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { buscarPenaPorSlug, unirseAPena } from "./actions";
import { usePena } from "@/context/PenaContext";

export default function UnirsePenaPage() {
  const [slug, setSlug] = useState("");
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [apodo, setApodo] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { refresh } = usePena();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) { toast.error("Supabase no configurado"); return; }
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Debes iniciar sesion"); setLoading(false); return; }

    const pena = await buscarPenaPorSlug(slug.trim());
    if (!pena) { toast.error("No se encontro esa pena"); setLoading(false); return; }

    const r = await unirseAPena({
      userId: user.id,
      penaId: pena.id,
      nombreCompleto,
      apodo: apodo || null,
      requiresApproval: pena.requires_approval,
    });

    if (r.error) { toast.error(r.error); setLoading(false); return; }

    if (pena.requires_approval) {
      toast.success("Solicitud enviada. El admin debe aprobarla.");
    } else {
      toast.success("Te has unido a la pena");
    }
    refresh();
    router.push("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[var(--bg-page)]">
      <form onSubmit={handleSubmit} className="max-w-md w-full bg-[var(--bg-surface)] border-brutalist shadow-brutalist-lg rounded-[var(--radius-lg)] p-8 space-y-5">
        <h1 className="text-2xl font-extrabold text-center">Unirse a una pena</h1>
        <div>
          <label className="block text-sm font-bold mb-1.5">Identificador unico</label>
          <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)}
            className="w-full px-4 py-2.5 bg-[var(--bg-surface)] border-brutalist shadow-brutalist-sm rounded-[var(--radius-sm)] font-medium focus:outline-none focus:border-[var(--color-primary)] focus:shadow-brutalist transition-all"
            placeholder="lolete-el-mejor" required />
        </div>
        <div>
          <label className="block text-sm font-bold mb-1.5">Tu nombre completo</label>
          <input type="text" value={nombreCompleto} onChange={(e) => setNombreCompleto(e.target.value)}
            className="w-full px-4 py-2.5 bg-[var(--bg-surface)] border-brutalist shadow-brutalist-sm rounded-[var(--radius-sm)] font-medium focus:outline-none focus:border-[var(--color-primary)] focus:shadow-brutalist transition-all"
            placeholder="Juan Garcia" required />
        </div>
        <div>
          <label className="block text-sm font-bold mb-1.5">Apodo (opcional)</label>
          <input type="text" value={apodo} onChange={(e) => setApodo(e.target.value)}
            className="w-full px-4 py-2.5 bg-[var(--bg-surface)] border-brutalist shadow-brutalist-sm rounded-[var(--radius-sm)] font-medium focus:outline-none focus:border-[var(--color-primary)] focus:shadow-brutalist transition-all"
            placeholder="Juancar" />
        </div>
        <Button type="submit" disabled={loading} className="w-full" size="lg">
          {loading ? "Uniendose..." : "Unirse"}
        </Button>
      </form>
    </div>
  );
}
