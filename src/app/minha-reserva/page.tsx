"use client";

import { useState } from "react";
import type { ReservationDTO } from "@/types";

function formatarDataBR(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export default function MinhaReservaPage() {
  const [codigo, setCodigo] = useState("");
  const [reserva, setReserva] = useState<ReservationDTO | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [confirmando, setConfirmando] = useState<null | "ocorrencia" | "serie">(null);
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({ date: "", startTime: "", endTime: "", finalidade: "" });

  async function buscar(e?: React.FormEvent) {
    e?.preventDefault();
    if (!codigo.trim()) return;
    setCarregando(true);
    setErro(null);
    setMensagem(null);
    setReserva(null);
    try {
      const resp = await fetch(`/api/reservations/codigo/${codigo.trim()}`);
      const data = await resp.json();
      if (!resp.ok) {
        setErro(data.error || "Não foi possível encontrar essa reserva.");
        return;
      }
      setReserva(data.reserva);
      setForm({
        date: data.reserva.date,
        startTime: data.reserva.startTime,
        endTime: data.reserva.endTime,
        finalidade: data.reserva.finalidade || "",
      });
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  async function executarCancelamento(tipo: "ocorrencia" | "serie") {
    if (!reserva) return;
    setCarregando(true);
    try {
      const resp = await fetch(`/api/reservations/codigo/${reserva.code}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: tipo === "ocorrencia" ? "cancelar_ocorrencia" : "cancelar_serie" }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setErro(data.error || "Não foi possível cancelar.");
        return;
      }
      setMensagem(data.mensagem || "Reserva cancelada com sucesso.");
      setReserva(null);
      setCodigo("");
    } finally {
      setCarregando(false);
      setConfirmando(null);
    }
  }

  async function salvarEdicao(e: React.FormEvent) {
    e.preventDefault();
    if (!reserva) return;
    setCarregando(true);
    setErro(null);
    try {
      const resp = await fetch(`/api/reservations/codigo/${reserva.code}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "editar", ...form }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setErro(data.error || "Não foi possível salvar as alterações.");
        return;
      }
      setReserva(data.reserva);
      setMensagem("Reserva atualizada com sucesso.");
      setEditando(false);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-1 text-2xl font-semibold text-foreground">Minha reserva</h1>
      <p className="mb-6 text-sm text-muted">
        Informe o código que você recebeu na confirmação para consultar, alterar ou cancelar sua reserva.
      </p>

      <form onSubmit={buscar} className="mb-6 flex flex-col gap-2 sm:flex-row">
        <input
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.toUpperCase())}
          placeholder="Código da reserva (ex.: K7M2P9XQ)"
          className="flex-1 rounded border border-border bg-surface px-3 py-2 text-sm uppercase tracking-wider text-foreground placeholder:text-muted placeholder:normal-case focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          disabled={carregando}
          className="rounded bg-accent hover:bg-accent-hover px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Buscar
        </button>
      </form>

      {erro && <p className="mb-4 rounded bg-danger/10 px-3 py-2 text-sm text-danger">{erro}</p>}
      {mensagem && <p className="mb-4 rounded bg-success/10 px-3 py-2 text-sm text-success">{mensagem}</p>}

      {reserva && (
        <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">{reserva.roomName}</h2>
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${
                reserva.status === "CANCELADA" ? "bg-danger/10 text-danger" : "bg-success/10 text-success"
              }`}
            >
              {reserva.status === "CANCELADA" ? "Cancelada" : "Confirmada"}
            </span>
          </div>
          <p className="text-sm text-muted">
            {formatarDataBR(reserva.date)} — {reserva.startTime} às {reserva.endTime}
          </p>
          <p className="mt-2 text-sm text-foreground">
            <span className="font-medium">Responsável:</span> {reserva.nomeResponsavel}
          </p>
          <p className="text-sm text-foreground">
            <span className="font-medium">Ministério:</span> {reserva.ministerio}
          </p>
          {reserva.finalidade && (
            <p className="text-sm text-foreground">
              <span className="font-medium">Finalidade:</span> {reserva.finalidade}
            </p>
          )}
          {reserva.recorrente && (
            <p className="mt-1 text-xs text-accent-light">Esta reserva faz parte de uma recorrência.</p>
          )}

          {reserva.status !== "CANCELADA" && !editando && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => setEditando(true)}
                className="rounded border border-border px-3 py-1.5 text-sm text-foreground hover:bg-surface-2"
              >
                Editar
              </button>
              <button
                onClick={() => setConfirmando("ocorrencia")}
                className="rounded border border-danger/40 px-3 py-1.5 text-sm text-danger hover:bg-danger/10"
              >
                {reserva.recorrente ? "Cancelar somente esta ocorrência" : "Cancelar reserva"}
              </button>
              {reserva.recorrente && (
                <button
                  onClick={() => setConfirmando("serie")}
                  className="rounded border border-danger/40 px-3 py-1.5 text-sm text-danger hover:bg-danger/10"
                >
                  Cancelar esta e todas as próximas
                </button>
              )}
            </div>
          )}

          {editando && (
            <form onSubmit={salvarEdicao} className="mt-4 space-y-3 border-t border-border pt-4">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <label className="text-xs text-muted">
                  Data
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="mt-1 w-full rounded border border-border bg-background px-2 py-1 text-sm text-foreground"
                  />
                </label>
                <label className="text-xs text-muted">
                  Início
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    className="mt-1 w-full rounded border border-border bg-background px-2 py-1 text-sm text-foreground"
                  />
                </label>
                <label className="text-xs text-muted">
                  Término
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                    className="mt-1 w-full rounded border border-border bg-background px-2 py-1 text-sm text-foreground"
                  />
                </label>
              </div>
              <label className="block text-xs text-muted">
                Finalidade (opcional)
                <input
                  value={form.finalidade}
                  onChange={(e) => setForm({ ...form, finalidade: e.target.value })}
                  className="mt-1 w-full rounded border border-border bg-background px-2 py-1 text-sm text-foreground"
                />
              </label>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="rounded bg-accent hover:bg-accent-hover px-3 py-1.5 text-sm text-white"
                >
                  Salvar alterações
                </button>
                <button
                  type="button"
                  onClick={() => setEditando(false)}
                  className="rounded border border-border px-3 py-1.5 text-sm text-foreground hover:bg-surface-2"
                >
                  Cancelar edição
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {confirmando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-5 shadow-lg">
            <p className="mb-4 text-sm text-foreground">
              Tem certeza de que deseja cancelar{" "}
              {confirmando === "serie" ? "esta e todas as próximas ocorrências" : "esta reserva"}?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmando(null)}
                className="rounded border border-border px-3 py-1.5 text-sm text-foreground hover:bg-surface-2"
              >
                Voltar
              </button>
              <button
                onClick={() => executarCancelamento(confirmando)}
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
