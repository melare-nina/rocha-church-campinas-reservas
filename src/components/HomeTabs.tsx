"use client";

import { useState } from "react";
import ChatAssistant from "./ChatAssistant";
import CalendarView from "./CalendarView";

export default function HomeTabs() {
  const [aba, setAba] = useState<"assistente" | "calendario">("assistente");

  return (
    <div>
      <div className="mb-4 flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setAba("assistente")}
          className={`px-4 py-2 text-sm font-medium ${
            aba === "assistente"
              ? "border-b-2 border-indigo-600 text-indigo-700"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Assistente de reservas
        </button>
        <button
          onClick={() => setAba("calendario")}
          className={`px-4 py-2 text-sm font-medium ${
            aba === "calendario"
              ? "border-b-2 border-indigo-600 text-indigo-700"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Calendário
        </button>
      </div>

      {aba === "assistente" ? <ChatAssistant /> : <CalendarView />}
    </div>
  );
}
