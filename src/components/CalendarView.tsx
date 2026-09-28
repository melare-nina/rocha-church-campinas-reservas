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
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => mudarMes(-1)} className="rounded border border-slate-300 px-2 py-1 text-sm hover:bg-slate-50">
            ←
          </button>
          <span className="w-40 text-center font-medium">
            {MESES[mes]} de {ano}
          </span>
          <button onClick={() => mudarMes(1)} className="rounded border border-slate-300 px-2 py-1 text-sm hover:bg-slate-50">
            →
          </button>
        </div>
        <select
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          className="rounded border border-slate-300 px-3 py-1.5 text-sm"
        >
          <option value="">Todas as salas</option>
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-500">
        {DIAS_SEMANA.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {dias.map((dia, i) => {
          if (dia === null) return <div key={i} className="min-h-24 rounded bg-slate-50" />;
          const doDia = reservasDoDia(dia);
          const ehHoje =
            dia === hoje.getDate() && mes === hoje.getMonth() && ano === hoje.getFullYear();
          return (
            <div
              key={i}
              className={`min-h-24 rounded border p-1 text-left align-top ${
                ehHoje ? "border-indigo-400 bg-indigo-50" : "border-slate-100"
              }`}
            >
              <div className="text-xs font-semibold text-slate-500">{dia}</div>
              <div className="mt-1 space-y-1">
                {doDia.slice(0, 3).map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setSelecionada(r)}
                    className="block w-full truncate rounded bg-indigo-100 px-1 py-0.5 text-left text-[11px] text-indigo-800 hover:bg-indigo-200"
                    title={`${r.roomName} · ${r.startTime}-${r.endTime}`}
                  >
                    {r.startTime} {r.roomName}
                  </button>
                ))}
                {doDia.length > 3 && (
                  <div className="text-[10px] text-slate-400">+{doDia.length - 3} mais</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {carregando && <p className="mt-2 text-xs text-slate-400">Carregando reservas…</p>}

      {selecionada && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          onClick={() => setSelecionada(null)}
        >
          <div
            className="w-full max-w-sm rounded-lg bg-white p-5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-2 text-lg font-semibold">{selecionada.roomName}</h3>
            <p className="text-sm text-slate-600">
              {selecionada.date.split("-").reverse().join("/")} — {selecionada.startTime} às {selecionada.endTime}
            </p>
            <p className="mt-2 text-sm">
              <span className="font-medium">Responsável:</span> {selecionada.nomeResponsavel}
            </p>
            <p className="text-sm">
              <span className="font-medium">Ministério:</span> {selecionada.ministerio}
            </p>
            {selecionada.finalidade && (
              <p className="text-sm">
                <span className="font-medium">Finalidade:</span> {selecionada.finalidade}
              </p>
            )}
            {selecionada.recorrente && (
              <p className="mt-1 text-xs text-indigo-600">Faz parte de uma reserva recorrente</p>
            )}
            <p className="mt-3 text-xs text-slate-400">
              Para cancelar ou alterar esta reserva, use a página &quot;Minha reserva&quot; com o código recebido na confirmação.
            </p>
            <button
              onClick={() => setSelecionada(null)}
              className="mt-4 w-full rounded bg-slate-100 px-3 py-2 text-sm hover:bg-slate-200"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
