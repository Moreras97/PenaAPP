import type { Metadata } from "next";
import "./globals.css";
import { PenaProvider } from "@/context/PenaContext";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Peña App — Gestión de Fiestas",
  description: "Gestiona las fiestas de tu peña: asistencia, comida, gastos y chat",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <PenaProvider>
          {children}
          <Toaster richColors position="top-center" />
        </PenaProvider>
      </body>
    </html>
  );
}
