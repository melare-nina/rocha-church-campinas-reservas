export interface RoomDTO {
  id: string;
  name: string;
  slug: string;
  order: number;
}

export interface ReservationDTO {
  id: string;
  code: string;
  roomId: string;
  roomName: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  nomeResponsavel: string;
  ministerio: string;
  finalidade?: string | null;
  status?: "CONFIRMADA" | "CANCELADA";
  recorrente: boolean;
  recurrenceId?: string | null;
}
