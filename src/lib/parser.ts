import {
  normalize,
  parseTimeRange,
  parseDateBR,
  todayISO,
  addDaysISO,
  weekdayOfISO,
  findWeekday,
} from "./time";

export interface RoomLite {
  id: string;
  name: string;
  slug: string;
}

export interface ParsedRecurrence {
  frequencia: "DIARIA" | "SEMANAL" | "MENSAL";
  diaSemana?: number; // 0-6, quando SEMANAL
  diaMes?: number; // 1-31, quando MENSAL
  dataInicio?: string; // ISO
  dataFim?: string; // ISO
}

export interface ParsedRequest {
  room: RoomLite | null;
  date: string | null; // ISO — usado quando NÃO é recorrente
  timeRange: { start: string; end: string } | null;
  recurrence: ParsedRecurrence | null;
  ambiguousRoom: RoomLite[]; // preenchido se mais de uma sala combinar com o texto
}

// Aliases usados para reconhecer cada sala em linguagem natural livre.
const ROOM_ALIASES: Record<string, string[]> = {
  templo: ["templo"],
  "sala-recepcao": ["sala de recepcao", "sala recepcao", "recepcao"],
  "sala-intercessao": ["sala de intercessao", "sala intercessao", "intercessao"],
  "sala-kids-1": ["sala kids 1", "kids 1", "kids1"],
  "sala-kids-2": ["sala kids 2", "kids 2", "kids2"],
  "sala-kids-3": ["sala kids 3", "kids 3", "kids3"],
};

export function findRoomsInText(text: string, rooms: RoomLite[]): RoomLite[] {
  const normalized = normalize(text);
  const found: RoomLite[] = [];
  for (const room of rooms) {
    const aliases = ROOM_ALIASES[room.slug] ?? [normalize(room.name)];
    if (aliases.some((alias) => normalized.includes(alias))) {
      found.push(room);
    }
  }
  return found;
}

function detectRecurrence(normalized: string, referenceDate: Date): ParsedRecurrence | null {
  const isDaily = /\b(diariamente|todos os dias|todo dia(?!\s*\d))/.test(normalized);
  const isMonthly = /\b(mensalmente|todo mes|todos os meses|uma vez por mes)\b/.test(normalized);
  const hasEvery = /\b(todos os|todas as|toda|todo|cada)\b/.test(normalized);
  const weekday = findWeekday(normalized);

  // "até dd/mm/aaaa" -> data final da recorrência
  let dataFim: string | undefined;
  const ateMatch = normalized.match(/ate\s+(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/);
  if (ateMatch) {
    const parsed = parseDateBR(ateMatch[1], referenceDate);
    if (parsed) dataFim = parsed;
  }

  if (isDaily) {
    return { frequencia: "DIARIA", dataInicio: todayISO(referenceDate), dataFim };
  }

  if (weekday !== null && hasEvery) {
    // Próxima ocorrência desse dia da semana, a partir de hoje (incluindo hoje).
    const hojeISO = todayISO(referenceDate);
    const diff = (weekday - weekdayOfISO(hojeISO) + 7) % 7;
    const dataInicio = addDaysISO(hojeISO, diff);
    return { frequencia: "SEMANAL", diaSemana: weekday, dataInicio, dataFim };
  }

  if (isMonthly) {
    return { frequencia: "MENSAL", dataInicio: todayISO(referenceDate), dataFim };
  }

  return null;
}

function detectSingleDate(normalized: string, referenceDate: Date): string | null {
  if (/\bhoje\b/.test(normalized)) return todayISO(referenceDate);
  if (/\bamanha\b/.test(normalized)) return addDaysISO(todayISO(referenceDate), 1);

  const dataMatch = normalized.match(/\d{1,2}\/\d{1,2}(?:\/\d{2,4})?/);
  if (dataMatch) {
    return parseDateBR(dataMatch[0], referenceDate);
  }

  // Dia da semana citado SEM palavra de recorrência ("sábado", "na segunda")
  // é interpretado como a próxima ocorrência única daquele dia.
  const weekday = findWeekday(normalized);
  const hasEvery = /\b(todos os|todas as|toda|todo|cada)\b/.test(normalized);
  if (weekday !== null && !hasEvery) {
    const hojeISO = todayISO(referenceDate);
    const diff = (weekday - weekdayOfISO(hojeISO) + 7) % 7;
    return addDaysISO(hojeISO, diff);
  }

  return null;
}

export function parseReservationMessage(
  text: string,
  rooms: RoomLite[],
  referenceDate: Date = new Date()
): ParsedRequest {
  const normalized = normalize(text);
  const matchedRooms = findRoomsInText(text, rooms);
  const timeRange = parseTimeRange(text);
  const recurrence = detectRecurrence(normalized, referenceDate);
  const date = recurrence ? null : detectSingleDate(normalized, referenceDate);

  return {
    room: matchedRooms.length === 1 ? matchedRooms[0] : null,
    ambiguousRoom: matchedRooms.length > 1 ? matchedRooms : [],
    date,
    timeRange,
    recurrence,
  };
}
