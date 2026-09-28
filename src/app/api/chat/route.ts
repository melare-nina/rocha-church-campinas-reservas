import { NextResponse } from "next/server";
import { listarSalas } from "@/lib/reservations";
import { processarMensagem, ESTADO_INICIAL, type ChatState } from "@/lib/chatEngine";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.message !== "string") {
    return NextResponse.json({ error: "Mensagem inválida." }, { status: 400 });
  }

  const estado: ChatState = body.state ?? ESTADO_INICIAL;
  const rooms = listarSalas();

  try {
    const resultado = await processarMensagem(estado, body.message, rooms);
    return NextResponse.json(resultado);
  } catch (err) {
    console.error("Erro no chat de reservas:", err);
    return NextResponse.json(
      {
        state: ESTADO_INICIAL,
        reply: "Ocorreu um erro ao processar sua mensagem. Vamos começar de novo: qual sala, data e horário você deseja reservar?",
      },
      { status: 200 }
    );
  }
}
