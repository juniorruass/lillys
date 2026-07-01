"use client";
import { useState } from "react";
import TopBar from "@/components/layout/TopBar";
import { Sparkles, RefreshCw, Send } from "lucide-react";
import Marquee from "@/components/ui/Marquee";

interface BriefingData {
  greeting: string; summary: string; focus: string; insight: string; suggestion: string;
}

export default function IAPage() {
  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [asking, setAsking] = useState(false);

  async function generateBriefing() {
    setLoading(true);
    try {
      const res = await fetch("/api/briefing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "daily" }) });
      const data = await res.json();
      setBriefing(data);
    } catch {}
    setLoading(false);
  }

  async function ask() {
    if (!question.trim()) return;
    setAsking(true);
    setAnswer("");
    try {
      const res = await fetch("/api/briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "question", question }),
      });
      const data = await res.json();
      setAnswer(data.answer ?? "");
    } catch { setAnswer("Não foi possível responder agora."); }
    setAsking(false);
    setQuestion("");
  }

  return (
    <>
      <TopBar />
      <div className="border-b border-[#E2E8F0] py-1.5 bg-white/60 backdrop-blur-sm">
        <Marquee items={["IA Pessoal", "Briefing diário", "Assistente inteligente", "Contexto pessoal", "Insights automáticos", "Powered by OpenAI"]} speed={35} className="text-[10px] font-semibold tracking-widest uppercase text-[#00C8FF]/50" separator="·" />
      </div>
      <main className="flex-1 p-4 lg:p-8 max-w-4xl w-full mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-[#E0F7FF] flex items-center justify-center">
            <Sparkles size={20} className="text-[#00C8FF]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#0A1628]">IA Pessoal</h1>
            <p className="text-sm text-[#64748B]">Assistente que conhece seu contexto</p>
          </div>
        </div>

        {/* Gerar briefing */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-sm mb-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-[#0A1628]">Briefing do dia</p>
            <button onClick={generateBriefing} disabled={loading}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#00C8FF] text-white text-xs font-semibold rounded-lg hover:bg-[#0099CC] transition-colors disabled:opacity-40">
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
              {loading ? "Gerando..." : "Gerar"}
            </button>
          </div>

          {!briefing && !loading && (
            <p className="text-sm text-[#94A3B8] text-center py-6">
              Clique em &quot;Gerar&quot; para receber um briefing personalizado baseado nas suas tarefas, metas e hábitos.
            </p>
          )}

          {loading && (
            <div className="space-y-2 py-2">
              {[1,2,3].map((i) => (
                <div key={i} className="h-4 bg-[#E2E8F0] rounded animate-pulse" style={{ width: `${85 - i * 10}%` }} />
              ))}
            </div>
          )}

          {briefing && (
            <div className="space-y-3">
              <p className="text-base font-semibold text-[#0A1628]">{briefing.greeting}</p>
              <div className="bg-[#F0F9FF] rounded-xl p-3">
                <p className="text-xs font-semibold text-[#00C8FF] mb-1">📋 Resumo do dia</p>
                <p className="text-sm text-[#0A1628]">{briefing.summary}</p>
              </div>
              <div className="bg-[#FFF7ED] rounded-xl p-3">
                <p className="text-xs font-semibold text-orange-500 mb-1">🎯 Foco principal</p>
                <p className="text-sm text-[#0A1628]">{briefing.focus}</p>
              </div>
              <div className="bg-[#F0FFF4] rounded-xl p-3">
                <p className="text-xs font-semibold text-green-600 mb-1">💡 Insight</p>
                <p className="text-sm text-[#0A1628]">{briefing.insight}</p>
              </div>
              <div className="bg-[#FFF0F3] rounded-xl p-3">
                <p className="text-xs font-semibold text-pink-500 mb-1">✨ Sugestão</p>
                <p className="text-sm text-[#0A1628]">{briefing.suggestion}</p>
              </div>
            </div>
          )}
        </div>

        {/* Chat */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-sm">
          <p className="text-sm font-semibold text-[#0A1628] mb-3">Perguntar à IA</p>
          {answer && (
            <div className="bg-[#F0F9FF] rounded-xl p-3 mb-3">
              <p className="text-sm text-[#0A1628] leading-relaxed">{answer}</p>
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") ask(); }}
              placeholder="O que devo priorizar hoje?"
              className="flex-1 text-sm border border-[#E2E8F0] rounded-xl px-3 py-2 outline-none focus:border-[#00C8FF] bg-[#F8FAFB]"
            />
            <button onClick={ask} disabled={!question.trim() || asking}
              className="w-10 h-10 flex items-center justify-center bg-[#00C8FF] text-white rounded-xl hover:bg-[#0099CC] transition-colors disabled:opacity-40">
              <Send size={16} />
            </button>
          </div>
        </div>
      </main>
    </>
  );
}
