"use client";
import { useState, useEffect, useCallback } from "react";
import TopBar from "@/components/layout/TopBar";
import { Megaphone, RefreshCw, MousePointerClick, Target } from "lucide-react";
import Marquee from "@/components/ui/Marquee";

interface ClientReport {
  id: string;
  name: string;
  active_campaigns?: number;
  spend_7d?: number;
  clicks_7d?: number;
  leads_7d?: number;
  error?: string;
}

function fmt(n: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
}

const REFRESH_MS = 60_000;

export default function CampanhasPage() {
  const [clients, setClients] = useState<ClientReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/campaigns-report");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setClients(data.clients ?? []);
    } catch {
      setError(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  return (
    <>
      <TopBar />
      <div className="border-b border-[#E2E8F0] py-1.5 bg-white/60 backdrop-blur-sm">
        <Marquee items={["Campanhas ao vivo", "Meta Ads", "Últimos 7 dias", "Leads", "Investimento", "Cliques"]} speed={35} className="text-[10px] font-semibold tracking-widest uppercase text-[#00C8FF]/50" separator="·" />
      </div>
      <main className="flex-1 p-4 lg:p-8 max-w-4xl w-full mx-auto">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#E0F7FF] flex items-center justify-center">
              <Megaphone size={20} className="text-[#00C8FF]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#0A1628]">Campanhas</h1>
              <p className="text-xs text-[#64748B]">Últimos 7 dias · atualiza a cada minuto</p>
            </div>
          </div>
          <button onClick={load} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F8FAFB] text-[#64748B] transition-colors">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {loading && clients.length === 0 && (
          <div className="grid grid-cols-1 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-[#E2E8F0] p-4 animate-pulse">
                <div className="h-3 bg-[#E2E8F0] rounded w-1/3 mb-3" />
                <div className="h-6 bg-[#E2E8F0] rounded w-2/3" />
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 text-center">
            <p className="text-sm text-orange-600 font-medium">Não foi possível conectar ao adm.upflu.digital</p>
            <button onClick={load} className="mt-3 text-xs text-orange-600 underline">Tentar novamente</button>
          </div>
        )}

        {!error && !loading && clients.length === 0 && (
          <div className="text-center py-12">
            <Megaphone size={32} className="text-[#E2E8F0] mx-auto mb-2" />
            <p className="text-sm text-[#64748B]">Nenhum cliente com Meta Ads configurado</p>
          </div>
        )}

        <div className="space-y-3">
          {clients.map((c) => (
            <div key={c.id} className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold text-[#0A1628]">{c.name}</p>
                {!c.error && (
                  <span className="text-[10px] bg-[#E0F7FF] text-[#00C8FF] px-2 py-0.5 rounded-full font-semibold">
                    {c.active_campaigns ?? 0} ativa{c.active_campaigns === 1 ? "" : "s"}
                  </span>
                )}
              </div>
              {c.error ? (
                <p className="text-xs text-[#94A3B8]">{c.error}</p>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-[10px] font-semibold text-[#64748B] uppercase mb-1">Investido</p>
                    <p className="text-sm font-bold text-[#0A1628]">{fmt(c.spend_7d ?? 0)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-[#64748B] uppercase mb-1 flex items-center gap-1">
                      <MousePointerClick size={10} /> Cliques
                    </p>
                    <p className="text-sm font-bold text-[#0A1628]">{c.clicks_7d ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-[#64748B] uppercase mb-1 flex items-center gap-1">
                      <Target size={10} /> Leads
                    </p>
                    <p className="text-sm font-bold text-[#0A1628]">{c.leads_7d ?? 0}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
