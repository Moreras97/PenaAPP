import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import { PenaProvider } from "@/context/PenaContext";
import { Toaster } from "sonner";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
  variable: "--font-dm-sans",
});

export const metadata: Metadata = {
  title: "Peña App — Gestión de Fiestas",
  description: "Gestión integral para peñas de pueblo",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={dmSans.className}>
        <PenaProvider>
          {children}
          <Toaster richColors position="top-right" />
        </PenaProvider>
      </body>
    </html>
  );
}
