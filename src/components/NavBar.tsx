import Link from "next/link";
import { auth, signOut } from "@/lib/auth";

export default async function NavBar() {
  const session = await auth();

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="text-lg font-semibold text-slate-800">
          ⛪ Reservas de Salas
        </Link>
        <nav className="flex flex-wrap items-center gap-4 text-sm">
          <Link href="/" className="text-slate-600 hover:text-slate-900">
            Assistente e Calendário
          </Link>
          <Link href="/minha-reserva" className="text-slate-600 hover:text-slate-900">
            Minha reserva
          </Link>
          <Link href="/salas" className="text-slate-600 hover:text-slate-900">
            Salas
          </Link>
          {session?.user ? (
            <>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                {session.user.name} · {session.user.role === "ADMIN" ? "Administração" : "Líder"}
              </span>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button type="submit" className="text-slate-600 hover:text-slate-900">
                  Sair
                </button>
              </form>
            </>
          ) : (
            <Link href="/login" className="text-slate-600 hover:text-slate-900">
              Login (Líder/Administração)
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
