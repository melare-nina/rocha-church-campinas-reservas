import { parseReservationMessage, type RoomLite } from "./parser";
import { normalize, formatDateBR, WEEKDAY_NAMES } from "./time";
import {
  findConflict,
  sugerirHorariosLivres,
  criarReservaUnica,
  previewRecorrencia,
  confirmarRecorrencia,
} from "./reservations";

export type ChatStep =
  | "coletando"
  | "confirmando_horario"
  | "confirmando_recorrencia_conflito"
  | "coletando_nome"
  | "coletando_finalidade"
  | "concluido";

export interface ChatState {
  step: ChatStep;
  roomId?: string;
  roomName?: string;
  isRecorrente?: boolean;
  date?: string;
  frequencia?: "DIARIA" | "SEMANAL" | "MENSAL";
  diaSemana?: number;
  diaMes?: number;
  dataInicio?: string;
  dataFim?: string;
  startTime?: string;
  endTime?: string;
  nomeResponsavel?: string;
  ministerio?: string;
  finalidade?: string;
  disponiveis?: string[];
  ocupadas?: string[];
  ultimoCodigo?: string;
}

export interface ChatTurnResult {
  state: ChatState;
  reply: string;
}

export const ESTADO_INICIAL: ChatState = { step: "coletando" };

const AFIRMATIVO = /^(s|sim|isso|correto|certo|ok|confirmo|confirmar|exato|perfeito|pode)/;
const NEGATIVO = /^(n|nao|errado|mudar|corrigir|cancelar)/;

function listaSalas(rooms: RoomLite[]): string {
  return rooms.map((r) => r.name).join(", ");
}

function rotuloFrequencia(state: ChatState): string {
  if (state.frequencia === "DIARIA") return "todos os dias";
  if (state.frequencia === "SEMANAL" && state.diaSemana !== undefined)
    return `toda(o) ${WEEKDAY_NAMES[state.diaSemana]}`;
  if (state.frequencia === "MENSAL") return `mensalmente (dia ${state.diaMes ?? "?"})`;
  return "recorrente";
}

function resumoConfirmacao(state: ChatState): string {
  if (state.isRecorrente) {
    return (
      `Confirmando: reservar **${state.roomName}**, ${rotuloFrequencia(state)}, ` +
      `das ${state.startTime} às ${state.endTime}, de ${formatDateBR(state.dataInicio!)} até ${formatDateBR(
        state.dataFim!
      )}. Está correto? (sim/não)`
    );
  }
  return (
    `Confirmando: reservar **${state.roomName}** no dia ${formatDateBR(state.date!)}, ` +
    `das ${state.startTime} às ${state.endTime}. Está correto? (sim/não)`
  );
}

function faltaAlgumDadoBasico(state: ChatState): string | null {
  if (!state.roomId) return null; // tratado separadamente
  if (state.isRecorrente) {
    if (!state.dataFim) return "ate_quando";
    if (!state.startTime || !state.endTime) return "horario";
  } else {
    if (!state.date) return "data";
    if (!state.startTime || !state.endTime) return "horario";
  }
  return null;
}

function perguntaProximoCampo(campo: string): string {
  switch (campo) {
    case "ate_quando":
      return "Até quando essas reservas devem se repetir? (ex.: até 30/11/2025)";
    case "horario":
      return "Qual o horário? (ex.: das 9h às 12h)";
    case "data":
      return "Para qual data? (ex.: 15/06 ou amanhã)";
    default:
      return "Pode me dar mais detalhes da reserva?";
  }
}

function aplicarParsing(state: ChatState, texto: string, rooms: RoomLite[]): ChatState {
  const parsed = parseReservationMessage(texto, rooms);
  const novo: ChatState = { ...state };

  if (parsed.room) {
    novo.roomId = parsed.room.id;
    novo.roomName = parsed.room.name;
  }
  if (parsed.recurrence) {
    novo.isRecorrente = true;
    novo.frequencia = parsed.recurrence.frequencia;
    if (parsed.recurrence.diaSemana !== undefined) novo.diaSemana = parsed.recurrence.diaSemana;
    if (parsed.recurrence.diaMes !== undefined) novo.diaMes = parsed.recurrence.diaMes;
    if (parsed.recurrence.dataInicio) novo.dataInicio = parsed.recurrence.dataInicio;
    if (parsed.recurrence.dataFim) novo.dataFim = parsed.recurrence.dataFim;
  }
  if (parsed.date && !novo.isRecorrente) {
    novo.date = parsed.date;
  }
  if (parsed.timeRange) {
    novo.startTime = parsed.timeRange.start;
    novo.endTime = parsed.timeRange.end;
  }
  return novo;
}

async function iniciarCriacao(state: ChatState): Promise<ChatTurnResult> {
  if (state.isRecorrente) {
    const preview = await previewRecorrencia(
      state.roomId!,
      {
        frequencia: state.frequencia!,
        diaSemana: state.diaSemana,
        diaMes: state.diaMes,
        dataInicio: state.dataInicio!,
        dataFim: state.dataFim!,
      },
      state.startTime!,
      state.endTime!
    );

    const novoState: ChatState = { ...state, disponiveis: preview.disponiveis, ocupadas: preview.ocupadas };

    if (preview.disponiveis.length === 0) {
      return {
        state: ESTADO_INICIAL,
        reply:
          `Verifiquei a recorrência e todas as datas já estão ocupadas (${preview.ocupadas
            .map(formatDateBR)
            .join(", ")}). A reserva não foi criada. Quer tentar outro horário ou sala?`,
      };
    }

    if (preview.ocupadas.length > 0) {
      novoState.step = "confirmando_recorrencia_conflito";
      return {
        state: novoState,
        reply:
          `A recorrência foi verificada. Existem conflitos nas seguintes datas: ${preview.ocupadas
            .map(formatDateBR)
            .join(", ")}. ` +
          `As demais ${preview.disponiveis.length} datas estão disponíveis. Deseja reservar as datas disponíveis? (sim/não)`,
      };
    }

    novoState.step = "coletando_nome";
    return {
      state: novoState,
      reply:
        `Nenhum conflito encontrado! Todas as ${preview.disponiveis.length} datas estão disponíveis. ` +
        `Para concluir a reserva, informe seu nome completo e o ministério responsável (ex.: João da Silva, Ministério Infantil).`,
    };
  }

  // Reserva única
  const conflito = await findConflict(state.roomId!, state.date!, state.startTime!, state.endTime!);
  if (conflito) {
    const duracao =
      (parseInt(state.endTime!.split(":")[0]) * 60 + parseInt(state.endTime!.split(":")[1])) -
      (parseInt(state.startTime!.split(":")[0]) * 60 + parseInt(state.startTime!.split(":")[1]));
    const sugestoes = await sugerirHorariosLivres(state.roomId!, duracao, state.date!);
    const listaSugestoes = sugestoes
      .map((s) => `${formatDateBR(s.date)} das ${s.startTime} às ${s.endTime}`)
      .join(" | ");

    return {
      state: { step: "coletando", roomId: state.roomId, roomName: state.roomName },
      reply:
        `Que pena! A sala **${state.roomName}** já está reservada no dia ${formatDateBR(state.date!)} ` +
        `das ${conflito.start_time} às ${conflito.end_time}. ` +
        (listaSugestoes
          ? `Horários livres próximos: ${listaSugestoes}. `
          : "Não encontrei horários livres nos próximos dias. ") +
        `Me diga outra data e/ou horário para essa sala.`,
    };
  }

  return {
    state: { ...state, step: "coletando_nome" },
    reply:
      `A sala **${state.roomName}** está disponível no dia ${formatDateBR(state.date!)}, das ${state.startTime} às ${state.endTime}. ` +
      `Para concluir a reserva, informe seu nome completo e o ministério responsável (ex.: João da Silva, Ministério Infantil).`,
  };
}

async function finalizarCriacao(state: ChatState): Promise<ChatTurnResult> {
  if (state.isRecorrente) {
    const datas = state.disponiveis ?? [];
    const { reservas } = await confirmarRecorrencia({
      roomId: state.roomId!,
      frequencia: state.frequencia!,
      diaSemana: state.diaSemana,
      diaMes: state.diaMes,
      dataInicio: state.dataInicio!,
      dataFim: state.dataFim!,
      startTime: state.startTime!,
      endTime: state.endTime!,
      nomeResponsavel: state.nomeResponsavel!,
      ministerio: state.ministerio!,
      finalidade: state.finalidade,
      datas,
    });

    const amostra = reservas
      .slice(0, 20)
      .map((r) => `${formatDateBR(r.date)} — código ${r.code}`)
      .join("\n");
    const resto = reservas.length > 20 ? `\n(e mais ${reservas.length - 20} datas — veja todas na aba Calendário)` : "";

    return {
      state: { step: "concluido", ultimoCodigo: reservas[0]?.code },
      reply:
        `Reserva recorrente confirmada para ${state.nomeResponsavel}, ${state.ministerio}, na ${state.roomName}, ` +
        `${rotuloFrequencia(state)}, das ${state.startTime} às ${state.endTime}.\n` +
        `Foram criadas ${reservas.length} reservas:\n${amostra}${resto}\n\n` +
        `Guarde os códigos: com eles é possível cancelar ou alterar cada data em "Minha reserva". Posso ajudar com mais alguma coisa?`,
    };
  }

  const reserva = await criarReservaUnica({
    roomId: state.roomId!,
    date: state.date!,
    startTime: state.startTime!,
    endTime: state.endTime!,
    nomeResponsavel: state.nomeResponsavel!,
    ministerio: state.ministerio!,
    finalidade: state.finalidade,
  });

  return {
    state: { step: "concluido", ultimoCodigo: reserva.code },
    reply:
      `Reserva confirmada para ${state.nomeResponsavel}, ${state.ministerio}, na ${state.roomName}, ` +
      `no dia ${formatDateBR(state.date!)}, das ${state.startTime} às ${state.endTime}.\n\n` +
      `Seu código de reserva é **${reserva.code}**. Guarde esse código: com ele você pode consultar, alterar ou cancelar sua reserva depois em "Minha reserva". Posso ajudar com mais alguma coisa?`,
  };
}

export async function processarMensagem(
  estadoAtual: ChatState,
  mensagem: string,
  rooms: RoomLite[]
): Promise<ChatTurnResult> {
  const texto = mensagem.trim();
  const normalizado = normalize(texto);
  let state = estadoAtual.step === "concluido" ? { ...ESTADO_INICIAL } : { ...estadoAtual };

  if (normalizado === "cancelar" && state.step !== "coletando") {
    return { state: ESTADO_INICIAL, reply: "Tudo bem, cancelei essa solicitação. Se quiser começar de novo, é só me dizer a sala, data e horário desejados." };
  }

  switch (state.step) {
    case "coletando": {
      state = aplicarParsing(state, texto, rooms);

      if (!state.roomId) {
        return {
          state,
          reply: `Qual sala você deseja reservar? (${listaSalas(rooms)})`,
        };
      }

      const faltando = faltaAlgumDadoBasico(state);
      if (faltando) {
        return { state, reply: perguntaProximoCampo(faltando) };
      }

      state.step = "confirmando_horario";
      return { state, reply: resumoConfirmacao(state) };
    }

    case "confirmando_horario": {
      if (AFIRMATIVO.test(normalizado)) {
        return iniciarCriacao(state);
      }
      if (NEGATIVO.test(normalizado)) {
        const reset: ChatState = { step: "coletando", roomId: state.roomId, roomName: state.roomName };
        return {
          state: reset,
          reply: "Sem problema. Me diga novamente a data e o horário corretos (ex.: das 9h às 12h).",
        };
      }
      // Talvez o usuário já tenha respondido com uma correção direta (nova data/horário).
      state = aplicarParsing(state, texto, rooms);
      return { state, reply: resumoConfirmacao(state) };
    }

    case "confirmando_recorrencia_conflito": {
      if (AFIRMATIVO.test(normalizado)) {
        return { state: { ...state, step: "coletando_nome" }, reply: "Ótimo! Para concluir a reserva, informe seu nome completo e o ministério responsável (ex.: João da Silva, Ministério Infantil)." };
      }
      if (NEGATIVO.test(normalizado)) {
        return { state: ESTADO_INICIAL, reply: "Tudo bem, a recorrência foi cancelada e nenhuma reserva foi criada." };
      }
      return {
        state,
        reply: "Não entendi. Deseja reservar as datas disponíveis mesmo com os conflitos indicados? (sim/não)",
      };
    }

    case "coletando_nome": {
      if (!state.nomeResponsavel) {
        const partes = texto.split(",");
        state.nomeResponsavel = partes[0]?.trim();
        if (partes[1]?.trim()) {
          state.ministerio = partes[1].trim();
        } else {
          return { state, reply: "Qual o ministério ou departamento responsável pela reserva?" };
        }
      } else if (!state.ministerio) {
        state.ministerio = texto.trim();
      }

      state.step = "coletando_finalidade";
      return {
        state,
        reply: 'Deseja informar a finalidade da reserva? (opcional — responda "não" para pular)',
      };
    }

    case "coletando_finalidade": {
      if (!/^(n|nao|não|pular)$/i.test(normalizado)) {
        state.finalidade = texto;
      }
      return finalizarCriacao(state);
    }

    default:
      return { state: ESTADO_INICIAL, reply: "Vamos começar de novo: qual sala, data e horário você gostaria de reservar?" };
  }
}
