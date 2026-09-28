import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listarReservas, serializarReserva } from "@/lib/reservations";

// GET /api/reservations?roomId=&ministerio=&status=&tipo=unica|recorrente&data=YYYY-MM-DD
// Uso interno da aba "Salas" — exige login (Líder ou Administração).
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const roomId = searchParams.get("roomId") || undefined;
  const ministerio = searchParams.get("ministerio") || undefined;
  const status = (searchParams.get("status") as "CONFIRMADA" | "CANCELADA" | null) || undefined;
  const tipo = (searchParams.get("tipo") as "unica" | "recorrente" | null) || undefined;
  const date = searchParams.get("data") || undefined;

  const reservas = listarReservas({ roomId, ministerio, status, tipo, date });

  return NextResponse.json({
    role: session.user.role,
    reservas: reservas.map(serializarReserva),
  });
}
