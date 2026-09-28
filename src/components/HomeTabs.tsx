"use client";

import { useState } from "react";
import ChatAssistant from "./ChatAssistant";
import CalendarView from "./CalendarView";

export default function HomeTabs() {
  const [aba, setAba] = useState<"assistente" | "calendario">("assistente");

  return (
    <div>
      <div className="mb-5 inline-flex max-w-full gap-1 overflow-x-auto rounded-full bg-surface-2 p-1">
        <button
          onClick={() => setAba("assistente")}
          className={`shrink-0 whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold transition-colors sm:px-5 sm:text-sm ${
            aba === "assistente"
              ? "bg-accent text-white shadow-sm"
              : "text-muted hover:bg-surface hover:text-foreground"
          }`}
        >
          💬 <span className="hidden sm:inline">Assistente de reservas</span>
          <span className="sm:hidden">Assistente</span>
        </button>
        <button
          onClick={() => setAba("calendario")}
          className={`shrink-0 whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold transition-colors sm:px-5 sm:text-sm ${
            aba === "calendario"
              ? "bg-accent text-white shadow-sm"
              : "text-muted hover:bg-surface hover:text-foreground"
          }`}
        >
          📅 Calendário
        </button>
      </div>

      {aba === "assistente" ? <ChatAssistant /> : <CalendarView />}
    </div>
  );
}
