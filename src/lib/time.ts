/**
 * Utilidades de data e horário.
 *
 * REGRA DE OURO: datas e horários são sempre tratados como TEXTO puro
 * ("YYYY-MM-DD" e "HH:mm"), nunca convertidos para objetos `Date`/UTC.
 * Isso garante que "9h às 12h" vire exatamente 09:00–12:00, sem qualquer
 * deslocamento de fuso horário, não importa onde o servidor esteja hospedado.
 */

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove acentos
    .trim();
}

/** Converte "HH:mm" em minutos desde a meia-noite. */
export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** Garante formato HH:mm válido (00:00 a 23:59). */
export function isValidTime(hhmm: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(hhmm)) return false;
  const [h, m] = hhmm.split(":").map(Number);
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
}

/** Formata um par hora/minuto (já extraídos) como "HH:mm", sem alterar os valores. */
export function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

export function makeHHmm(hora: number, minuto: number): string {
  return `${pad2(hora)}:${pad2(minuto)}`;
}

/**
 * Extrai um intervalo de horário de um texto em português, em vários formatos:
 *   "9h às 12h", "9h as 12h", "09:00 até 12:00", "das 8h30 às 10h45",
 *   "19h às 21h", "9 às 12h", "9h-12h", "das 9 as 12"
 * Retorna exatamente os números encontrados no texto, sem nenhuma conversão
 * de fuso horário ou arredondamento. Minutos ausentes são interpretados como 00
 * (ex.: "9h" = 09:00), que é a leitura natural em português.
 */
export function parseTimeRange(rawText: string): { start: string; end: string } | null {
  const text = normalize(rawText);

  // Um "token" de horário: 1-2 dígitos de hora, opcionalmente seguidos de
  // "h" ou ":" e 2 dígitos de minuto, opcionalmente terminado em "h".
  const timeToken = String.raw`(\d{1,2})\s*(?:[h:]\s*(\d{2}))?\s*h?`;
  const connector = String.raw`\s*(?:as|ate|à|a|-|–)\s*`;

  const re = new RegExp(`${timeToken}${connector}${timeToken}`, "i");
  const match = text.match(re);
  if (!match) return null;

  const h1 = parseInt(match[1], 10);
  const m1 = match[2] ? parseInt(match[2], 10) : 0;
  const h2 = parseInt(match[3], 10);
  const m2 = match[4] ? parseInt(match[4], 10) : 0;

  if (h1 > 23 || h2 > 23 || m1 > 59 || m2 > 59) return null;

  return { start: makeHHmm(h1, m1), end: makeHHmm(h2, m2) };
}

/**
 * Verifica se dois intervalos de horário (mesma data) se sobrepõem.
 * Reservas "encostadas" (uma termina exatamente quando a outra começa)
 * NÃO são consideradas conflito.
 */
export function rangesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  const aStart = toMinutes(startA);
  const aEnd = toMinutes(endA);
  const bStart = toMinutes(startB);
  const bEnd = toMinutes(endB);
  return aStart < bEnd && bStart < aEnd;
}

export function formatDateBR(isoDate: string): string {
  // "2025-06-15" -> "15/06/2025"
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}

/** Converte "15/06/2025" ou "15/06" (assume ano atual/próximo) em "YYYY-MM-DD". */
export function parseDateBR(text: string, referenceDate: Date = new Date()): string | null {
  const t = normalize(text);
  const m = t.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  if (!m) return null;
  const dia = parseInt(m[1], 10);
  const mes = parseInt(m[2], 10);
  let ano = m[3] ? parseInt(m[3], 10) : referenceDate.getFullYear();
  if (ano < 100) ano += 2000;
  if (dia < 1 || dia > 31 || mes < 1 || mes > 12) return null;

  // Se a data (dia/mês) já passou este ano e nenhum ano foi informado, assume o próximo ano.
  if (!m[3]) {
    const candidata = new Date(ano, mes - 1, dia);
    const hoje = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
    if (candidata < hoje) ano += 1;
  }

  return `${ano}-${pad2(mes)}-${pad2(dia)}`;
}

export function todayISO(referenceDate: Date = new Date()): string {
  return `${referenceDate.getFullYear()}-${pad2(referenceDate.getMonth() + 1)}-${pad2(
    referenceDate.getDate()
  )}`;
}

export function addDaysISO(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function weekdayOfISO(isoDate: string): number {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d).getDay(); // 0=domingo ... 6=sábado
}

export const WEEKDAY_NAMES = [
  "domingo",
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sábado",
];

const WEEKDAY_ALIASES: Record<string, number> = {
  domingo: 0,
  segunda: 1,
  "segunda-feira": 1,
  terca: 2,
  "terca-feira": 2,
  quarta: 3,
  "quarta-feira": 3,
  quinta: 4,
  "quinta-feira": 4,
  sexta: 5,
  "sexta-feira": 5,
  sabado: 6,
};

/** Procura o nome de um dia da semana no texto normalizado. Retorna 0-6 ou null. */
export function findWeekday(normalizedText: string): number | null {
  for (const [alias, num] of Object.entries(WEEKDAY_ALIASES)) {
    if (normalizedText.includes(alias)) return num;
  }
  return null;
}

/** Compara duas datas ISO. */
export function isBeforeOrEqualISO(a: string, b: string): boolean {
  return a <= b;
}
