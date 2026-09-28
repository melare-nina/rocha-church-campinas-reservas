import { NextResponse } from "next/server";
import { listarReservas, serializarReserva } from "@/lib/reservations";

// GET /api/calendar?month=YYYY-MM&roomId=xxx
// Retorna as reservas confirmadas do mês, para exibir na aba Calendário (pública).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");
  const roomId = searchParams.get("roomId") || undefined;

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "Parâmetro 'month' inválido, use YYYY-MM." }, { status: 400 });
  }

  const reservas = listarReservas({ month, roomId, status: "CONFIRMADA" });

  return NextResponse.json({ reservas: reservas.map(serializarReserva) });
}
