import { NextResponse } from "next/server";
import {
  buscarReservaPorCodigo,
  findConflict,
  cancelarOcorrencia,
  cancelarSerieAPartirDe,
  atualizarReserva,
  serializarReserva,
} from "@/lib/reservations";
import { isValidTime } from "@/lib/time";

interface Params {
  params: Promise<{ code: string }>;
}

// GET /api/reservations/codigo/ABC12345 — consulta pública pelo código da reserva.
export async function GET(_request: Request, { params }: Params) {
  const { code } = await params;
  const reserva = buscarReservaPorCodigo(code);
  if (!reserva) {
    return NextResponse.json({ error: "Código de reserva não encontrado." }, { status: 404 });
  }
  return NextResponse.json({ reserva: serializarReserva(reserva) });
}

// PATCH /api/reservations/codigo/ABC12345
// body: { action: "cancelar_ocorrencia" | "cancelar_serie" | "editar", ...campos }
export async function PATCH(request: Request, { params }: Params) {
  const { code } = await params;
  const reserva = buscarReservaPorCodigo(code);
  if (!reserva) {
    return NextResponse.json({ error: "Código de reserva não encontrado." }, { status: 404 });
  }
  if (reserva.status === "CANCELADA") {
    return NextResponse.json({ error: "Esta reserva já está cancelada." }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const action = body?.action;

  if (action === "cancelar_ocorrencia") {
    cancelarOcorrencia(reserva.id);
    return NextResponse.json({ ok: true, mensagem: "Reserva cancelada com sucesso. O horário voltou a ficar disponível." });
  }

  if (action === "cancelar_serie") {
    if (!reserva.recurrence_id) {
      return NextResponse.json({ error: "Esta reserva não faz parte de uma recorrência." }, { status: 400 });
    }
    const resultado = cancelarSerieAPartirDe(reserva.recurrence_id, reserva.date);
    return NextResponse.json({
      ok: true,
      mensagem: `Esta e as próximas ocorrências foram canceladas (${resultado.count} reserva(s)).`,
    });
  }

  if (action === "editar") {
    const novaData = typeof body.date === "string" ? body.date : reserva.date;
    const novoInicio = typeof body.startTime === "string" ? body.startTime : reserva.start_time;
    const novoFim = typeof body.endTime === "string" ? body.endTime : reserva.end_time;
    const novaFinalidade = typeof body.finalidade === "string" ? body.finalidade : reserva.finalidade;
    const novoNome = typeof body.nomeResponsavel === "string" ? body.nomeResponsavel : reserva.nome_responsavel;

    if (!isValidTime(novoInicio) || !isValidTime(novoFim) || novoInicio >= novoFim) {
      return NextResponse.json({ error: "Horário inválido. Use o formato HH:mm e garanta que o término seja depois do início." }, { status: 400 });
    }

    const conflito = findConflict(reserva.room_id, novaData, novoInicio, novoFim, reserva.id);
    if (conflito) {
      return NextResponse.json(
        { error: `Já existe uma reserva conflitante nesse novo horário (${conflito.start_time} às ${conflito.end_time}).` },
        { status: 409 }
      );
    }

    const atualizada = atualizarReserva(reserva.id, {
      date: novaData,
      startTime: novoInicio,
      endTime: novoFim,
      finalidade: novaFinalidade,
      nomeResponsavel: novoNome,
    });

    return NextResponse.json({ ok: true, reserva: serializarReserva(atualizada) });
  }

  return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
}
