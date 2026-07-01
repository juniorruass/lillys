"use client";
import { useState, useEffect } from "react";
import TopBar from "@/components/layout/TopBar";
import { BarChart2, Users, DollarSign, TrendingUp, RefreshCw, ExternalLink } from "lucide-react";
import Marquee from "@/components/ui/Marquee";

interface UpfluStatus {
  mrr: number; arr: number; clients: number; onboarding: number;
  renewals_30d: number; kanban: { todo: number; doing: number; done: number };
}

function fmt(n: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n);
}

export default function StatusUpfluPage() {
  const [data, setData] = useState<UpfluStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  async function load() {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/upflu-status");
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch {
      setError(true);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  return (
    <>
      <TopBar />
      <div className="border-b border-[#E2E8F0] py-1.5 bg-white/60 backdrop-blur-sm">
        <Marquee items={["Status Upflu", "MRR", "Clientes ativos", "Kanban", "Resultados", "Crescimento digital"]} speed={35} className="text-[10px] font-semibold tracking-widest uppercase text-[#00C8FF]/50" separator="·" />
      </div>
      <main className="flex-1 p-4 lg:p-8 max-w-4xl w-full mx-auto">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#E0F7FF] flex items-center justify-center">
              <BarChart2 size={20} className="text-[#00C8FF]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#0A1628]">Status Upflu</h1>
              <a href="https://adm.upflu.digital" target="_blank" rel="noopener noreferrer"
                className="text-xs text-[#00C8FF] flex items-center gap-1 hover:underline">
                adm.upflu.digital <ExternalLink size={10} />
              </a>
            </div>
          </div>
          <button onClick={load} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F8FAFB] text-[#64748B] transition-colors">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {loading && (
          <div className="grid grid-cols-2 gap-3">
            {[1,2,3,4].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-[#E2E8F0] p-4 animate-pulse">
                <div className="h-3 bg-[#E2E8F0] rounded w-1/2 mb-3" />
                <div className="h-6 bg-[#E2E8F0] rounded w-3/4" />
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 text-center">
            <p className="text-sm text-orange-600 font-medium">Não foi possível conectar ao adm.upflu.digital</p>
            <p className="text-xs text-orange-500 mt-1">Verifique se a API está configurada corretamente</p>
            <button onClick={load} className="mt-3 text-xs text-orange-600 underline">Tentar novamente</button>
          </div>
        )}

        {data && (
          <div className="space-y-4">
            {/* MRR / ARR */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign size={14} className="text-[#00C8FF]" />
                  <p className="text-xs font-semibold text-[#64748B] uppercase">MRR</p>
                </div>
                <p className="text-2xl font-bold text-[#0A1628]">{fmt(data.mrr)}</p>
              </div>
              <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp size={14} className="text-green-500" />
                  <p className="text-xs font-semibold text-[#64748B] uppercase">ARR</p>
                </div>
                <p className="text-2xl font-bold text-[#0A1628]">{fmt(data.arr)}</p>
              </div>
            </div>

            {/* Clientes */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-2xl border border-[#E2E8F0] p-3 shadow-sm text-center">
                <p className="text-[10px] font-semibold text-[#64748B] uppercase mb-1">Ativos</p>
                <p className="text-2xl font-bold text-[#0A1628]">{data.clients}</p>
              </div>
              <div className="bg-white rounded-2xl border border-[#E2E8F0] p-3 shadow-sm text-center">
                <p className="text-[10px] font-semibold text-[#64748B] uppercase mb-1">Onboarding</p>
                <p className="text-2xl font-bold text-orange-500">{data.onboarding}</p>
              </div>
              <div className="bg-white rounded-2xl border border-[#E2E8F0] p-3 shadow-sm text-center">
                <p className="text-[10px] font-semibold text-[#64748B] uppercase mb-1">Renovações 30d</p>
                <p className="text-2xl font-bold text-red-400">{data.renewals_30d}</p>
              </div>
            </div>

            {/* Kanban */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-sm">
              <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-3">Kanban de tarefas</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { key: "todo", label: "A fazer", color: "bg-gray-100 text-gray-600" },
                  { key: "doing", label: "Fazendo", color: "bg-[#E0F7FF] text-[#00C8FF]" },
                  { key: "done", label: "Feito", color: "bg-green-100 text-green-700" },
                ].map((c) => (
                  <div key={c.key} className="text-center">
                    <p className="text-2xl font-bold text-[#0A1628]">{data.kanban[c.key as keyof typeof data.kanban]}</p>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${c.color}`}>{c.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
