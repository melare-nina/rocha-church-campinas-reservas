import { customAlphabet } from "nanoid";

// Alfabeto sem caracteres ambíguos (sem 0/O, 1/I/L) para facilitar leitura/digitação.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

const generate = customAlphabet(ALPHABET, 8);

/** Gera um código público de reserva, ex.: "K7M2P9XQ". */
export function generateReservationCode(): string {
  return generate();
}
