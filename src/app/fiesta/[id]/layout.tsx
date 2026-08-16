"use client";

import { usePena } from "@/context/PenaContext";
import Link from "next/link";
import { usePathname, useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { salirDePena } from "@/app/pena/actions";
import {
  Home, CalendarCheck, Utensils, Wallet, MessageCircle, ShoppingCart,
  Calculator, Settings, Plus, LogIn, LogOut, ChevronDown, Copy, Check,
  MoreHorizontal, Users, Crown, Shield, User, CalendarDays,
} from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

interface FiestaItem { id: string; nombre: string; fecha_inicio: string; fecha_fin: string; }

export default function FiestaLayout({ children }: { children: React.ReactNode }) {
  const { activePena, memberships, switchPena, loading, refreshKey, activeUserPena } = usePena();
  const pathname = usePathname();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const [fiestas, setFiestas] = useState<FiestaItem[]>([]);
  const [fiestasOpen, setFiestasOpen] = useState(false);
  const fiestasRef = useRef<HTMLDivElement>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [slugCopied, setSlugCopied] = useState(false);

  const isAdmin = activeUserPena?.rol === "admin" || activeUserPena?.rol === "mod";
  const currentFiesta = fiestas.find((f) => f.id === params.id);

  const tabs = [
    { href: "", label: "Inicio", icon: Home },
    { href: "asistencia", label: "¿Vengo?", icon: CalendarCheck },
    { href: "propuestas", label: "Comida", icon: Utensils },
    { href: "finanzas", label: "Gastos", icon: Wallet },
    { href: "chat", label: "Charlar", icon: MessageCircle },
    { href: "lista-compra", label: "La compra", icon: ShoppingCart },
    { href: "calculadora", label: "Presupuesto", icon: Calculator },
  ];
  const visibleTabs = [...tabs, ...(isAdmin ? [{ href: "admin", label: "Configuración", icon: Settings }] : [])];

  const mobilePrimary = ["", "asistencia", "propuestas", "finanzas", "chat"];
  const mobileMore = visibleTabs.filter((t) => !mobilePrimary.includes(t.href));

  const handleLogout = async () => {
    const s = createClient();
    if (s) await s.auth.signOut();
    window.location.href = "/auth";
  };

  const handleLeavePena = async () => {
    if (!activePena) return;
    if (!confirm(`¿Seguro que quieres salir de ${activePena.nombre}?`)) return;
    const r = await salirDePena(activePena.id);
    if (r.error) { toast.error(r.error); return; }
    if ((r as any).esUltimo) toast.warning("Eras el último miembro. La peña ha quedado vacía.");
    toast.success("Has salido de la peña");
    window.location.reload();
  };

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
      if (fiestasRef.current && !fiestasRef.current.contains(e.target as Node)) setFiestasOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    if (!activePena) return;
    const supabase = createClient();
    if (!supabase) return;
    supabase.from("fiestas")
      .select("id,nombre,fecha_inicio,fecha_fin")
      .eq("pena_id", activePena.id)
      .order("fecha_inicio", { ascending: false })
      .then(({ data }) => setFiestas(data || []));
  }, [activePena, refreshKey]);

  if (loading) return <Spinner />;

  if (!activePena) {
    return (
      <div className="min-h-screen bg-[var(--bg-page)]">
        <header className="bg-[var(--bg-surface)] border-b border-[var(--border-color)]">
          <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
            <Brand />
            <Link href="/" className="text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Inicio</Link>
          </div>
        </header>
        <main className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
          <h1 className="text-2xl font-bold">Sin peña activa</h1>
          <p>Si tienes el identificador de una peña, únete con él. Si no, crea una nueva.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link href="/pena/unirse">
              <button className="w-full px-5 py-3 bg-[var(--color-primary)] text-white font-semibold rounded-[var(--radius-md)] hover:bg-[var(--color-primary-hover)] transition-colors">
                Unirme con un ID
              </button>
            </Link>
            <Link href="/pena/crear">
              <button className="w-full px-5 py-3 bg-[var(--bg-surface)] border border-[var(--border-color)] font-semibold rounded-[var(--radius-md)] hover:bg-[var(--bg-page)] transition-colors">
                Crear una peña
              </button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      <header className="sticky top-0 z-40 bg-[var(--bg-surface)] border-b border-[var(--border-color)]">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/" className="flex items-center gap-3 shrink-0">
              {activePena.escudo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={activePena.escudo_url} alt={activePena.nombre} className="w-9 h-9 rounded-full border border-[var(--border-color)] object-cover" />
              ) : (
                <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white" style={{ backgroundColor: activePena.color_primary || "var(--color-primary)" }}>
                  {activePena.nombre.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="font-bold truncate">{activePena.nombre}</span>
            </Link>

            {fiestas.length > 1 && (
              <div className="relative hidden sm:block" ref={fiestasRef}>
                <button
                  onClick={() => setFiestasOpen(!fiestasOpen)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold bg-[var(--bg-page)] rounded-[var(--radius-md)] hover:bg-gray-200/60 transition-colors"
                >
                  <CalendarDays className="w-4 h-4 text-[var(--text-secondary)]" />
                  {currentFiesta?.nombre || "Fiestas"}
                  <ChevronDown className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                </button>
                {fiestasOpen && (
                  <div className="absolute left-0 top-full mt-2 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-[var(--radius-md)] shadow-[var(--shadow-lg)] py-1 min-w-[200px] z-50">
                    {fiestas.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => { setFiestasOpen(false); if (f.id !== params.id) router.push(`/fiesta/${f.id}`); }}
                        className={cn("w-full text-left px-4 py-2 text-sm hover:bg-[var(--bg-page)]", f.id === params.id && "font-semibold bg-[var(--bg-page)]")}
                      >
                        {f.nombre}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {memberships.length > 1 && (
              <span className="hidden sm:inline-flex items-center gap-1 text-xs text-[var(--text-secondary)] bg-[var(--bg-page)] rounded-[var(--radius-pill)] px-2.5 py-1">
                <Users className="w-3.5 h-3.5" /> {memberships.length} peñas
              </span>
            )}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                aria-label="Menú de perfil"
                className="w-9 h-9 rounded-full bg-[var(--bg-page)] border border-[var(--border-color)] flex items-center justify-center font-bold text-sm hover:bg-gray-200/60 transition-colors"
              >
                {activeUserPena?.apodo ? activeUserPena.apodo.charAt(0).toUpperCase() : (activeUserPena?.nombre_completo || "U").charAt(0).toUpperCase()}
              </button>
              {profileOpen && (
                <div className="absolute right-0 top-full mt-2 w-60 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-[var(--radius-md)] shadow-[var(--shadow-lg)] py-1 z-50">
                  <div className="px-4 py-2 border-b border-[var(--border-color)]">
                    <p className="text-sm font-semibold truncate">{activeUserPena?.nombre_completo || activePena.nombre}</p>
                    <p className="text-xs text-[var(--text-secondary)] truncate">ID: {activePena.slug}</p>
                  </div>
                  {memberships.length > 1 && (
                    <div className="py-1">
                      <p className="px-4 pt-1 pb-0.5 text-[11px] uppercase tracking-wide text-[var(--text-secondary)] font-semibold">Cambiar de peña</p>
                      {memberships.map((m) => {
                        const RoleIcon = m.userPena.rol === "admin" ? Crown : m.userPena.rol === "mod" ? Shield : User;
                        return (
                          <button
                            key={m.pena.id}
                            onClick={() => { switchPena(m.pena.id); setProfileOpen(false); router.push("/"); }}
                            className={cn("w-full text-left px-4 py-1.5 text-sm hover:bg-[var(--bg-page)] flex items-center gap-2", m.pena.id === activePena.id && "font-semibold")}
                          >
                            <span className="truncate">{m.pena.nombre}</span>
                            <RoleIcon className="w-3.5 h-3.5 text-[var(--text-secondary)] shrink-0" />
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <div className="py-1 border-t border-[var(--border-color)]">
                    <Link href="/pena/crear" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 px-4 py-1.5 text-sm hover:bg-[var(--bg-page)]">
                      <Plus className="w-4 h-4 text-[var(--text-secondary)]" /> Crear peña
                    </Link>
                    <Link href="/pena/unirse" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 px-4 py-1.5 text-sm hover:bg-[var(--bg-page)]">
                      <LogIn className="w-4 h-4 text-[var(--text-secondary)]" /> Unirme a una peña
                    </Link>
                    <button onClick={handleLeavePena} className="w-full flex items-center gap-2 px-4 py-1.5 text-sm text-red-600 hover:bg-red-50">
                      Salir de {activePena.nombre}
                    </button>
                  </div>
                  <div className="py-1 border-t border-[var(--border-color)]">
                    <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-1.5 text-sm hover:bg-[var(--bg-page)]">
                      <LogOut className="w-4 h-4 text-[var(--text-secondary)]" /> Cerrar sesión
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <nav className="hidden sm:block bg-[var(--bg-surface)] border-b border-[var(--border-color)]">
        <div className="max-w-5xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {visibleTabs.map(({ href, label, icon: Icon }) => {
            const full = href ? `/fiesta/${params.id}/${href}` : `/fiesta/${params.id}`;
            const active = href ? pathname.startsWith(full) : pathname === full;
            return (
              <Link key={href || "home"} href={full}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                  active ? "border-[var(--color-primary)] text-[var(--color-primary-hover)]" : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                )}>
                <Icon className="w-4 h-4" /> {label}
              </Link>
            );
          })}
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-6 pb-28 sm:pb-10">
        {currentFiesta && (
          <p className="sm:hidden text-sm font-semibold text-[var(--text-secondary)] mb-3 flex items-center gap-1.5">
            <CalendarDays className="w-4 h-4" /> {currentFiesta.nombre}
          </p>
        )}
        {children}
      </main>

      <nav className="sm:hidden fixed bottom-0 inset-x-0 bg-[var(--bg-surface)] border-t border-[var(--border-color)] z-40">
        <div className="flex items-stretch">
          {mobilePrimary.map((href) => {
            const tab = visibleTabs.find((t) => t.href === href);
            if (!tab) return null;
            const full = href ? `/fiesta/${params.id}/${href}` : `/fiesta/${params.id}`;
            const active = href ? pathname.startsWith(full) : pathname === full;
            return (
              <Link key={href || "home"} href={full} className={cn("flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-medium", active ? "text-[var(--color-primary-hover)]" : "text-[var(--text-secondary)]")}>
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </Link>
            );
          })}
          <button onClick={() => setMoreOpen(true)} className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-medium text-[var(--text-secondary)]">
            <MoreHorizontal className="w-5 h-5" />
            Más
          </button>
        </div>
      </nav>

      {moreOpen && (
        <div className="sm:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMoreOpen(false)} />
          <div className="absolute bottom-0 inset-x-0 bg-[var(--bg-surface)] rounded-t-[var(--radius-lg)] p-4 pb-8">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
            <p className="font-bold mb-2 px-1">Más opciones</p>
            <div className="space-y-1">
              {mobileMore.map(({ href, label, icon: Icon }) => {
                const full = `/fiesta/${params.id}/${href}`;
                const active = pathname.startsWith(full);
                return (
                  <Link key={href} href={full} onClick={() => setMoreOpen(false)}
                    className={cn("flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] text-sm font-medium hover:bg-[var(--bg-page)]", active && "bg-[var(--bg-page)] text-[var(--color-primary-hover)]")}>
                    <Icon className="w-5 h-5 text-[var(--text-secondary)]" /> {label}
                  </Link>
                );
              })}
              <div className="border-t border-[var(--border-color)] mt-2 pt-2">
                <button
                  onClick={() => { navigator.clipboard.writeText(activePena.slug); setSlugCopied(true); toast.success("ID copiado al portapapeles"); setTimeout(() => setSlugCopied(false), 2000); }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] text-sm font-medium hover:bg-[var(--bg-page)] w-full text-left"
                >
                  {slugCopied ? <Check className="w-5 h-5 text-[var(--color-primary)]" /> : <Copy className="w-5 h-5 text-[var(--text-secondary)]" />} Copiar ID de la peña
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2">
      <div className="w-9 h-9 bg-[var(--color-primary)] rounded-full flex items-center justify-center text-white">
        <Crown className="w-5 h-5" />
      </div>
      <span className="font-bold text-lg">Peña App</span>
    </div>
  );
}
