"use client";

import { useState, useRef, useEffect } from "react";
import type { ChatState } from "@/lib/chatEngine";

interface Mensagem {
  autor: "usuario" | "assistente";
  texto: string;
}

/** Renderiza **negrito** simples nas mensagens do assistente, sem trazer uma lib de markdown inteira. */
function renderizarTexto(texto: string) {
  const partes = texto.split(/(\*\*[^*]+\*\*)/g);
  return partes.map((parte, i) => {
    if (parte.startsWith("**") && parte.endsWith("**")) {
      return <strong key={i}>{parte.slice(2, -2)}</strong>;
    }
    return <span key={i}>{parte}</span>;
  });
}

const MENSAGEM_INICIAL: Mensagem = {
  autor: "assistente",
  texto:
    'Olá! Eu sou o assistente de reservas de salas. Me diga a sala, a data e o horário desejados — por exemplo: "Reservar a Sala Kids 1 dia 15/06 das 9h às 12h" ou "Reservar o Templo todos os sábados das 8h30 às 10h45 até 30/11/2025".',
};

export default function ChatAssistant() {
  const [mensagens, setMensagens] = useState<Mensagem[]>([MENSAGEM_INICIAL]);
  const [estado, setEstado] = useState<ChatState>({ step: "coletando" });
  const [entrada, setEntrada] = useState("");
  const [enviando, setEnviando] = useState(false);
  const fimRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens]);

  async function enviarMensagem(e: React.FormEvent) {
    e.preventDefault();
    const texto = entrada.trim();
    if (!texto || enviando) return;

    setMensagens((m) => [...m, { autor: "usuario", texto }]);
    setEntrada("");
    setEnviando(true);

    try {
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: texto, state: estado }),
      });
      const data = await resp.json();
      setEstado(data.state);
      setMensagens((m) => [...m, { autor: "assistente", texto: data.reply }]);
    } catch {
      setMensagens((m) => [
        ...m,
        { autor: "assistente", texto: "Não consegui me conectar ao servidor. Tente novamente em instantes." },
      ]);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex h-[26rem] flex-col rounded-lg border border-border bg-surface shadow-sm sm:h-[32rem]">
      <div className="flex-1 space-y-3 overflow-y-auto p-3 sm:p-4">
        {mensagens.map((m, i) => (
          <div key={i} className={`flex ${m.autor === "usuario" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm ${
                m.autor === "usuario"
                  ? "bg-accent text-white"
                  : "bg-surface-2 text-foreground"
              }`}
            >
              {renderizarTexto(m.texto)}
            </div>
          </div>
        ))}
        {enviando && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-surface-2 px-4 py-2 text-sm text-muted">digitando…</div>
          </div>
        )}
        <div ref={fimRef} />
      </div>
      <form onSubmit={enviarMensagem} className="flex gap-2 border-t border-border p-3">
        <input
          value={entrada}
          onChange={(e) => setEntrada(e.target.value)}
          placeholder="Digite sua mensagem…"
          className="flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          disabled={enviando}
          className="rounded-full bg-accent hover:bg-accent-hover px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Enviar
        </button>
      </form>
    </div>
  );
}
