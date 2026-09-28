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
        <h2 className="mb-2 text-sm font-semibold text-muted">Salas</h2>
        <ul className="flex gap-1 overflow-x-auto pb-1 md:block md:space-y-1 md:overflow-visible md:pb-0">
          {rooms.map((r) => (
            <li key={r.id} className="shrink-0 md:shrink">
              <button
                onClick={() => setRoomId(r.id)}
                className={`whitespace-nowrap rounded px-3 py-2 text-left text-sm md:w-full ${
                  r.id === roomId ? "bg-accent hover:bg-accent-hover text-white" : "text-foreground hover:bg-surface-2"
                }`}
              >
                {r.name}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="flex-1">
        <h2 className="mb-3 text-lg font-semibold text-foreground">{roomAtual?.name}</h2>

        <div className="mb-4 flex flex-wrap gap-2 text-sm">
          <input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            className="rounded border border-border bg-surface px-2 py-1 text-foreground"
          />
          <input
            placeholder="Filtrar por ministério"
            value={ministerio}
            onChange={(e) => setMinisterio(e.target.value)}
            className="rounded border border-border bg-surface px-2 py-1 text-foreground placeholder:text-muted"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded border border-border bg-surface px-2 py-1 text-foreground"
          >
            <option value="">Todos os status</option>
            <option value="CONFIRMADA">Confirmada</option>
            <option value="CANCELADA">Cancelada</option>
          </select>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className="rounded border border-border bg-surface px-2 py-1 text-foreground"
          >
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
              className="rounded border border-border px-2 py-1 text-muted hover:bg-surface-2"
            >
              Limpar filtros
            </button>
          )}
        </div>

        {erro && <p className="mb-3 rounded bg-danger/10 px-3 py-2 text-sm text-danger">{erro}</p>}
        {carregando && <p className="text-sm text-muted">Carregando…</p>}
        {!carregando && reservas.length === 0 && <p className="text-sm text-muted">Nenhuma reserva encontrada.</p>}

        <ul className="space-y-3">
          {reservas.map((r) => (
            <li key={r.id} className="rounded-lg border border-border bg-surface p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-foreground">
                  {formatarDataBR(r.date)} — {r.startTime} às {r.endTime}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    r.status === "CANCELADA" ? "bg-danger/10 text-danger" : "bg-success/10 text-success"
                  }`}
                >
                  {r.status === "CANCELADA" ? "Cancelada" : "Confirmada"}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted">{r.nomeResponsavel}</p>
              <p className="text-sm text-muted">{r.ministerio}</p>
              {r.finalidade && <p className="text-sm text-muted">Finalidade: {r.finalidade}</p>}
              <p className="mt-1 text-xs text-accent-light">{r.recorrente ? "Reserva recorrente" : "Reserva única"}</p>
              <p className="text-xs text-muted">Código: {r.code}</p>

              {podeEditar && r.status !== "CANCELADA" && editandoId !== r.id && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => iniciarEdicao(r)}
                    className="rounded border border-border px-3 py-1 text-xs text-foreground hover:bg-surface-2"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => setConfirmando({ id: r.id, tipo: "ocorrencia" })}
                    className="rounded border border-danger/40 px-3 py-1 text-xs text-danger hover:bg-danger/10"
                  >
                    {r.recorrente ? "Cancelar esta ocorrência" : "Cancelar"}
                  </button>
                  {r.recorrente && (
                    <button
                      onClick={() => setConfirmando({ id: r.id, tipo: "serie" })}
                      className="rounded border border-danger/40 px-3 py-1 text-xs text-danger hover:bg-danger/10"
                    >
                      Cancelar esta e as próximas
                    </button>
                  )}
                </div>
              )}

              {editandoId === r.id && (
                <div className="mt-3 space-y-2 border-t border-border pt-3">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <input
                      type="date"
                      value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                      className="rounded border border-border bg-background px-2 py-1 text-sm text-foreground"
                    />
                    <input
                      type="time"
                      value={form.startTime}
                      onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                      className="rounded border border-border bg-background px-2 py-1 text-sm text-foreground"
                    />
                    <input
                      type="time"
                      value={form.endTime}
                      onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                      className="rounded border border-border bg-background px-2 py-1 text-sm text-foreground"
                    />
                  </div>
                  <input
                    placeholder="Finalidade"
                    value={form.finalidade}
                    onChange={(e) => setForm({ ...form, finalidade: e.target.value })}
                    className="w-full rounded border border-border bg-background px-2 py-1 text-sm text-foreground placeholder:text-muted"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => salvarEdicao(r.id)}
                      className="rounded bg-accent hover:bg-accent-hover px-3 py-1 text-xs text-white"
                    >
                      Salvar
                    </button>
                    <button
                      onClick={() => setEditandoId(null)}
                      className="rounded border border-border px-3 py-1 text-xs text-foreground hover:bg-surface-2"
                    >
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-5 shadow-lg">
            <p className="mb-4 text-sm text-foreground">
              Tem certeza de que deseja cancelar{" "}
              {confirmando.tipo === "serie" ? "esta e todas as próximas ocorrências" : "esta reserva"}?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmando(null)}
                className="rounded border border-border px-3 py-1.5 text-sm text-foreground hover:bg-surface-2"
              >
                Voltar
              </button>
              <button
                onClick={() => cancelar(confirmando.id, confirmando.tipo)}
                className="rounded bg-danger px-3 py-1.5 text-sm text-white hover:opacity-90"
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
