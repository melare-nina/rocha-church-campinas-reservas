"use client";

import { useEffect, useMemo, useState } from "react";
import type { RoomDTO, ReservationDTO } from "@/types";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function pad2(n: number) {
  return n.toString().padStart(2, "0");
}

export default function CalendarView() {
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth()); // 0-11
  const [rooms, setRooms] = useState<RoomDTO[]>([]);
  const [roomId, setRoomId] = useState<string>("");
  const [reservas, setReservas] = useState<ReservationDTO[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [selecionada, setSelecionada] = useState<ReservationDTO | null>(null);

  useEffect(() => {
    fetch("/api/rooms")
      .then((r) => r.json())
      .then((d) => setRooms(d.rooms ?? []));
  }, []);

  useEffect(() => {
    const mesStr = `${ano}-${pad2(mes + 1)}`;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- indicador de carregamento para a busca abaixo
    setCarregando(true);
    const url = new URL("/api/calendar", window.location.origin);
    url.searchParams.set("month", mesStr);
    if (roomId) url.searchParams.set("roomId", roomId);
    fetch(url.toString())
      .then((r) => r.json())
      .then((d) => setReservas(d.reservas ?? []))
      .finally(() => setCarregando(false));
  }, [ano, mes, roomId]);

  const dias = useMemo(() => {
    const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
    const totalDias = new Date(ano, mes + 1, 0).getDate();
    const celulas: (number | null)[] = [];
    for (let i = 0; i < primeiroDiaSemana; i++) celulas.push(null);
    for (let d = 1; d <= totalDias; d++) celulas.push(d);
    return celulas;
  }, [ano, mes]);

  function reservasDoDia(dia: number) {
    const iso = `${ano}-${pad2(mes + 1)}-${pad2(dia)}`;
    return reservas.filter((r) => r.date === iso);
  }

  function mudarMes(delta: number) {
    let novoMes = mes + delta;
    let novoAno = ano;
    if (novoMes < 0) {
      novoMes = 11;
      novoAno -= 1;
    } else if (novoMes > 11) {
      novoMes = 0;
      novoAno += 1;
    }
    setMes(novoMes);
    setAno(novoAno);
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-3 shadow-sm sm:p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => mudarMes(-1)}
            className="rounded border border-border px-2 py-1 text-sm text-foreground hover:bg-surface-2"
          >
            ←
          </button>
          <span className="w-32 text-center text-sm font-medium text-foreground sm:w-40 sm:text-base">
            {MESES[mes]} de {ano}
          </span>
          <button
            onClick={() => mudarMes(1)}
            className="rounded border border-border px-2 py-1 text-sm text-foreground hover:bg-surface-2"
          >
            →
          </button>
        </div>
        <select
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          className="rounded border border-border bg-background px-3 py-1.5 text-sm text-foreground"
        >
          <option value="">Todas as salas</option>
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] font-medium text-muted sm:gap-1 sm:text-xs">
        {DIAS_SEMANA.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
        {dias.map((dia, i) => {
          if (dia === null) return <div key={i} className="min-h-14 rounded bg-background sm:min-h-24" />;
          const doDia = reservasDoDia(dia);
          const ehHoje =
            dia === hoje.getDate() && mes === hoje.getMonth() && ano === hoje.getFullYear();
          return (
            <div
              key={i}
              className={`min-h-14 rounded border p-0.5 text-left align-top sm:min-h-24 sm:p-1 ${
                ehHoje ? "border-accent bg-accent/10" : "border-border"
              }`}
            >
              <div className="text-[10px] font-semibold text-muted sm:text-xs">{dia}</div>
              <div className="mt-1 space-y-1">
                {doDia.slice(0, 3).map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setSelecionada(r)}
                    className="block w-full truncate rounded bg-surface-2 px-1 py-0.5 text-left text-[9px] text-accent-light hover:bg-accent/20 sm:text-[11px]"
                    title={`${r.roomName} · ${r.startTime}-${r.endTime}`}
                  >
                    {r.startTime} {r.roomName}
                  </button>
                ))}
                {doDia.length > 3 && (
                  <div className="text-[9px] text-muted sm:text-[10px]">+{doDia.length - 3} mais</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {carregando && <p className="mt-2 text-xs text-muted">Carregando reservas…</p>}

      {selecionada && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setSelecionada(null)}
        >
          <div
            className="w-full max-w-sm rounded-lg border border-border bg-surface p-5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-2 text-lg font-semibold text-foreground">{selecionada.roomName}</h3>
            <p className="text-sm text-muted">
              {selecionada.date.split("-").reverse().join("/")} — {selecionada.startTime} às {selecionada.endTime}
            </p>
            <p className="mt-2 text-sm text-foreground">
              <span className="font-medium">Responsável:</span> {selecionada.nomeResponsavel}
            </p>
            <p className="text-sm text-foreground">
              <span className="font-medium">Ministério:</span> {selecionada.ministerio}
            </p>
            {selecionada.finalidade && (
              <p className="text-sm text-foreground">
                <span className="font-medium">Finalidade:</span> {selecionada.finalidade}
              </p>
            )}
            {selecionada.recorrente && (
              <p className="mt-1 text-xs text-accent-light">Faz parte de uma reserva recorrente</p>
            )}
            <p className="mt-3 text-xs text-muted">
              Para cancelar ou alterar esta reserva, use a página &quot;Minha reserva&quot; com o código recebido na confirmação.
            </p>
            <button
              onClick={() => setSelecionada(null)}
              className="mt-4 w-full rounded bg-surface-2 px-3 py-2 text-sm text-foreground hover:bg-border"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
