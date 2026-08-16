"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { buscarPenaPorSlug, unirseAPena } from "./actions";
import { usePena } from "@/context/PenaContext";
import Link from "next/link";

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
    if (!user) { toast.error("Debes iniciar sesión"); setLoading(false); return; }

    const pena = await buscarPenaPorSlug(slug.trim());
    if (!pena) { toast.error("No se encontró esa peña. Comprueba el ID."); setLoading(false); return; }

    const r = await unirseAPena({
      userId: user.id,
      penaId: pena.id,
      nombreCompleto,
      apodo: apodo || null,
      requiresApproval: pena.requires_approval,
    });

    if (r.error) { toast.error(r.error); setLoading(false); return; }

    if (pena.requires_approval) {
      toast.success("Solicitud enviada. El organizador debe aprobarla.");
    } else {
      toast.success("Te has unido a la peña");
    }
    refresh();
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      <header className="bg-[var(--bg-surface)] border-b border-[var(--border-color)]">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="font-bold text-lg">Peña App</Link>
          <Link href="/pena/crear" className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]">¿No tienes peña? Crea una</Link>
        </div>
      </header>
      <main className="max-w-md mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-center mb-2">Unirme a una peña</h1>
        <p className="text-sm text-center mb-8">Pídele el ID a quien organiza la peña y únete con tus datos.</p>
        <form onSubmit={handleSubmit} className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-[var(--radius-lg)] shadow-[var(--shadow-md)] p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold mb-1.5">Identificador de la peña</label>
            <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)}
              className="w-full"
              placeholder="peña-los-amigos" required />
            <p className="text-xs mt-1.5 text-[var(--text-secondary)]">Es el ID que aparece junto al nombre de la peña.</p>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1.5">Tu nombre completo</label>
            <input type="text" value={nombreCompleto} onChange={(e) => setNombreCompleto(e.target.value)}
              className="w-full"
              placeholder="Juan García" required />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1.5">Apodo (opcional)</label>
            <input type="text" value={apodo} onChange={(e) => setApodo(e.target.value)}
              className="w-full"
              placeholder="Juancar" />
          </div>
          <Button type="submit" disabled={loading} className="w-full" size="lg">
            {loading ? "Uniéndome..." : "Unirme a la peña"}
          </Button>
        </form>
      </main>
    </div>
  );
}
