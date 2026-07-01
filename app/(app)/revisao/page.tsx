"use client";
import { useState, useEffect, useCallback } from "react";
import TopBar from "@/components/layout/TopBar";
import { RefreshCw, Save, Wand2, CheckCircle2, Clock, Heart, DollarSign } from "lucide-react";
import Marquee from "@/components/ui/Marquee";
import { createClient } from "@/lib/supabase";
import { format, startOfWeek, endOfWeek, subWeeks } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Review {
  id?: string; week_start: string;
  accomplished?: string; pending?: string; next_focus?: string; mood?: number;
}

interface WeekStats {
  tasksDone: number; tasksOpen: number;
  prayerDays: number; readingDays: number;
  totalSpent: number; totalIncome: number;
}

const MOODS = [
  { v: 1, emoji: "😞", label: "Ruim" },
  { v: 2, emoji: "😕", label: "Regular" },
  { v: 3, emoji: "😐", label: "Ok" },
  { v: 4, emoji: "😊", label: "Bom" },
  { v: 5, emoji: "🔥", label: "Excelente" },
];

export default function RevisaoPage() {
  const [review, setReview] = useState<Review>({ week_start: "" });
  const [stats, setStats] = useState<WeekStats | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const weekBase = subWeeks(new Date(), weekOffset);
  const weekStart = format(startOfWeek(weekBase, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const weekEnd   = format(endOfWeek(weekBase,   { weekStartsOn: 1 }), "yyyy-MM-dd");
  const weekLabel = `${format(startOfWeek(weekBase, { weekStartsOn: 1 }), "d MMM", { locale: ptBR })} – ${format(endOfWeek(weekBase, { weekStartsOn: 1 }), "d MMM yyyy", { locale: ptBR })}`;

  const loadWeekStats = useCallback(async () => {
    const [
      { data: done },
      { data: open },
      { data: spirit },
      { data: finance },
    ] = await Promise.all([
      supabase.from("tasks").select("id").eq("completed", true).gte("updated_at", weekStart).lte("updated_at", weekEnd + "T23:59:59"),
      supabase.from("tasks").select("id").eq("completed", false),
      supabase.from("spirituality_logs").select("prayer,reading").gte("date", weekStart).lte("date", weekEnd),
      supabase.from("finance_entries").select("type,amount").in("type", ["entrada","saida"]).gte("date", weekStart).lte("date", weekEnd),
    ]);
    setStats({
      tasksDone:   done?.length ?? 0,
      tasksOpen:   open?.length ?? 0,
      prayerDays:  spirit?.filter((s) => s.prayer).length ?? 0,
      readingDays: spirit?.filter((s) => s.reading).length ?? 0,
      totalSpent:  finance?.filter((f) => f.type === "saida").reduce((s, f) => s + Number(f.amount), 0) ?? 0,
      totalIncome: finance?.filter((f) => f.type === "entrada").reduce((s, f) => s + Number(f.amount), 0) ?? 0,
    });
  }, [supabase, weekStart, weekEnd]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("weekly_reviews").select("*").eq("week_start", weekStart).single();
    if (data) setReview(data);
    else setReview({ week_start: weekStart, accomplished: "", pending: "", next_focus: "", mood: undefined });
    await loadWeekStats();
    setLoading(false);
  }, [supabase, weekStart, loadWeekStats]);

  useEffect(() => { load(); }, [load]);

  async function autoFill() {
    setLoading(true);
    const [{ data: done }, { data: open }, { data: projects }] = await Promise.all([
      supabase.from("tasks").select("title").eq("completed", true).gte("updated_at", weekStart).lte("updated_at", weekEnd + "T23:59:59"),
      supabase.from("tasks").select("title,type").eq("completed", false),
      supabase.from("project_tasks").select("title,status").eq("status", "todo").limit(3),
    ]);

    const accomplishedLines = done?.length
      ? done.map((t) => `• ${t.title}`).join("\n")
      : "• Nenhuma tarefa marcada como concluída essa semana";

    const pendingLines = open?.length
      ? open.slice(0, 8).map((t) => `• ${t.title}${t.type === "pending" ? " (pendência)" : ""}`).join("\n")
      : "• Nenhuma tarefa em aberto";

    const focusLines = projects?.length
      ? `Projetos com tarefas em aberto:\n` + projects.map((p) => `• ${p.title}`).join("\n")
      : review.next_focus || "";

    setReview((r) => ({
      ...r,
      accomplished: r.accomplished?.trim() || accomplishedLines,
      pending:      r.pending?.trim()      || pendingLines,
      next_focus:   r.next_focus?.trim()   || focusLines,
    }));
    setLoading(false);
  }

  async function save() {
    setSaving(true);
    const payload = { ...review, week_start: weekStart };
    if (review.id) {
      await supabase.from("weekly_reviews").update(payload).eq("id", review.id);
    } else {
      const { data } = await supabase.from("weekly_reviews").insert(payload).select().single();
      if (data) setReview(data);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function fmt(n: number) {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n);
  }

  return (
    <>
      <TopBar />
      <div className="border-b border-[#E2E8F0] py-1.5 bg-white/60 backdrop-blur-sm">
        <Marquee items={["Revisão Semanal", "O que fiz", "O que ficou", "Foco da próxima semana", "Progresso", "Reflexão", "Crescimento"]} speed={35} className="text-[10px] font-semibold tracking-widest uppercase text-[#00C8FF]/50" separator="·" />
      </div>
      <main className="flex-1 p-4 lg:p-8 max-w-4xl w-full mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#E0F7FF] flex items-center justify-center">
              <RefreshCw size={20} className="text-[#00C8FF]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#0A1628]">Revisão Semanal</h1>
              <p className="text-sm text-[#64748B]">{weekLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={autoFill} disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#E0F7FF] text-[#00C8FF] rounded-lg hover:bg-[#00C8FF] hover:text-white transition-colors disabled:opacity-40">
              <Wand2 size={12} /> {loading ? "..." : "Auto-preencher"}
            </button>
            <button onClick={() => setWeekOffset(weekOffset + 1)}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#E2E8F0] hover:border-[#00C8FF] text-[#64748B] transition-colors text-xs">‹</button>
            <button onClick={() => setWeekOffset(Math.max(0, weekOffset - 1))} disabled={weekOffset === 0}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#E2E8F0] hover:border-[#00C8FF] text-[#64748B] transition-colors text-xs disabled:opacity-30">›</button>
          </div>
        </div>

        {/* Stats automáticos da semana */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-3 text-center shadow-sm">
              <CheckCircle2 size={16} className="text-green-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-[#0A1628]">{stats.tasksDone}</p>
              <p className="text-[10px] text-[#64748B]">Tarefas feitas</p>
            </div>
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-3 text-center shadow-sm">
              <Clock size={16} className="text-orange-400 mx-auto mb-1" />
              <p className="text-lg font-bold text-[#0A1628]">{stats.tasksOpen}</p>
              <p className="text-[10px] text-[#64748B]">Em aberto</p>
            </div>
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-3 text-center shadow-sm">
              <Heart size={16} className="text-pink-400 mx-auto mb-1" />
              <p className="text-lg font-bold text-[#0A1628]">{stats.prayerDays}<span className="text-xs text-[#64748B]">/7</span></p>
              <p className="text-[10px] text-[#64748B]">Orações</p>
            </div>
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-3 text-center shadow-sm">
              <DollarSign size={16} className="text-red-400 mx-auto mb-1" />
              <p className="text-sm font-bold text-[#0A1628]">{fmt(stats.totalSpent)}</p>
              <p className="text-[10px] text-[#64748B]">Gastos</p>
            </div>
          </div>
        )}

        {/* Humor */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-sm mb-4">
          <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-3">Como foi a semana?</p>
          <div className="flex gap-2 justify-between">
            {MOODS.map((m) => (
              <button key={m.v} onClick={() => setReview({ ...review, mood: m.v })}
                className={`flex-1 flex flex-col items-center py-2 rounded-xl border-2 transition-all ${
                  review.mood === m.v ? "border-[#00C8FF] bg-[#E0F7FF] scale-105" : "border-[#E2E8F0] hover:border-[#B3EEFF]"
                }`}>
                <span className="text-2xl">{m.emoji}</span>
                <span className="text-[9px] text-[#64748B] mt-0.5 hidden sm:block">{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* O que realizei */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-sm mb-4">
          <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">✅ O que realizei</p>
          <textarea value={review.accomplished ?? ""}
            onChange={(e) => setReview({ ...review, accomplished: e.target.value })}
            placeholder='Clique em "Auto-preencher" ou escreva manualmente...'
            className="w-full text-sm border-none outline-none resize-none bg-transparent text-[#0A1628] placeholder:text-[#94A3B8] min-h-[100px]" />
        </div>

        {/* O que ficou */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-sm mb-4">
          <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">⏳ O que ficou pendente</p>
          <textarea value={review.pending ?? ""}
            onChange={(e) => setReview({ ...review, pending: e.target.value })}
            placeholder="Auto-preencher busca tarefas em aberto..."
            className="w-full text-sm border-none outline-none resize-none bg-transparent text-[#0A1628] placeholder:text-[#94A3B8] min-h-[80px]" />
        </div>

        {/* Foco */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-sm mb-5">
          <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">🎯 Foco da próxima semana</p>
          <textarea value={review.next_focus ?? ""}
            onChange={(e) => setReview({ ...review, next_focus: e.target.value })}
            placeholder="Qual será a prioridade número 1..."
            className="w-full text-sm border-none outline-none resize-none bg-transparent text-[#0A1628] placeholder:text-[#94A3B8] min-h-[80px]" />
        </div>

        <button onClick={save} disabled={saving}
          className={`w-full flex items-center justify-center gap-2 py-3 font-semibold rounded-xl transition-all ${
            saved ? "bg-green-500 text-white" : "bg-[#00C8FF] text-white hover:bg-[#0099CC] disabled:opacity-40"
          }`}>
          <Save size={16} />
          {saved ? "✓ Salvo!" : saving ? "Salvando..." : "Salvar revisão"}
        </button>
      </main>
    </>
  );
}
