import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import NavBar from "@/components/NavBar";

export const metadata: Metadata = {
  title: "Sistema de Reservas | Rocha Church Campinas",
  description: "Reserva de salas da Rocha Church Campinas: assistente, calendário e gestão por sala.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Providers>
          <NavBar />
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6">{children}</main>
          <footer className="border-t border-border bg-surface py-4 text-center text-xs text-muted">
            Rocha Church Campinas — Sistema de Reservas de Salas
          </footer>
        </Providers>
      </body>
    </html>
  );
}
