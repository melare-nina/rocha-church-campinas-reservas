import { NextResponse } from "next/server";
import { listarSalas, serializarSala } from "@/lib/reservations";

export async function GET() {
  const rooms = listarSalas().map(serializarSala);
  return NextResponse.json({ rooms });
}
