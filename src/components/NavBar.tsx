import Link from "next/link";
import Image from "next/image";
import { auth, signOut } from "@/lib/auth";

export default async function NavBar() {
  const session = await auth();

  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="Rocha Church Campinas"
            width={40}
            height={24}
            className="h-8 w-auto sm:h-9"
            priority
          />
          <span className="leading-tight">
            <span className="block text-[10px] uppercase tracking-wide text-accent-light sm:text-[11px]">
              Sistema de Reservas
            </span>
            <span className="block text-sm font-semibold text-foreground sm:text-base">
              Rocha Church Campinas
            </span>
          </span>
        </Link>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <Link href="/" className="text-muted hover:text-accent-light">
            Assistente e Calendário
          </Link>
          <Link href="/minha-reserva" className="text-muted hover:text-accent-light">
            Minha reserva
          </Link>
          <Link href="/salas" className="text-muted hover:text-accent-light">
            Salas
          </Link>
          {session?.user ? (
            <>
              <span className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-white">
                {session.user.name} · {session.user.role === "ADMIN" ? "Administração" : "Líder"}
              </span>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button type="submit" className="text-muted hover:text-accent-light">
                  Sair
                </button>
              </form>
            </>
          ) : (
            <Link href="/login" className="text-muted hover:text-accent-light">
              Login (Líder/Administração)
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
