"use client";

import { usePena } from "@/context/PenaContext";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Calendar, MessageCircle, DollarSign, Utensils, Calculator, Settings } from "lucide-react";

const navItems = [
  { href: "asistencia", icon: Calendar, label: "Asistencia" },
  { href: "chat", icon: MessageCircle, label: "Chat" },
  { href: "finanzas", icon: DollarSign, label: "Finanzas" },
  { href: "propuestas", icon: Utensils, label: "Comidas" },
  { href: "calculadora", icon: Calculator, label: "Calculadora" },
  { href: "admin", icon: Settings, label: "Admin" },
];

export default function FiestaPage() {
  const { activePena } = usePena();
  const params = useParams<{ id: string }>();

  return (
    <div>
      <h1 className="text-3xl font-extrabold lowercase mb-6">fiesta</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {navItems.map(({ href, icon: Icon, label }) => (
          <Link key={href} href={`/fiesta/${params.id}/${href}`}
            className="flex flex-col items-center gap-3 p-6 bg-[var(--bg-surface)] border-brutalist shadow-brutalist rounded-[var(--radius-lg)] press-down">
            <div className="w-14 h-14 rounded-full border-2 border-[var(--border-color)] shadow-brutalist-sm flex items-center justify-center bg-[var(--bg-page)]">
              <Icon className="w-7 h-7" style={{ color: activePena?.color_primary }} />
            </div>
            <span className="font-bold text-sm lowercase">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
