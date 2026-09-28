"use client";

import { useEffect, useState, useCallback } from "react";
import type { RoomDTO, ReservationDTO } from "@/types";

function formatarDataBR(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

interface Props {
  rooms: RoomDTO[];
  podeEditar: boolean;
}

export default function RoomList({ rooms, podeEditar }: Props) {
  const [roomId, setRoomId] = useState(rooms[0]?.id ?? "");
  const [reservas, setReservas] = useState<ReservationDTO[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // filtros
  const [data, setData] = useState("");
  const [ministerio, setMinisterio] = useState("");
  const [status, setStatus] = useState("");
  const [tipo, setTipo] = useState("");

  const [confirmando, setConfirmando] = useState<{ id: string; tipo: "ocorrencia" | "serie" } | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState({ date: "", startTime: "", endTime: "", finalidade: "" });

  const carregar = useCallback(() => {
    if (!roomId) return;
    setCarregando(true);
    setErro(null);
    const url = new URL("/api/reservations", window.location.origin);
    url.searchParams.set("roomId", roomId);
    if (data) url.searchParams.set("data", data);
    if (ministerio) url.searchParams.set("ministerio", ministerio);
    if (status) url.searchParams.set("status", status);
    if (tipo) url.searchParams.set("tipo", tipo);

    fetch(url.toString())
      .then(async (r) => {
        if (!r.ok) throw new Error("Erro ao carregar reservas.");
        return r.json();
      })
      .then((d) => setReservas(d.reservas ?? []))
      .catch(() => setErro("Não foi possível carregar as reservas."))
      .finally(() => setCarregando(false));
  }, [roomId, data, ministerio, status, tipo]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carrega a lista ao mudar sala/filtros
    carregar();
  }, [carregar]);

  async function cancelar(id: string, tipoCancelamento: "ocorrencia" | "serie") {
    const resp = await fetch(`/api/reservations/id/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: tipoCancelamento === "ocorrencia" ? "cancelar_ocorrencia" : "cancelar_serie" }),
    });
    if (resp.ok) {
      carregar();
    } else {
      const d = await resp.json();
      setErro(d.error || "Não foi possível cancelar.");
    }
    setConfirmando(null);
  }

  function iniciarEdicao(r: ReservationDTO) {
    setEditandoId(r.id);
    setForm({ date: r.date, startTime: r.startTime, endTime: r.endTime, finalidade: r.finalidade || "" });
  }

  async function salvarEdicao(id: string) {
    const resp = await fetch(`/api/reservations/id/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "editar", ...form }),
    });
    if (resp.ok) {
      setEditandoId(null);
      carregar();
    } else {
      const d = await resp.json();
      setErro(d.error || "Não foi possível salvar.");
    }
  }

  const roomAtual = rooms.find((r) => r.id === roomId);

  return (
    <div className="flex flex-col gap-4 md:flex-row">
      <aside className="w-full shrink-0 md:w-48">
        <h2 className="mb-2 text-sm font-semibold text-slate-500">Salas</h2>
        <ul className="space-y-1">
          {rooms.map((r) => (
            <li key={r.id}>
              <button
                onClick={() => setRoomId(r.id)}
                className={`w-full rounded px-3 py-2 text-left text-sm ${
                  r.id === roomId ? "bg-indigo-600 text-white" : "hover:bg-slate-100"
                }`}
              >
                {r.name}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="flex-1">
        <h2 className="mb-3 text-lg font-semibold">{roomAtual?.name}</h2>

        <div className="mb-4 flex flex-wrap gap-2 text-sm">
          <input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            className="rounded border border-slate-300 px-2 py-1"
          />
          <input
            placeholder="Filtrar por ministério"
            value={ministerio}
            onChange={(e) => setMinisterio(e.target.value)}
            className="rounded border border-slate-300 px-2 py-1"
          />
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded border border-slate-300 px-2 py-1">
            <option value="">Todos os status</option>
            <option value="CONFIRMADA">Confirmada</option>
            <option value="CANCELADA">Cancelada</option>
          </select>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="rounded border border-slate-300 px-2 py-1">
            <option value="">Únicas e recorrentes</option>
            <option value="unica">Somente únicas</option>
            <option value="recorrente">Somente recorrentes</option>
          </select>
          {(data || ministerio || status || tipo) && (
            <button
              onClick={() => {
                setData("");
                setMinisterio("");
                setStatus("");
                setTipo("");
              }}
              className="rounded border border-slate-300 px-2 py-1 text-slate-500"
            >
              Limpar filtros
            </button>
          )}
        </div>

        {erro && <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
        {carregando && <p className="text-sm text-slate-400">Carregando…</p>}
        {!carregando && reservas.length === 0 && <p className="text-sm text-slate-400">Nenhuma reserva encontrada.</p>}

        <ul className="space-y-3">
          {reservas.map((r) => (
            <li key={r.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">
                  {formatarDataBR(r.date)} — {r.startTime} às {r.endTime}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    r.status === "CANCELADA" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                  }`}
                >
                  {r.status === "CANCELADA" ? "Cancelada" : "Confirmada"}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-600">{r.nomeResponsavel}</p>
              <p className="text-sm text-slate-600">{r.ministerio}</p>
              {r.finalidade && <p className="text-sm text-slate-500">Finalidade: {r.finalidade}</p>}
              <p className="mt-1 text-xs text-indigo-600">{r.recorrente ? "Reserva recorrente" : "Reserva única"}</p>
              <p className="text-xs text-slate-400">Código: {r.code}</p>

              {podeEditar && r.status !== "CANCELADA" && editandoId !== r.id && (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => iniciarEdicao(r)}
                    className="rounded border border-slate-300 px-3 py-1 text-xs hover:bg-slate-50"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => setConfirmando({ id: r.id, tipo: "ocorrencia" })}
                    className="rounded border border-red-300 px-3 py-1 text-xs text-red-700 hover:bg-red-50"
                  >
                    {r.recorrente ? "Cancelar esta ocorrência" : "Cancelar"}
                  </button>
                  {r.recorrente && (
                    <button
                      onClick={() => setConfirmando({ id: r.id, tipo: "serie" })}
                      className="rounded border border-red-300 px-3 py-1 text-xs text-red-700 hover:bg-red-50"
                    >
                      Cancelar esta e as próximas
                    </button>
                  )}
                </div>
              )}

              {editandoId === r.id && (
                <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="date"
                      value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                      className="rounded border border-slate-300 px-2 py-1 text-sm"
                    />
                    <input
                      type="time"
                      value={form.startTime}
                      onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                      className="rounded border border-slate-300 px-2 py-1 text-sm"
                    />
                    <input
                      type="time"
                      value={form.endTime}
                      onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                      className="rounded border border-slate-300 px-2 py-1 text-sm"
                    />
                  </div>
                  <input
                    placeholder="Finalidade"
                    value={form.finalidade}
                    onChange={(e) => setForm({ ...form, finalidade: e.target.value })}
                    className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => salvarEdicao(r.id)} className="rounded bg-indigo-600 px-3 py-1 text-xs text-white">
                      Salvar
                    </button>
                    <button onClick={() => setEditandoId(null)} className="rounded border border-slate-300 px-3 py-1 text-xs">
                      Cancelar edição
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      {confirmando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-lg">
            <p className="mb-4 text-sm text-slate-700">
              Tem certeza de que deseja cancelar{" "}
              {confirmando.tipo === "serie" ? "esta e todas as próximas ocorrências" : "esta reserva"}?
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmando(null)} className="rounded border border-slate-300 px-3 py-1.5 text-sm">
                Voltar
              </button>
              <button
                onClick={() => cancelar(confirmando.id, confirmando.tipo)}
                className="rounded bg-red-600 px-3 py-1.5 text-sm text-white"
              >
                Sim, cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
