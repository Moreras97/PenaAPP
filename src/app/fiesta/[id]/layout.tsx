"use client";

import { usePena } from "@/context/PenaContext";
import Link from "next/link";
import { usePathname, useParams, useRouter } from "next/navigation";
import { Calendar, MessageCircle, DollarSign, Utensils, Calculator, Settings, Sparkles, Plus, LogIn, ChevronDown, Home, ShoppingCart, Copy, Check, LogOut } from "lucide-react";
import { Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";

const navItems = [
  { href: "asistencia", icon: Calendar, label: "Asistencia" },
  { href: "chat", icon: MessageCircle, label: "Chat" },
  { href: "finanzas", icon: DollarSign, label: "Finanzas" },
  { href: "propuestas", icon: Utensils, label: "Comidas" },
  { href: "calculadora", icon: Calculator, label: "Calculadora" },
  { href: "lista-compra", icon: ShoppingCart, label: "Compra" },
  { href: "admin", icon: Settings, label: "Admin" },
];

export default function FiestaLayout({ children }: { children: React.ReactNode }) {
  const { activePena, memberships, switchPena, loading } = usePena();
  const pathname = usePathname();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [fiestas, setFiestas] = useState<{id:string;nombre:string;fecha_inicio:string;fecha_fin:string}[]>([]);
  const [fiestasOpen, setFiestasOpen] = useState(false);
  const [slugCopied, setSlugCopied] = useState(false);

  const handleLogout = async () => {
    const s = createClient();
    if (s) await s.auth.signOut();
    window.location.href = "/auth";
  };

  const handleLeavePena = async () => {
    if (!activePena || !memberships[0]) return;
    if (!confirm("Seguro que quieres salir de " + activePena.nombre + "?")) return;
    const s = createClient();
    if (!s) return;
    const { data: { user } } = await s.auth.getUser();
    if (!user) return;
    await s.from("users_penas").delete().eq("user_id", user.id).eq("pena_id", activePena.id);
    window.location.reload();
  };
  const fiestasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    const hfc = (e: MouseEvent) => { if (fiestasRef.current && !fiestasRef.current.contains(e.target as Node)) setFiestasOpen(false); };
    document.addEventListener("mousedown", hfc);
    return () => { document.removeEventListener("mousedown", handleClick); document.removeEventListener("mousedown", hfc); };
  }, []);

    useEffect(() => {
    if (!activePena) return;
    const supabase = createClient();
    if (!supabase) return;
    supabase.from("fiestas").select("id,nombre,fecha_inicio,fecha_fin").eq("pena_id", activePena.id).order("fecha_inicio", { ascending: false }).then(({ data }) => setFiestas(data || []));
  }, [activePena]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-page)]">
        <div className="w-10 h-10 border-3 border-[var(--border-color)] border-t-[var(--color-primary)] rounded-full animate-spin" />
      </div>
    );
  }

  if (!activePena) {
    return (
      <div className="min-h-screen bg-[var(--bg-page)]">
        <nav className="bg-[var(--bg-surface)] border-b-2 border-[var(--border-color)] shadow-brutalist mx-4 rounded-[var(--radius-lg)] z-20">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[var(--color-primary)] border-2 border-[var(--border-color)] rounded-full flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="font-extrabold text-lg lowercase">peña app</span>
            </Link>
          </div>
        </nav>
        <main className="max-w-lg mx-auto px-4 pt-24 text-center space-y-6">
          <h2 className="text-3xl font-extrabold lowercase">sin peña activa</h2>
          <p className="text-[var(--text-secondary)]">crea una peña nueva o únete a una existente</p>
          <div className="flex gap-4 justify-center">
            <Link href="/pena/crear" className="px-6 py-3 bg-[var(--color-primary)] text-white font-bold border-brutalist shadow-brutalist rounded-[var(--radius-md)] press-down flex items-center gap-2">
              <Plus className="w-4 h-4" /> crear
            </Link>
            <Link href="/pena/unirse" className="px-6 py-3 bg-[var(--bg-surface)] font-bold border-brutalist shadow-brutalist rounded-[var(--radius-md)] press-down flex items-center gap-2">
              <LogIn className="w-4 h-4" /> unirse
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      <nav className="bg-[var(--bg-surface)] border-b-2 border-[var(--border-color)] shadow-brutalist mx-4 rounded-[var(--radius-lg)] z-20">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition">
              {activePena.escudo_url ? (
                <img src={activePena.escudo_url} alt={activePena.nombre} className="w-9 h-9 rounded-full border-2 border-[var(--border-color)] object-cover" />
              ) : (
                <div className="w-9 h-9 bg-[var(--color-primary)] border-2 border-[var(--border-color)] rounded-full flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
              )}
              <div className="flex flex-col">
                <span className="font-extrabold text-lg lowercase hidden sm:block leading-tight" style={{ color: activePena.color_primary || "var(--color-primary)" }}>
                  {activePena.nombre}
                </span>
                <span className="text-[10px] text-[var(--text-secondary)] hidden sm:flex items-center gap-1 lowercase">
                  ID: {activePena.slug}
                  <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); navigator.clipboard.writeText(activePena.slug); setSlugCopied(true); toast.success("ID copiado al portapapeles"); setTimeout(() => setSlugCopied(false), 2000); }}
                    className="inline-flex items-center hover:text-[var(--color-primary)] transition">
                    {slugCopied ? <Check className="w-3 h-3 text-[var(--color-teal)]" /> : <Copy className="w-3 h-3" />}
                  </button>
                </span>
              </div>
            </Link>
            <Link href={`/fiesta/${params.id}`} className={cn(
              "hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold lowercase rounded-[var(--radius-sm)] transition",
              pathname === `/fiesta/${params.id}` ? "text-white shadow-brutalist-sm press-down border-brutalist" : "bg-[var(--bg-page)] border-brutalist shadow-brutalist-sm press-down"
            )}
              style={pathname === `/fiesta/${params.id}` ? { backgroundColor: activePena.color_primary || "var(--color-primary)" } : {}}
            >
              <Home className="w-4 h-4" /> inicio
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {memberships.length > 1 && (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 bg-[var(--bg-page)] border-brutalist shadow-brutalist-sm rounded-[var(--radius-md)] press-down text-xs sm:text-sm font-bold lowercase"
                >
                  cambiar <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4" />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-full mt-2 bg-[var(--bg-surface)] border-brutalist shadow-brutalist rounded-[var(--radius-md)] py-1 min-w-[180px] z-30">
                    {memberships.map((m) => (
                      <button
                        key={m.pena.id}
                        onClick={() => { switchPena(m.pena.id); setMenuOpen(false); router.push("/"); }}
                        className={cn(
                          "w-full text-left px-4 py-2 text-sm font-bold lowercase hover:bg-[var(--bg-page)] transition",
                          m.pena.id === activePena.id && "bg-[var(--bg-page)]"
                        )}
                      >
                        {m.pena.nombre}
                        <span className="ml-2 text-xs text-[var(--text-secondary)] lowercase">{m.userPena.rol}</span>
                      </button>
                    ))}
                    <div className="border-t-2 border-[var(--border-color)] mt-1 pt-1">
                      <Link href="/pena/crear" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-sm font-bold lowercase hover:bg-[var(--bg-page)]">+ crear peña</Link>
                      <Link href="/pena/unirse" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-sm font-bold lowercase hover:bg-[var(--bg-page)]">+ unirse a peña</Link>
                      <div className="border-t-2 border-[var(--border-color)] mt-1 pt-1">
                        <button onClick={() => { setMenuOpen(false); handleLeavePena(); }} className="w-full text-left px-4 py-2 text-sm font-bold lowercase hover:bg-red-50 text-[var(--color-primary)] transition">
                          salir de {activePena.nombre}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            <Link href="/pena/crear" className="flex items-center gap-1 px-2 sm:px-3 py-1.5 bg-[var(--bg-page)] border-brutalist shadow-brutalist-sm rounded-[var(--radius-md)] press-down text-xs sm:text-sm font-bold lowercase">
              <Plus className="w-3 h-3 sm:w-4 sm:h-4" /> crear
            </Link>
            <Link href="/pena/unirse" className="flex items-center gap-1 px-2 sm:px-3 py-1.5 bg-[var(--bg-page)] border-brutalist shadow-brutalist-sm rounded-[var(--radius-md)] press-down text-xs sm:text-sm font-bold lowercase">
              <LogIn className="w-3 h-3 sm:w-4 sm:h-4" /> unirse
            </Link>
            <button onClick={handleLogout} className="flex items-center gap-1 px-2 sm:px-3 py-1.5 bg-[var(--bg-page)] border-brutalist shadow-brutalist-sm rounded-[var(--radius-md)] press-down text-xs sm:text-sm font-bold lowercase hover:bg-red-50" title="Cerrar sesion">
              <LogOut className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>
      </nav>

      {fiestas.length > 0 && (
        <div className="hidden sm:flex justify-center gap-1 py-2 px-4 flex-wrap items-center">
          <span className="text-xs font-bold mr-1 opacity-50">Fiestas</span>
          {fiestas.map(f => (
            <Link key={f.id} href={`/fiesta/${f.id}`}
              className={cn(
                "px-2.5 py-1 text-xs font-bold rounded-[var(--radius-md)] border-brutalist shadow-brutalist-sm press-down transition",
                params.id === f.id ? "bg-[var(--color-primary)] text-white" : (new Date(f.fecha_fin) < new Date() ? "bg-[var(--bg-page)] opacity-50" : "bg-[var(--bg-surface)]")
              )}>
              {f.nombre} {new Date(f.fecha_fin) < new Date() ? "(finalizada)" : ""}
            </Link>
          ))}
        </div>
      )}
      <div className="hidden sm:flex justify-center gap-1 py-2 px-4 flex-wrap">
        <Link href={`/fiesta/${params.id}`}
          className={cn(
            "px-4 py-2 text-sm font-bold lowercase rounded-[var(--radius-md)] border-brutalist shadow-brutalist-sm press-down transition",
            pathname === `/fiesta/${params.id}` ? "bg-[var(--color-primary)] text-white" : "bg-[var(--bg-surface)]"
          )}>
          <Home className="w-4 h-4 inline mr-1.5" /> inicio
        </Link>
        {navItems.map(({ href, icon: Icon, label }) => {
          const fullHref = `/fiesta/${params.id}/${href}`;
          const active = pathname.startsWith(fullHref);
          return (
            <Link key={href} href={fullHref}
              className={cn(
                "px-4 py-2 text-sm font-bold lowercase rounded-[var(--radius-md)] border-brutalist shadow-brutalist-sm press-down transition",
                active ? "bg-[var(--color-primary)] text-white" : "bg-[var(--bg-surface)]"
              )}>
              <Icon className="w-4 h-4 inline mr-1.5" /> {label}
            </Link>
          );
        })}
      </div>

      <div className="pt-2 pb-24 sm:pb-6 px-4 max-w-5xl mx-auto">
        {children}
      </div>

      {fiestas.length > 1 && (
        <div className="sm:hidden flex justify-center px-4 py-1" ref={fiestasRef}>
          <button onClick={() => setFiestasOpen(!fiestasOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-[var(--bg-surface)] border-brutalist shadow-brutalist-sm rounded-[var(--radius-md)] press-down">
            <Clock className="w-3.5 h-3.5" /> Otras fiestas
          </button>
          {fiestasOpen && (
            <div className="absolute left-4 right-4 bottom-20 bg-[var(--bg-surface)] border-brutalist shadow-brutalist-lg rounded-[var(--radius-md)] p-2 z-30 max-h-52 overflow-auto">
              {fiestas.map(f => (
                <Link key={f.id} href={`/fiesta/${f.id}`} onClick={() => setFiestasOpen(false)}
                  className={cn(
                    "block px-3 py-2 text-sm font-bold rounded-[var(--radius-sm)] mb-0.5",
                    params.id === f.id ? "bg-[var(--color-primary)] text-white" : (new Date(f.fecha_fin) < new Date() ? "bg-[var(--bg-page)] opacity-50" : "hover:bg-[var(--bg-page)]")
                  )}>
                  {f.nombre} {new Date(f.fecha_fin) < new Date() ? "(finalizada)" : ""}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
      <nav className="sm:hidden fixed bottom-3 left-3 right-3 bg-[var(--bg-surface)] border-brutalist shadow-brutalist-lg rounded-[var(--radius-lg)] z-20">
        <div className="flex justify-around py-2 px-1">
          {[{ href: "", icon: Home, label: "Inicio" }, ...navItems.slice(0, 4)].map(({ href, icon: Icon, label }) => {
            const fullHref = href ? `/fiesta/${params.id}/${href}` : `/fiesta/${params.id}`;
            const active = href ? pathname.startsWith(fullHref) : pathname === fullHref;
            return (
              <Link
                key={href || "home"}
                href={fullHref}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-2 py-1 rounded-[var(--radius-sm)] text-[10px] font-bold lowercase transition-all duration-100",
                  active ? "text-white shadow-brutalist-sm" : "text-[var(--text-secondary)]"
                )}
                style={active ? { backgroundColor: activePena.color_primary || "var(--color-primary)" } : {}}
              >
                <Icon className="w-5 h-5" />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
