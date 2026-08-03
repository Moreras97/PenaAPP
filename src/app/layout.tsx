import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { PenaProvider } from "@/context/PenaContext";
import { Toaster } from "sonner";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Peña App — Gestión de Fiestas",
  description: "Gestión integral para peñas de pueblo",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={geist.className}>
        <PenaProvider>
          {children}
          <Toaster richColors position="top-right" />
        </PenaProvider>
      </body>
    </html>
  );
}
