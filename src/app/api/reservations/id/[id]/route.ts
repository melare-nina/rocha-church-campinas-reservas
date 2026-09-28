import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  buscarReservaPorId,
  findConflict,
  cancelarOcorrencia,
  cancelarSerieAPartirDe,
  atualizarReserva,
} from "@/lib/reservations";
import { isValidTime } from "@/lib/time";

interface Params {
  params: Promise<{ id: string }>;
}

// PATCH /api/reservations/id/<id>
// body: { action: "cancelar_ocorrencia" | "cancelar_serie" | "editar", ...campos }
// Exige login como Administração (Líder tem acesso somente de consulta).
export async function PATCH(request: Request, { params }: Params) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Apenas a Administração pode editar ou cancelar reservas." }, { status: 403 });
  }

  const { id } = await params;
  const reserva = buscarReservaPorId(id);
  if (!reserva) {
    return NextResponse.json({ error: "Reserva não encontrada." }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const action = body?.action;

  if (action === "cancelar_ocorrencia") {
    cancelarOcorrencia(reserva.id);
    return NextResponse.json({ ok: true });
  }

  if (action === "cancelar_serie") {
    if (!reserva.recurrence_id) {
      return NextResponse.json({ error: "Esta reserva não faz parte de uma recorrência." }, { status: 400 });
    }
    const resultado = cancelarSerieAPartirDe(reserva.recurrence_id, reserva.date);
    return NextResponse.json({ ok: true, canceladas: resultado.count });
  }

  if (action === "editar") {
    const novaData = typeof body.date === "string" ? body.date : reserva.date;
    const novoInicio = typeof body.startTime === "string" ? body.startTime : reserva.start_time;
    const novoFim = typeof body.endTime === "string" ? body.endTime : reserva.end_time;

    if (!isValidTime(novoInicio) || !isValidTime(novoFim) || novoInicio >= novoFim) {
      return NextResponse.json({ error: "Horário inválido." }, { status: 400 });
    }

    const conflito = findConflict(reserva.room_id, novaData, novoInicio, novoFim, reserva.id);
    if (conflito) {
      return NextResponse.json({ error: "Já existe uma reserva conflitante nesse novo horário." }, { status: 409 });
    }

    const atualizada = atualizarReserva(reserva.id, {
      date: novaData,
      startTime: novoInicio,
      endTime: novoFim,
      finalidade: typeof body.finalidade === "string" ? body.finalidade : reserva.finalidade,
      nomeResponsavel: typeof body.nomeResponsavel === "string" ? body.nomeResponsavel : reserva.nome_responsavel,
      ministerio: typeof body.ministerio === "string" ? body.ministerio : reserva.ministerio,
    });

    return NextResponse.json({ ok: true, reserva: atualizada });
  }

  return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
}
