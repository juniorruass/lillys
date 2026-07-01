"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import TopBar from "@/components/layout/TopBar";
import { Heart, Check, ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import Marquee from "@/components/ui/Marquee";

interface SpiritLog {
  id: string; date: string; prayer: boolean; reading: boolean; gratitude?: string; reflection?: string;
}

const PRACTICES = [
  { key: "prayer" as const, label: "Oração", icon: "🙏" },
  { key: "reading" as const, label: "Leitura bíblica", icon: "📖" },
];

export default function EspiritualidadePage() {
  const [log, setLog] = useState<SpiritLog | null>(null);
  const [history, setHistory] = useState<SpiritLog[]>([]);
  const [gratitude, setGratitude] = useState("");
  const [reflection, setReflection] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const supabase = createClient();
  const today = new Date().toISOString().split("T")[0];
  const didInit = useRef(false);

  const loadHistory = useCallback(async () => {
    const { data } = await supabase
      .from("spirituality_logs")
      .select("*")
      .order("date", { ascending: false })
      .limit(15);
    setHistory(data ?? []);
  }, [supabase]);

  const loadToday = useCallback(async () => {
    const { data } = await supabase
      .from("spirituality_logs")
      .select("*")
      .eq("date", today)
      .single();
    if (data) {
      setLog(data);
      // pre-fill só na primeira montagem para edição
      if (!didInit.current) {
        setGratitude(data.gratitude ?? "");
        setReflection(data.reflection ?? "");
        didInit.current = true;
      }
    }
  }, [supabase, today]);

  useEffect(() => {
    loadToday();
    loadHistory();
  }, [loadToday, loadHistory]);

  async function togglePractice(key: "prayer" | "reading") {
    const current = log?.[key] ?? false;
    await supabase.from("spirituality_logs").upsert(
      { date: today, [key]: !current },
      { onConflict: "date" }
    );
    loadToday();
  }

  async function saveText() {
    if (!gratitude.trim() && !reflection.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("spirituality_logs").upsert(
      { date: today, gratitude, reflection },
      { onConflict: "date" }
    );
    setSaving(false);
    if (!error) {
      setGratitude("");
      setReflection("");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      // recarrega log do dia e histórico (hoje vai aparecer no topo)
      loadToday();
      loadHistory();
    }
  }

  // hoje separado do resto no histórico
  const todayInHistory = history.find((h) => h.date === today);
  const pastHistory = history.filter((h) => h.date !== today);

  return (
    <>
      <TopBar />
      <div className="border-b border-[#E2E8F0] py-1.5 bg-white/60 backdrop-blur-sm">
        <Marquee items={["Espiritualidade", "Oração", "Leitura bíblica", "Gratidão", "Reflexão", "Fé", "Propósito"]} speed={35} className="text-[10px] font-semibold tracking-widest uppercase text-[#00C8FF]/50" separator="·" />
      </div>
      <main className="flex-1 p-4 lg:p-8 max-w-4xl w-full mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-pink-50 flex items-center justify-center">
            <Heart size={20} className="text-pink-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#0A1628]">Espiritualidade</h1>
            <p className="text-sm text-[#64748B] capitalize">{format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}</p>
          </div>
        </div>

        {/* Práticas do dia */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 mb-4 shadow-sm">
          <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-3">Práticas de hoje</p>
          <div className="grid grid-cols-2 gap-3">
            {PRACTICES.map((p) => {
              const done = log?.[p.key] ?? false;
              return (
                <button key={p.key} onClick={() => togglePractice(p.key)}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                    done ? "border-[#00C8FF] bg-[#E0F7FF]" : "border-[#E2E8F0] hover:border-[#B3EEFF]"
                  }`}>
                  <span className="text-xl">{p.icon}</span>
                  <p className={`flex-1 text-left text-sm font-medium ${done ? "text-[#00C8FF]" : "text-[#0A1628]"}`}>{p.label}</p>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${done ? "bg-[#00C8FF]" : "bg-[#E2E8F0]"}`}>
                    {done && <Check size={10} strokeWidth={3} className="text-white" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Registro de hoje — só aparece se já salvou */}
        {todayInHistory && (todayInHistory.gratitude || todayInHistory.reflection) && (
          <div className="bg-[#F0FFF4] rounded-2xl border border-green-200 p-4 mb-4">
            <p className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-2">✅ Registrado hoje</p>
            {todayInHistory.gratitude && (
              <div className="mb-2">
                <p className="text-[10px] font-semibold text-[#64748B] uppercase mb-1">✨ Gratidão</p>
                <p className="text-sm text-[#374151] whitespace-pre-wrap">{todayInHistory.gratitude}</p>
              </div>
            )}
            {todayInHistory.reflection && (
              <div>
                <p className="text-[10px] font-semibold text-[#64748B] uppercase mb-1">💭 Reflexão</p>
                <p className="text-sm text-[#374151] whitespace-pre-wrap">{todayInHistory.reflection}</p>
              </div>
            )}
          </div>
        )}

        {/* Formulário — sempre aberto, limpa após salvar */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 mb-4 shadow-sm">
          <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
            ✨ Gratidão{todayInHistory?.gratitude ? " — atualizar" : ""}
          </p>
          <textarea
            value={gratitude}
            onChange={(e) => setGratitude(e.target.value)}
            placeholder="Pelo que você é grato hoje?"
            className="w-full text-sm border-none outline-none resize-none bg-transparent text-[#0A1628] placeholder:text-[#94A3B8] min-h-[80px]"
          />
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 mb-4 shadow-sm">
          <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
            💭 Reflexão{todayInHistory?.reflection ? " — atualizar" : ""}
          </p>
          <textarea
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            placeholder="Uma reflexão, versículo ou pensamento do dia..."
            className="w-full text-sm border-none outline-none resize-none bg-transparent text-[#0A1628] placeholder:text-[#94A3B8] min-h-[100px]"
          />
        </div>

        <button
          onClick={saveText}
          disabled={saving || (!gratitude.trim() && !reflection.trim())}
          className={`w-full py-3 font-semibold rounded-xl transition-all mb-8 flex items-center justify-center gap-2 ${
            saved
              ? "bg-green-500 text-white"
              : "bg-[#00C8FF] text-white hover:bg-[#0099CC] disabled:opacity-40"
          }`}
        >
          {saved ? <><CheckCircle2 size={16} /> Salvo!</> : saving ? "Salvando..." : "Salvar reflexões"}
        </button>

        {/* Histórico — dias anteriores */}
        {pastHistory.length > 0 && (
          <section>
            <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-3">Histórico</p>
            <div className="space-y-2">
              {pastHistory.map((h) => {
                const isOpen = expanded === h.id;
                const dateLabel = format(parseISO(h.date), "EEEE, d 'de' MMMM", { locale: ptBR });
                const hasText = h.gratitude || h.reflection;
                return (
                  <div key={h.id} className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
                    <button
                      onClick={() => setExpanded(isOpen ? null : h.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#F8FAFB] transition-colors"
                    >
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium text-[#0A1628] capitalize">{dateLabel}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {h.prayer && <span className="text-[10px] bg-[#E0F7FF] text-[#00C8FF] px-1.5 py-0.5 rounded font-medium">🙏 Oração</span>}
                          {h.reading && <span className="text-[10px] bg-[#E0F7FF] text-[#00C8FF] px-1.5 py-0.5 rounded font-medium">📖 Leitura</span>}
                          {hasText && <span className="text-[10px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded font-medium">✍️ Reflexão</span>}
                          {!h.prayer && !h.reading && !hasText && <span className="text-[10px] text-[#94A3B8]">Sem registro</span>}
                        </div>
                      </div>
                      {isOpen ? <ChevronUp size={14} className="text-[#94A3B8]" /> : <ChevronDown size={14} className="text-[#94A3B8]" />}
                    </button>
                    {isOpen && (
                      <div className="border-t border-[#F1F5F9]">
                        {hasText ? (
                          <div className="px-4 py-3 space-y-3">
                            {h.gratitude && (
                              <div>
                                <p className="text-[10px] font-semibold text-[#64748B] uppercase mb-1">✨ Gratidão</p>
                                <p className="text-sm text-[#374151] whitespace-pre-wrap">{h.gratitude}</p>
                              </div>
                            )}
                            {h.reflection && (
                              <div>
                                <p className="text-[10px] font-semibold text-[#64748B] uppercase mb-1">💭 Reflexão</p>
                                <p className="text-sm text-[#374151] whitespace-pre-wrap">{h.reflection}</p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="px-4 py-3 text-xs text-[#94A3B8]">Nenhum texto registrado neste dia.</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
