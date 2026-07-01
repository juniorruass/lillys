"use client";
import { useState, useEffect, useCallback } from "react";
import TopBar from "@/components/layout/TopBar";
import { Flame, Check, Settings, Plus, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { format, subDays, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import Marquee from "@/components/ui/Marquee";

interface Habit { id: string; name: string; category: string; icon: string; active: boolean; }
interface HabitLog { habit_id: string; date: string; completed: boolean; }

const CATEGORY_COLOR: Record<string, string> = {
  espiritualidade: "bg-pink-100 text-pink-600",
  exercicio: "bg-orange-100 text-orange-600",
  estudo: "bg-blue-100 text-blue-600",
  leitura: "bg-purple-100 text-purple-600",
  outro: "bg-gray-100 text-gray-600",
};

const CATEGORY_LABELS: Record<string, string> = {
  espiritualidade: "Espiritualidade",
  exercicio: "Exercício",
  estudo: "Estudo",
  leitura: "Leitura",
  outro: "Outro",
};

const HABIT_ICONS = ["🙏","🏃","📚","💧","🧘","✍️","🛌","💊","💰","🎯","⭐","🔥","🍎","🎵","🧠","💪"];

export default function HabitosPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [allHabits, setAllHabits] = useState<Habit[]>([]);
  const [managing, setManaging] = useState(false);
  const [addingHabit, setAddingHabit] = useState(false);
  const [newHabit, setNewHabit] = useState({ name: "", category: "outro", icon: "⭐" });
  const supabase = createClient();
  const today = new Date().toISOString().split("T")[0];

  const gridDays = eachDayOfInterval({ start: subDays(new Date(), 83), end: new Date() });

  const load = useCallback(async () => {
    const [{ data: h }, { data: l }] = await Promise.all([
      supabase.from("habits").select("*").eq("active", true).order("category"),
      supabase.from("habit_logs").select("habit_id,date,completed")
        .gte("date", format(subDays(new Date(), 83), "yyyy-MM-dd")),
    ]);
    setHabits(h ?? []);
    setLogs(l ?? []);
  }, [supabase]);

  const loadAll = useCallback(async () => {
    const { data } = await supabase.from("habits").select("*").order("category");
    setAllHabits(data ?? []);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (managing) loadAll(); }, [managing, loadAll]);

  async function toggle(habitId: string) {
    const existing = logs.find((l) => l.habit_id === habitId && l.date === today);
    if (existing) {
      await supabase.from("habit_logs").update({ completed: !existing.completed })
        .eq("habit_id", habitId).eq("date", today);
    } else {
      await supabase.from("habit_logs").upsert({ habit_id: habitId, date: today, completed: true });
    }
    load();
  }

  async function createHabit() {
    if (!newHabit.name.trim()) return;
    await supabase.from("habits").insert({
      name: newHabit.name.trim(),
      category: newHabit.category,
      icon: newHabit.icon,
      active: true,
    });
    setNewHabit({ name: "", category: "outro", icon: "⭐" });
    setAddingHabit(false);
    load(); loadAll();
  }

  async function toggleHabitActive(id: string, active: boolean) {
    await supabase.from("habits").update({ active: !active }).eq("id", id);
    load(); loadAll();
  }

  async function deleteHabit(id: string) {
    await supabase.from("habit_logs").delete().eq("habit_id", id);
    await supabase.from("habits").delete().eq("id", id);
    load(); loadAll();
  }

  function isCompleted(habitId: string, date: string) {
    return logs.some((l) => l.habit_id === habitId && l.date === date && l.completed);
  }

  function getStreak(habitId: string) {
    let streak = 0;
    let d = new Date();
    while (true) {
      const dateStr = format(d, "yyyy-MM-dd");
      if (isCompleted(habitId, dateStr)) { streak++; d = subDays(d, 1); }
      else break;
    }
    return streak;
  }

  const doneToday = habits.filter((h) => isCompleted(h.id, today)).length;
  const habMarquee = [
    `${doneToday}/${habits.length} hoje`,
    "Espiritualidade", "Exercício", "Estudo", "Leitura",
    "Disciplina", "Consistência", "Hábitos", "Alta Performance",
  ];

  return (
    <>
      <TopBar />
      <div className="border-b border-[#E2E8F0] py-1.5 bg-white/60 backdrop-blur-sm">
        <Marquee items={habMarquee} speed={30} className="text-[10px] font-semibold tracking-widest uppercase text-[#00C8FF]/50" separator="·" />
      </div>
      <main className="flex-1 p-4 lg:p-8 max-w-4xl w-full mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-50 flex items-center justify-center">
              <Flame size={20} className="text-orange-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#0A1628]">Hábitos</h1>
              <p className="text-sm text-[#64748B] capitalize">{format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}</p>
            </div>
          </div>
          <button
            onClick={() => setManaging(!managing)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors ${
              managing
                ? "bg-[#0A1628] text-white border-[#0A1628]"
                : "bg-white text-[#64748B] border-[#E2E8F0] hover:border-[#00C8FF] hover:text-[#00C8FF]"
            }`}
          >
            <Settings size={13} /> {managing ? "Fechar" : "Gerenciar"}
          </button>
        </div>

        {/* ── CHECK-IN ─────────────────────────────────────────────── */}
        {!managing && (
          <>
            <div className="glass-card p-4 mb-6">
              <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-3">Check-in de hoje</p>
              {habits.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-[#94A3B8]">Nenhum hábito cadastrado.</p>
                  <button onClick={() => setManaging(true)}
                    className="mt-2 text-xs text-[#00C8FF] font-semibold hover:text-[#0099CC]">
                    + Criar primeiro hábito
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {habits.map((h) => {
                    const done = isCompleted(h.id, today);
                    const streak = getStreak(h.id);
                    return (
                      <button key={h.id} onClick={() => toggle(h.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                          done ? "border-[#00C8FF] bg-[#E0F7FF]" : "border-[#E2E8F0] hover:border-[#B3EEFF]"
                        }`}>
                        <span className="text-xl">{h.icon}</span>
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${done ? "text-[#00C8FF]" : "text-[#0A1628]"}`}>{h.name}</p>
                          {streak > 0 && (
                            <p className="text-[10px] text-orange-500">🔥 {streak} dia{streak > 1 ? "s" : ""} seguido{streak > 1 ? "s" : ""}</p>
                          )}
                        </div>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLOR[h.category] ?? CATEGORY_COLOR.outro}`}>
                          {CATEGORY_LABELS[h.category] ?? h.category}
                        </span>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${done ? "bg-[#00C8FF]" : "bg-[#E2E8F0]"}`}>
                          {done && <Check size={12} strokeWidth={3} className="text-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Grid de contribuição */}
            {habits.length > 0 && (
              <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-sm">
                <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-4">Histórico — 12 semanas</p>
                {habits.map((h) => {
                  const completedCount = gridDays.filter((d) => isCompleted(h.id, format(d, "yyyy-MM-dd"))).length;
                  return (
                    <div key={h.id} className="mb-4 last:mb-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">{h.icon}</span>
                          <span className="text-xs font-medium text-[#0A1628]">{h.name}</span>
                        </div>
                        <span className="text-[10px] text-[#64748B]">{completedCount}/84 dias</span>
                      </div>
                      <div className="flex gap-0.5 flex-wrap">
                        {gridDays.map((d) => {
                          const dateStr = format(d, "yyyy-MM-dd");
                          const done = isCompleted(h.id, dateStr);
                          const isToday = dateStr === today;
                          return (
                            <div
                              key={dateStr}
                              title={format(d, "d MMM", { locale: ptBR })}
                              className={`w-3 h-3 rounded-sm transition-colors ${
                                done ? "bg-[#00C8FF]" : "bg-[#E2E8F0]"
                              } ${isToday ? "ring-1 ring-[#0099CC]" : ""}`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── GERENCIAR ────────────────────────────────────────────── */}
        {managing && (
          <div className="space-y-4">

            {/* Novo hábito */}
            {addingHabit ? (
              <div className="bg-white border border-[#00C8FF] rounded-2xl p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Novo hábito</p>
                  <button onClick={() => setAddingHabit(false)} className="text-[#94A3B8] hover:text-[#0A1628]">
                    <X size={16} />
                  </button>
                </div>

                {/* Seletor de ícone */}
                <div>
                  <p className="text-xs text-[#64748B] mb-2">Ícone</p>
                  <div className="flex flex-wrap gap-1.5">
                    {HABIT_ICONS.map((icon) => (
                      <button key={icon} onClick={() => setNewHabit({ ...newHabit, icon })}
                        className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all ${
                          newHabit.icon === icon
                            ? "bg-[#00C8FF] scale-110 shadow-sm"
                            : "bg-[#F8FAFB] border border-[#E2E8F0] hover:border-[#00C8FF]"
                        }`}>
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>

                <input
                  autoFocus value={newHabit.name}
                  onChange={(e) => setNewHabit({ ...newHabit, name: e.target.value })}
                  onKeyDown={(e) => { if (e.key === "Enter") createHabit(); if (e.key === "Escape") setAddingHabit(false); }}
                  placeholder="Nome do hábito..."
                  className="w-full text-sm border border-[#E2E8F0] rounded-xl px-3 py-2.5 outline-none focus:border-[#00C8FF] bg-[#F8FAFB]"
                />

                <select value={newHabit.category} onChange={(e) => setNewHabit({ ...newHabit, category: e.target.value })}
                  className="w-full text-sm border border-[#E2E8F0] rounded-xl px-3 py-2.5 outline-none bg-[#F8FAFB] text-[#64748B]">
                  {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>

                <div className="flex gap-2">
                  <button onClick={createHabit}
                    className="flex-1 py-2 bg-[#00C8FF] text-white text-sm font-semibold rounded-xl hover:bg-[#0099CC] transition-colors">
                    Criar hábito
                  </button>
                  <button onClick={() => setAddingHabit(false)}
                    className="px-4 py-2 text-sm text-[#64748B] hover:text-[#0A1628]">
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setAddingHabit(true)}
                className="w-full flex items-center gap-3 glass-card rounded-2xl px-4 py-3 hover:border-[#00C8FF]/40 group">
                <div className="w-7 h-7 rounded-full bg-[#E0F7FF] flex items-center justify-center group-hover:bg-[#00C8FF] transition-colors shrink-0">
                  <Plus size={14} className="text-[#00C8FF] group-hover:text-white transition-colors" />
                </div>
                <span className="text-sm text-[#64748B]">Novo hábito</span>
              </button>
            )}

            {/* Lista de todos os hábitos */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-[#E2E8F0]">
                <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                  Todos os hábitos ({allHabits.length})
                </p>
              </div>

              {allHabits.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-[#94A3B8]">Nenhum hábito criado ainda.</p>
                </div>
              ) : (
                <div className="divide-y divide-[#F1F5F9]">
                  {allHabits.map((h) => (
                    <div key={h.id} className="flex items-center gap-3 px-4 py-3">
                      <span className="text-2xl shrink-0">{h.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#0A1628]">{h.name}</p>
                        <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-full mt-0.5 ${CATEGORY_COLOR[h.category] ?? CATEGORY_COLOR.outro}`}>
                          {CATEGORY_LABELS[h.category] ?? h.category}
                        </span>
                      </div>

                      {/* Toggle ativo/inativo */}
                      <button
                        onClick={() => toggleHabitActive(h.id, h.active)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                          h.active
                            ? "bg-[#E0F7FF] text-[#00C8FF] hover:bg-red-50 hover:text-red-400"
                            : "bg-[#F1F5F9] text-[#94A3B8] hover:bg-[#E0F7FF] hover:text-[#00C8FF]"
                        }`}
                        title={h.active ? "Desativar" : "Ativar"}
                      >
                        <span className={`w-2 h-2 rounded-full ${h.active ? "bg-[#00C8FF]" : "bg-[#CBD5E1]"}`} />
                        {h.active ? "Ativo" : "Inativo"}
                      </button>

                      {/* Deletar */}
                      <button
                        onClick={() => deleteHabit(h.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-[#CBD5E1] hover:text-red-400 transition-colors"
                        title="Excluir hábito"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <p className="text-xs text-[#94A3B8] text-center pb-2">
              Hábitos inativos não aparecem no check-in diário mas mantêm o histórico.
            </p>
          </div>
        )}
      </main>
    </>
  );
}
