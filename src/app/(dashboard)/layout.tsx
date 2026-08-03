"use client";

import { usePena } from "@/context/PenaContext";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, Calendar, MessageCircle, DollarSign, Utensils, Calculator, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/asistencia", icon: Calendar, label: "Asistencia" },
  { href: "/chat", icon: MessageCircle, label: "Chat" },
  { href: "/finanzas", icon: DollarSign, label: "Finanzas" },
  { href: "/propuestas", icon: Utensils, label: "Comidas" },
  { href: "/calculadora", icon: Calculator, label: "Calculadora" },
  { href: "/admin", icon: Settings, label: "Admin" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { pena } = usePena();
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            {pena?.escudo_url && (
              <img src={pena.escudo_url} alt={pena.nombre} className="w-8 h-8 rounded-full object-cover" />
            )}
            <h1 className="font-bold text-xl" style={{ color: pena?.color_primary }}>
              {pena?.nombre || "Peña App"}
            </h1>
          </Link>
        </div>
      </nav>

      <div className="flex">
        <aside className="w-64 bg-white border-r min-h-[calc(100vh-4rem)] hidden lg:block sticky top-16">
          <nav className="p-4 space-y-1">
            {navItems.map(({ href, icon: Icon, label }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition",
                  pathname.startsWith(href)
                    ? "text-white"
                    : "text-gray-600 hover:bg-gray-100"
                )}
                style={pathname.startsWith(href) ? { backgroundColor: pena?.color_primary || "#6366F1" } : {}}
              >
                <Icon className="w-5 h-5" />
                {label}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="flex-1 p-6">
          {children}
        </main>
      </div>

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t z-10">
        <div className="flex justify-around py-2">
          {navItems.slice(0, 5).map(({ href, icon: Icon, label }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn("flex flex-col items-center gap-0.5 px-2 py-1 text-xs", active ? "" : "text-gray-400")}
                style={active ? { color: pena?.color_primary || "#6366F1" } : {}}
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
