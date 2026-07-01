"use client";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bell } from "lucide-react";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

interface Summary {
  tasks: number;
  pending: number;
  goals: number;
}

export default function TopBar({ summary }: { summary?: Summary }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  const dateStr = format(now, "EEEE, d 'de' MMMM", { locale: ptBR });
  const timeStr = format(now, "HH:mm");

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[#E2E8F0]">
      <div className="flex items-center justify-between px-4 py-3 lg:px-6">
        {/* Saudação + data */}
        <div>
          <div className="flex items-baseline gap-2">
            <h1 className="text-lg font-semibold text-[#0A1628]">
              {getGreeting()}, Junior
            </h1>
            <span className="text-sm text-[#00C8FF] font-medium hidden sm:inline">{timeStr}</span>
          </div>
          <p className="text-xs text-[#64748B] capitalize">{dateStr}</p>
        </div>

        {/* Resumo + notificação */}
        <div className="flex items-center gap-3">
          {summary && (
            <div className="hidden sm:flex items-center gap-3 text-xs text-[#64748B]">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00C8FF] inline-block" />
                {summary.tasks} tarefas
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 inline-block" />
                {summary.pending} pendências
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                {summary.goals} metas
              </span>
            </div>
          )}
          <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F0F9FF] transition-colors relative">
            <Bell size={18} className="text-[#64748B]" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#00C8FF]" />
          </button>
        </div>
      </div>

      {/* Resumo mobile */}
      {summary && (
        <div className="sm:hidden flex items-center gap-4 px-4 pb-2 text-xs text-[#64748B]">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00C8FF] inline-block" />
            {summary.tasks} tarefas
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 inline-block" />
            {summary.pending} pendências
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
            {summary.goals} metas
          </span>
        </div>
      )}
    </header>
  );
}
