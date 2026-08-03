"use client";

import { usePena } from "@/context/PenaContext";
import Link from "next/link";
import { Calendar, MessageCircle, DollarSign, Utensils, Calculator, Settings } from "lucide-react";

const navItems = [
  { href: "/asistencia", icon: Calendar, label: "Asistencia" },
  { href: "/chat", icon: MessageCircle, label: "Chat" },
  { href: "/finanzas", icon: DollarSign, label: "Finanzas" },
  { href: "/propuestas", icon: Utensils, label: "Comidas" },
  { href: "/calculadora", icon: Calculator, label: "Calculadora" },
  { href: "/admin", icon: Settings, label: "Admin" },
];

export default function HomePage() {
  const { pena, loading } = usePena();

  if (loading) return <LoadingScreen />;
  if (!pena) return <OnboardingScreen />;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {pena.escudo_url && <img src={pena.escudo_url} alt={pena.nombre} className="w-8 h-8 rounded-full object-cover" />}
            <h1 className="font-bold text-xl" style={{ color: pena.color_primary }}>{pena.nombre}</h1>
          </div>
          <span className="text-sm text-gray-500">v1.0</span>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {navItems.map(({ href, icon: Icon, label }) => (
            <Link key={href} href={href}
              className="flex flex-col items-center gap-3 p-6 bg-white rounded-xl border hover:shadow-md transition-shadow"
              style={{ borderColor: pena.color_primary + "20" }}>
              <Icon className="w-8 h-8" style={{ color: pena.color_primary }} />
              <span className="font-medium text-gray-700">{label}</span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}

function LoadingScreen() {
  return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" /></div>;
}

function OnboardingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <h1 className="text-3xl font-bold">Bienvenido a Peña App</h1>
        <p className="text-gray-600">Gestiona las fiestas de tu peña: asistencia, chat en tiempo real, finanzas, comidas y más.</p>
        <div className="space-y-3">
          <Link href="/pena/crear" className="block w-full py-3 px-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition">Crear una peña</Link>
          <Link href="/pena/unirse" className="block w-full py-3 px-4 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition">Unirse a una peña</Link>
        </div>
      </div>
    </div>
  );
}
