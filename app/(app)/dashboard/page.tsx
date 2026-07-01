"use client";
import { useState, useEffect, useCallback } from "react";
import { Plus, Check, Clock, AlertCircle, CalendarClock, Target, ListTodo, Trash2, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import FloatingOrbs from "@/components/ui/FloatingOrbs";
import Marquee from "@/components/ui/Marquee";
import { createClient } from "@/lib/supabase";
import CalendarWidget from "@/components/dashboard/CalendarWidget";

interface Task {
  id: string; title: string; type: string; priority: string;
  completed: boolean; due_date?: string; due_time?: string;
}
interface Goal { id: string; title: string; completed: boolean; }

function getGreeting(h: number) {
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export default function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [adding, setAdding] = useState(false);
  const [addForm, setAddForm] = useState({ title: "", type: "task", priority: "normal" });
  const [newGoal, setNewGoal] = useState("");
  const [addingGoal, setAddingGoal] = useState(false);
  const [now, setNow] = useState(new Date());
  const supabase = createClient();
  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  const load = useCallback(async () => {
    const [{ data: t }, { data: g }] = await Promise.all([
      supabase.from("tasks").select("*").eq("completed", false).order("created_at", { ascending: false }),
      supabase.from("goals").select("*").eq("date", today).order("created_at"),
    ]);
    setTasks(t ?? []);
    setGoals(g ?? []);
  }, [supabase, today]);

  useEffect(() => { load(); }, [load]);

  async function addTask() {
    if (!addForm.title.trim()) return;
    await supabase.from("tasks").insert({
      title: addForm.title.trim(),
      type: addForm.type,
      priority: addForm.priority,
    });
    setAddForm({ title: "", type: "task", priority: "normal" });
    setAdding(false);
    load();
  }

  async function addGoal() {
    if (!newGoal.trim()) return;
    await supabase.from("goals").insert({ title: newGoal.trim(), date: today });
    setNewGoal(""); setAddingGoal(false); load();
  }

  async function toggleTask(id: string) {
    await supabase.from("tasks").update({ completed: true }).eq("id", id);
    load();
  }

  async function deleteTask(id: string) {
    await supabase.from("tasks").delete().eq("id", id);
    load();
  }

  async function toggleGoal(id: string, completed: boolean) {
    await supabase.from("goals").update({ completed: !completed }).eq("id", id);
    load();
  }

  async function deleteGoal(id: string) {
    await supabase.from("goals").delete().eq("id", id);
    load();
  }

  const taskList = tasks.filter((t) => t.type === "task");
  const pendingList = tasks.filter((t) => t.type === "pending");
  const doneMetas = goals.filter((g) => g.completed).length;
  const progress = goals.length ? Math.round((doneMetas / goals.length) * 100) : 0;
  const dateStr = format(now, "EEEE',' d 'de' MMMM", { locale: ptBR });

  // Agenda de hoje: tarefas abertas com due_time agendadas para hoje
  const agendaHoje = [...tasks]
    .filter((t) => t.due_time && (!t.due_date || t.due_date === today))
    .sort((a, b) => (a.due_time! > b.due_time! ? 1 : -1))
    .slice(0, 5);

  const MARQUEE_STATS = [
    `${taskList.length} tarefas abertas`,
    `${pendingList.length} pendências`,
    `${doneMetas}/${goals.length} metas do dia`,
    `${progress}% concluído`,
    "Foco total",
    "Alta performance",
    "Execução",
    "Consistência",
  ];

  return (
    <div className="flex-1 overflow-y-auto pb-24 lg:pb-8">

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <div className="relative bg-gradient-to-br from-[#060F1E] via-[#0A1F3C] to-[#0D2B50] px-4 pt-6 pb-5 lg:px-8 overflow-hidden w-full">
        <FloatingOrbs parallax className="absolute inset-0" />

        <p className="relative text-[#4A7FA0] text-xs font-medium capitalize tracking-wide mb-1">{dateStr}</p>
        <h1 className="relative text-white text-xl font-bold mb-4">
          {getGreeting(now.getHours())}, Junior! <span className="text-[#00C8FF]">✦</span>
        </h1>

        <div className="relative flex gap-2 w-full">
          <div className="flex items-center gap-2 bg-white/8 rounded-xl px-3 py-2 flex-1 tilt-card">
            <ListTodo size={14} className="text-[#00C8FF] shrink-0" />
            <div>
              <p className="text-white text-lg font-bold leading-none count-up">{taskList.length}</p>
              <p className="text-[#4A7FA0] text-[10px] mt-0.5">tarefas</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white/8 rounded-xl px-3 py-2 flex-1 tilt-card">
            <Clock size={14} className="text-orange-400 shrink-0" />
            <div>
              <p className="text-white text-lg font-bold leading-none count-up">{pendingList.length}</p>
              <p className="text-[#4A7FA0] text-[10px] mt-0.5">pendências</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white/8 rounded-xl px-3 py-2 flex-1 tilt-card">
            <Target size={14} className="text-[#00C8FF] shrink-0" />
            <div>
              <p className="text-[#00C8FF] text-lg font-bold leading-none count-up">{progress}%</p>
              <p className="text-[#4A7FA0] text-[10px] mt-0.5">metas</p>
            </div>
          </div>
        </div>

        {goals.length > 0 && (
          <div className="relative mt-3">
            <div className="flex justify-between text-[10px] text-[#4A7FA0] mb-1">
              <span>Progresso do dia</span>
              <span>{doneMetas}/{goals.length} metas</span>
            </div>
            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-[#00C8FF] rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* ── Marquee ─────────────────────────────────────────────── */}
      <div className="border-b border-[#E2E8F0] py-2 bg-white/60 backdrop-blur-sm">
        <Marquee
          items={MARQUEE_STATS}
          speed={40}
          className="text-[10px] font-semibold tracking-widest uppercase text-[#00C8FF]/60"
          separator="·"
        />
      </div>

      {/* ── Conteúdo ──────────────────────────────────────────────── */}
      <div className="px-4 lg:px-8 py-5 space-y-5 w-full">

        {/* Nova tarefa */}
        {adding ? (
          <div className="bg-white border border-[#00C8FF] rounded-2xl p-4 shadow-sm space-y-3">
            <input
              autoFocus value={addForm.title}
              onChange={(e) => setAddForm({ ...addForm, title: e.target.value })}
              onKeyDown={(e) => { if (e.key === "Enter") addTask(); if (e.key === "Escape") { setAdding(false); setAddForm({ title: "", type: "task", priority: "normal" }); } }}
              placeholder="Nome da tarefa..."
              className="w-full text-sm border border-[#E2E8F0] rounded-xl px-3 py-2.5 outline-none focus:border-[#00C8FF] bg-[#F8FAFB]"
            />
            <div className="flex gap-2">
              <select value={addForm.type} onChange={(e) => setAddForm({ ...addForm, type: e.target.value })}
                className="flex-1 text-xs border border-[#E2E8F0] rounded-xl px-3 py-2 outline-none bg-[#F8FAFB] text-[#64748B]">
                <option value="task">Tarefa</option>
                <option value="pending">Pendência</option>
              </select>
              <select value={addForm.priority} onChange={(e) => setAddForm({ ...addForm, priority: e.target.value })}
                className="flex-1 text-xs border border-[#E2E8F0] rounded-xl px-3 py-2 outline-none bg-[#F8FAFB] text-[#64748B]">
                <option value="high">Alta prioridade</option>
                <option value="normal">Normal</option>
                <option value="low">Baixa</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={addTask}
                className="flex-1 py-2 bg-[#00C8FF] text-white text-sm font-semibold rounded-xl hover:bg-[#0099CC] transition-colors">
                Salvar
              </button>
              <button
                onClick={() => { setAdding(false); setAddForm({ title: "", type: "task", priority: "normal" }); }}
                className="px-4 py-2 text-sm text-[#64748B] hover:text-[#0A1628]">
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="w-full flex items-center gap-3 glass-card rounded-2xl px-4 py-3 hover:border-[#00C8FF]/40 group"
          >
            <div className="w-7 h-7 rounded-full bg-[#E0F7FF] flex items-center justify-center group-hover:bg-[#00C8FF] transition-colors shrink-0">
              <Plus size={14} className="text-[#00C8FF] group-hover:text-white transition-colors" />
            </div>
            <span className="text-sm text-[#64748B]">Nova tarefa</span>
            <span className="ml-auto text-xs text-[#C4D4E0]">Adicionar ao dia</span>
          </button>
        )}

        {/* Metas do dia */}
        <section>
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-sm font-semibold text-[#0A1628]">Metas do dia</h2>
            <button onClick={() => setAddingGoal(true)} className="text-xs text-[#00C8FF] hover:text-[#0099CC] font-medium">+ Adicionar</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {goals.map((g) => (
              <div
                key={g.id}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-all group/chip ${
                  g.completed
                    ? "bg-[#00C8FF] border-[#00C8FF] text-white shadow-sm shadow-[#00C8FF]/30"
                    : "bg-white border-[#E2E8F0] text-[#374151] hover:border-[#00C8FF]"
                }`}
              >
                <button onClick={() => toggleGoal(g.id, g.completed)} className="flex items-center gap-1.5">
                  {g.completed && <Check size={11} strokeWidth={3} />}
                  {g.title}
                </button>
                <button onClick={() => deleteGoal(g.id)}
                  className="opacity-0 group-hover/chip:opacity-100 ml-0.5 hover:text-red-400 transition-all">
                  <X size={10} />
                </button>
              </div>
            ))}
            {goals.length === 0 && !addingGoal && (
              <button onClick={() => setAddingGoal(true)}
                className="px-3 py-1.5 rounded-full text-xs border border-dashed border-[#C4D4E0] text-[#94A3B8] hover:border-[#00C8FF] hover:text-[#00C8FF] transition-colors">
                + Exercício, Leitura...
              </button>
            )}
          </div>
          {addingGoal && (
            <div className="mt-2 flex gap-2">
              <input autoFocus value={newGoal}
                onChange={(e) => setNewGoal(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addGoal(); if (e.key === "Escape") setAddingGoal(false); }}
                placeholder="Ex: Exercício, Água..."
                className="flex-1 text-sm border border-[#E2E8F0] rounded-xl px-3 py-2 outline-none focus:border-[#00C8FF] bg-white"
              />
              <button onClick={addGoal} className="px-3 py-2 bg-[#00C8FF] text-white text-xs font-semibold rounded-xl">OK</button>
            </div>
          )}
        </section>

        {/* Calendário semanal */}
        <CalendarWidget />

        {/* Agenda de hoje — baseada em tarefas com horário definido */}
        {agendaHoje.length > 0 && (
          <section>
            <div className="flex items-center gap-1.5 mb-2.5">
              <CalendarClock size={13} className="text-[#00C8FF]" />
              <h2 className="text-sm font-semibold text-[#0A1628]">Agenda de hoje</h2>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {agendaHoje.map((t) => (
                <div key={t.id} className="glass-card tilt-card px-4 py-2.5 shrink-0">
                  <p className="text-sm font-bold text-[#0A1628]">{t.due_time}</p>
                  <p className="text-[11px] text-[#64748B] truncate max-w-[130px]">{t.title}</p>
                  {t.priority === "high" && (
                    <p className="text-[10px] text-red-400 font-medium mt-0.5">Alta prioridade</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Tarefas de hoje */}
        <section>
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-sm font-semibold text-[#0A1628]">
              Tarefas de hoje
              {taskList.length > 0 && <span className="ml-2 text-xs font-normal text-[#94A3B8]">{taskList.length} abertas</span>}
            </h2>
          </div>
          <div className="space-y-1.5">
            {taskList.map((t) => (
              <div key={t.id} className="flex items-center gap-3 glass-card rounded-xl px-3.5 py-3 group">
                <button
                  onClick={() => toggleTask(t.id)}
                  className="w-5 h-5 rounded-full border-2 border-[#E2E8F0] hover:border-[#00C8FF] flex items-center justify-center shrink-0 transition-colors"
                >
                  <Check size={10} strokeWidth={3} className="text-transparent hover:text-[#00C8FF]" />
                </button>
                <span className="flex-1 text-sm text-[#1E293B] cursor-pointer" onClick={() => toggleTask(t.id)}>{t.title}</span>
                {t.priority === "high" && <AlertCircle size={13} className="text-red-400 shrink-0" />}
                {t.due_time && <span className="text-[10px] text-[#94A3B8] shrink-0">{t.due_time}</span>}
                <button
                  onClick={() => deleteTask(t.id)}
                  className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded-lg hover:bg-red-50 text-[#C4D4E0] hover:text-red-400 transition-all shrink-0"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            {taskList.length === 0 && (
              <div className="text-center py-10 text-sm text-[#94A3B8]">
                <p className="text-2xl mb-2">🎉</p>
                Sem tarefas — dia livre!
              </div>
            )}
          </div>
        </section>

        {/* Pendências */}
        {pendingList.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-[#0A1628] mb-2.5">
              Pendências <span className="ml-1 text-xs font-normal text-[#94A3B8]">{pendingList.length}</span>
            </h2>
            <div className="space-y-1.5">
              {pendingList.map((t) => (
                <div key={t.id} className="flex items-center gap-3 glass-card rounded-xl px-3.5 py-3 group border border-orange-200/60">
                  <button
                    onClick={() => toggleTask(t.id)}
                    className="w-5 h-5 rounded-full border-2 border-orange-200 hover:border-orange-400 flex items-center justify-center shrink-0 transition-colors"
                  />
                  <span className="flex-1 text-sm text-[#1E293B]">{t.title}</span>
                  <button
                    onClick={() => deleteTask(t.id)}
                    className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded-lg hover:bg-red-50 text-[#C4D4E0] hover:text-red-400 transition-all shrink-0"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
