import { db, novoId } from "./db";
import { generateReservationCode } from "./codes";
import { rangesOverlap, addDaysISO } from "./time";
import type { ParsedRecurrence } from "./parser";

export interface RoomRow {
  id: string;
  name: string;
  slug: string;
  room_order: number;
}

export interface ReservationRow {
  id: string;
  code: string;
  room_id: string;
  date: string;
  start_time: string;
  end_time: string;
  nome_responsavel: string;
  ministerio: string;
  finalidade: string | null;
  status: "CONFIRMADA" | "CANCELADA";
  recurrence_id: string | null;
  created_at: string;
  cancelled_at: string | null;
}

export interface ReservationWithRoom extends ReservationRow {
  room_name: string;
}

export interface NovaReservaInput {
  roomId: string;
  date: string;
  startTime: string;
  endTime: string;
  nomeResponsavel: string;
  ministerio: string;
  finalidade?: string | null;
}

export function listarSalas(): RoomRow[] {
  return db.prepare("SELECT * FROM rooms ORDER BY room_order ASC").all() as RoomRow[];
}

/** Retorna a reserva confirmada que conflita com o intervalo informado, se houver. */
export function findConflict(
  roomId: string,
  date: string,
  startTime: string,
  endTime: string,
  excludeReservationId?: string
): ReservationRow | null {
  const candidatas = db
    .prepare(
      `SELECT * FROM reservations WHERE room_id = ? AND date = ? AND status = 'CONFIRMADA'
       ${excludeReservationId ? "AND id != ?" : ""}`
    )
    .all(...(excludeReservationId ? [roomId, date, excludeReservationId] : [roomId, date])) as ReservationRow[];

  return candidatas.find((r) => rangesOverlap(startTime, endTime, r.start_time, r.end_time)) ?? null;
}

/** Sugere até `limite` horários livres na sala, nos próximos `dias` dias, com a mesma duração pedida. */
export function sugerirHorariosLivres(
  roomId: string,
  duracaoMinutos: number,
  dataReferencia: string,
  dias = 14,
  limite = 5
) {
  const HORA_ABERTURA = 7 * 60;
  const HORA_FECHAMENTO = 22 * 60;
  const PASSO = 30;

  const sugestoes: { date: string; startTime: string; endTime: string }[] = [];

  for (let d = 0; d < dias && sugestoes.length < limite; d++) {
    const data = addDaysISO(dataReferencia, d);
    const reservasDoDia = db
      .prepare("SELECT * FROM reservations WHERE room_id = ? AND date = ? AND status = 'CONFIRMADA'")
      .all(roomId, data) as ReservationRow[];

    for (let inicio = HORA_ABERTURA; inicio + duracaoMinutos <= HORA_FECHAMENTO; inicio += PASSO) {
      const fim = inicio + duracaoMinutos;
      const inicioStr = `${String(Math.floor(inicio / 60)).padStart(2, "0")}:${String(inicio % 60).padStart(2, "0")}`;
      const fimStr = `${String(Math.floor(fim / 60)).padStart(2, "0")}:${String(fim % 60).padStart(2, "0")}`;

      const temConflito = reservasDoDia.some((r) => rangesOverlap(inicioStr, fimStr, r.start_time, r.end_time));
      if (!temConflito) {
        sugestoes.push({ date: data, startTime: inicioStr, endTime: fimStr });
        break;
      }
    }
  }

  return sugestoes.slice(0, limite);
}

export function criarReservaUnica(input: NovaReservaInput): ReservationWithRoom {
  const id = novoId();
  const code = generateReservationCode();
  db.prepare(
    `INSERT INTO reservations (id, code, room_id, date, start_time, end_time, nome_responsavel, ministerio, finalidade, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'CONFIRMADA')`
  ).run(
    id,
    code,
    input.roomId,
    input.date,
    input.startTime,
    input.endTime,
    input.nomeResponsavel,
    input.ministerio,
    input.finalidade || null
  );
  return buscarReservaPorId(id)!;
}

function ultimoDiaDoMes(ano: number, mesIndex0: number): number {
  return new Date(ano, mesIndex0 + 1, 0).getDate();
}

/** Gera todas as datas (ISO) de uma recorrência, entre dataInicio e dataFim, inclusive. */
export function gerarDatasRecorrencia(rec: ParsedRecurrence): string[] {
  if (!rec.dataInicio || !rec.dataFim) return [];
  const datas: string[] = [];

  if (rec.frequencia === "DIARIA") {
    let atual = rec.dataInicio;
    while (atual <= rec.dataFim) {
      datas.push(atual);
      atual = addDaysISO(atual, 1);
    }
  } else if (rec.frequencia === "SEMANAL") {
    let atual = rec.dataInicio;
    while (atual <= rec.dataFim) {
      datas.push(atual);
      atual = addDaysISO(atual, 7);
    }
  } else if (rec.frequencia === "MENSAL") {
    const [anoIni, mesIni, diaIni] = rec.dataInicio.split("-").map(Number);
    const diaAlvo = rec.diaMes ?? diaIni;
    let ano = anoIni;
    let mesIndex0 = mesIni - 1;
    for (;;) {
      const dia = Math.min(diaAlvo, ultimoDiaDoMes(ano, mesIndex0));
      const iso = `${ano}-${String(mesIndex0 + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
      if (iso > rec.dataFim) break;
      if (iso >= rec.dataInicio) datas.push(iso);
      mesIndex0 += 1;
      if (mesIndex0 > 11) {
        mesIndex0 = 0;
        ano += 1;
      }
      if (ano > anoIni + 5) break;
    }
  }

  return datas;
}

export interface PreviewRecorrenciaResultado {
  disponiveis: string[];
  ocupadas: string[];
}

export function previewRecorrencia(
  roomId: string,
  rec: ParsedRecurrence,
  startTime: string,
  endTime: string
): PreviewRecorrenciaResultado {
  const datas = gerarDatasRecorrencia(rec);
  const disponiveis: string[] = [];
  const ocupadas: string[] = [];

  for (const data of datas) {
    const conflito = findConflict(roomId, data, startTime, endTime);
    if (conflito) ocupadas.push(data);
    else disponiveis.push(data);
  }

  return { disponiveis, ocupadas };
}

export interface ConfirmarRecorrenciaInput {
  roomId: string;
  frequencia: "DIARIA" | "SEMANAL" | "MENSAL";
  diaSemana?: number;
  diaMes?: number;
  dataInicio: string;
  dataFim: string;
  startTime: string;
  endTime: string;
  nomeResponsavel: string;
  ministerio: string;
  finalidade?: string | null;
  datas: string[];
}

export function confirmarRecorrencia(input: ConfirmarRecorrenciaInput): { reservas: ReservationWithRoom[] } {
  const recurrenceId = novoId();

  const transacao = db.transaction(() => {
    db.prepare(
      `INSERT INTO recurrences (id, frequencia, dia_semana, dia_mes, data_inicio, data_fim, hora_inicio, hora_fim, nome_responsavel, ministerio, finalidade, room_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      recurrenceId,
      input.frequencia,
      input.diaSemana ?? null,
      input.diaMes ?? null,
      input.dataInicio,
      input.dataFim,
      input.startTime,
      input.endTime,
      input.nomeResponsavel,
      input.ministerio,
      input.finalidade || null,
      input.roomId
    );

    const inserirReserva = db.prepare(
      `INSERT INTO reservations (id, code, room_id, date, start_time, end_time, nome_responsavel, ministerio, finalidade, status, recurrence_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'CONFIRMADA', ?)`
    );

    const idsGerados: string[] = [];
    for (const data of input.datas) {
      const id = novoId();
      idsGerados.push(id);
      inserirReserva.run(
        id,
        generateReservationCode(),
        input.roomId,
        data,
        input.startTime,
        input.endTime,
        input.nomeResponsavel,
        input.ministerio,
        input.finalidade || null,
        recurrenceId
      );
    }
    return idsGerados;
  });

  const ids = transacao();
  const reservas = ids.map((id) => buscarReservaPorId(id)!);
  return { reservas };
}

export function cancelarOcorrencia(reservationId: string) {
  db.prepare("UPDATE reservations SET status = 'CANCELADA', cancelled_at = datetime('now') WHERE id = ?").run(
    reservationId
  );
}

/** Cancela esta ocorrência e todas as futuras (data >= data desta reserva) da mesma série. */
export function cancelarSerieAPartirDe(recurrenceId: string, apartirDeData: string): { count: number } {
  const resultado = db
    .prepare(
      `UPDATE reservations SET status = 'CANCELADA', cancelled_at = datetime('now')
       WHERE recurrence_id = ? AND date >= ? AND status = 'CONFIRMADA'`
    )
    .run(recurrenceId, apartirDeData);
  return { count: resultado.changes };
}

export function buscarReservaPorId(id: string): ReservationWithRoom | null {
  const row = db
    .prepare(
      `SELECT r.*, rm.name as room_name FROM reservations r JOIN rooms rm ON rm.id = r.room_id WHERE r.id = ?`
    )
    .get(id) as ReservationWithRoom | undefined;
  return row ?? null;
}

export function buscarReservaPorCodigo(code: string): ReservationWithRoom | null {
  const row = db
    .prepare(
      `SELECT r.*, rm.name as room_name FROM reservations r JOIN rooms rm ON rm.id = r.room_id WHERE r.code = ?`
    )
    .get(code.toUpperCase()) as ReservationWithRoom | undefined;
  return row ?? null;
}

export function atualizarReserva(
  id: string,
  campos: { date?: string; startTime?: string; endTime?: string; finalidade?: string | null; nomeResponsavel?: string; ministerio?: string }
): ReservationWithRoom {
  const atual = buscarReservaPorId(id)!;
  db.prepare(
    `UPDATE reservations SET date = ?, start_time = ?, end_time = ?, finalidade = ?, nome_responsavel = ?, ministerio = ? WHERE id = ?`
  ).run(
    campos.date ?? atual.date,
    campos.startTime ?? atual.start_time,
    campos.endTime ?? atual.end_time,
    campos.finalidade !== undefined ? campos.finalidade : atual.finalidade,
    campos.nomeResponsavel ?? atual.nome_responsavel,
    campos.ministerio ?? atual.ministerio,
    id
  );
  return buscarReservaPorId(id)!;
}

export interface FiltrosReservas {
  roomId?: string;
  ministerio?: string;
  status?: "CONFIRMADA" | "CANCELADA";
  tipo?: "unica" | "recorrente";
  date?: string;
  month?: string; // YYYY-MM
}

export function serializarReserva(r: ReservationWithRoom) {
  return {
    id: r.id,
    code: r.code,
    roomId: r.room_id,
    roomName: r.room_name,
    date: r.date,
    startTime: r.start_time,
    endTime: r.end_time,
    nomeResponsavel: r.nome_responsavel,
    ministerio: r.ministerio,
    finalidade: r.finalidade,
    status: r.status,
    recorrente: !!r.recurrence_id,
    recurrenceId: r.recurrence_id,
  };
}

export function serializarSala(r: RoomRow) {
  return { id: r.id, name: r.name, slug: r.slug, order: r.room_order };
}

export function listarReservas(filtros: FiltrosReservas): ReservationWithRoom[] {
  const condicoes: string[] = [];
  const parametros: (string | number)[] = [];

  if (filtros.roomId) {
    condicoes.push("r.room_id = ?");
    parametros.push(filtros.roomId);
  }
  if (filtros.ministerio) {
    condicoes.push("r.ministerio LIKE ?");
    parametros.push(`%${filtros.ministerio}%`);
  }
  if (filtros.status) {
    condicoes.push("r.status = ?");
    parametros.push(filtros.status);
  }
  if (filtros.tipo === "unica") {
    condicoes.push("r.recurrence_id IS NULL");
  } else if (filtros.tipo === "recorrente") {
    condicoes.push("r.recurrence_id IS NOT NULL");
  }
  if (filtros.date) {
    condicoes.push("r.date = ?");
    parametros.push(filtros.date);
  }
  if (filtros.month) {
    condicoes.push("r.date LIKE ?");
    parametros.push(`${filtros.month}%`);
  }

  const where = condicoes.length > 0 ? `WHERE ${condicoes.join(" AND ")}` : "";
  const sql = `SELECT r.*, rm.name as room_name FROM reservations r JOIN rooms rm ON rm.id = r.room_id ${where} ORDER BY r.date ASC, r.start_time ASC`;

  return db.prepare(sql).all(...parametros) as ReservationWithRoom[];
}
