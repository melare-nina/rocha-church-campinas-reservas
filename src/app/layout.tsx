import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import NavBar from "@/components/NavBar";

export const metadata: Metadata = {
  title: "Reservas de Salas | Igreja",
  description: "Sistema de reservas de salas da igreja: assistente, calendário e gestão por sala.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        <Providers>
          <NavBar />
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
          <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
            Sistema de reservas de salas — fuso horário local da igreja
          </footer>
        </Providers>
      </body>
    </html>
  );
}
