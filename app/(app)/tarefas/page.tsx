"use client";
import { useState, useEffect, useCallback } from "react";
import TopBar from "@/components/layout/TopBar";
import { CheckSquare, Plus, Check, Trash2, Clock, Filter, CalendarPlus, X } from "lucide-react";
import { createClient } from "@/lib/supabase";
import Marquee from "@/components/ui/Marquee";

interface Task {
  id: string; title: string; type: string; priority: string;
  completed: boolean; due_date?: string; due_time?: string; created_at: string;
}

const priorityLabel: Record<string, string> = { high: "Alta", normal: "Normal", low: "Baixa" };
const priorityColor: Record<string, string> = {
  high: "bg-red-50 text-red-600 border-red-200",
  normal: "bg-[#E0F7FF] text-[#00C8FF] border-[#B3EEFF]",
  low: "bg-gray-50 text-gray-500 border-gray-200",
};

export default function TarefasPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<"all" | "task" | "pending">("all");
  const [showCompleted, setShowCompleted] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: "", type: "task", priority: "normal", due_date: "", due_time: "" });
  const [schedulingTask, setSchedulingTask] = useState<string | null>(null);
  const [scheduleForm, setScheduleForm] = useState({ date: "", time: "" });
  const supabase = createClient();

  const load = useCallback(async () => {
    const q = supabase.from("tasks").select("*").order("created_at", { ascending: false });
    const { data } = await q;
    setTasks(data ?? []);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  async function toggle(id: string, completed: boolean) {
    await supabase.from("tasks").update({ completed: !completed }).eq("id", id);
    load();
  }

  async function remove(id: string) {
    await supabase.from("tasks").delete().eq("id", id);
    load();
  }

  async function confirmSchedule(task: Task) {
    if (!scheduleForm.date) return;
    await supabase.from("tasks").update({ due_date: scheduleForm.date, due_time: scheduleForm.time || null }).eq("id", task.id);
    await fetch("/api/calendar/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: task.title, date: scheduleForm.date, time: scheduleForm.time || null, type: task.type }),
    });
    setSchedulingTask(null);
    load();
  }

  async function add() {
    if (!form.title.trim()) return;
    await supabase.from("tasks").insert({
      title: form.title.trim(), type: form.type, priority: form.priority,
      due_date: form.due_date || null, due_time: form.due_time || null,
    });
    setForm({ title: "", type: "task", priority: "normal", due_date: "", due_time: "" });
    setAdding(false);
    load();
  }

  const filtered = tasks.filter((t) => {
    if (!showCompleted && t.completed) return false;
    if (filter === "task") return t.type === "task";
    if (filter === "pending") return t.type === "pending";
    return true;
  });

  const open = tasks.filter((t) => !t.completed);
  const done = tasks.filter((t) => t.completed);

  const marqueeItems = [
    `${open.filter(t=>t.type==="task").length} tarefas abertas`,
    `${open.filter(t=>t.type==="pending").length} pendências`,
    `${done.length} concluídas`,
    "Foco", "Execução", "Disciplina", "Consistência", "Alta Performance",
  ];

  return (
    <>
      <TopBar summary={{ tasks: open.filter(t=>t.type==="task").length, pending: open.filter(t=>t.type==="pending").length, goals: 0 }} />
      <div className="border-b border-[#E2E8F0] py-1.5 bg-white/60 backdrop-blur-sm">
        <Marquee items={marqueeItems} speed={35} className="text-[10px] font-semibold tracking-widest uppercase text-[#00C8FF]/50" separator="·" />
      </div>
      <main className="flex-1 p-4 lg:p-8 max-w-4xl w-full mx-auto">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-[#0A1628]">Tarefas & Pendências</h1>
            <p className="text-sm text-[#64748B]">{open.length} em aberto · {done.length} concluídas</p>
          </div>
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#00C8FF] text-white text-sm font-semibold rounded-xl hover:bg-[#0099CC] transition-colors shadow-sm shadow-[#00C8FF]/30"
          >
            <Plus size={16} /> Nova
          </button>
        </div>

        {/* Filtros */}
        <div className="flex items-center gap-2 mb-4">
          {(["all","task","pending"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                filter === f ? "bg-[#00C8FF] text-white" : "bg-white border border-[#E2E8F0] text-[#64748B] hover:border-[#00C8FF]"
              }`}
            >
              {f === "all" ? "Todos" : f === "task" ? "Tarefas" : "Pendências"}
            </button>
          ))}
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className={`ml-auto text-xs font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${
              showCompleted ? "bg-[#E0F7FF] text-[#00C8FF]" : "bg-white border border-[#E2E8F0] text-[#64748B]"
            }`}
          >
            <Filter size={11} /> Concluídas
          </button>
        </div>

        {/* Formulário nova tarefa */}
        {adding && (
          <div className="bg-white border border-[#00C8FF] rounded-2xl p-4 mb-4 space-y-3 shadow-sm">
            <input
              autoFocus
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              onKeyDown={(e) => { if (e.key === "Enter") add(); if (e.key === "Escape") setAdding(false); }}
              placeholder="Título da tarefa..."
              className="w-full text-sm border border-[#E2E8F0] rounded-xl px-3 py-2 outline-none focus:border-[#00C8FF] bg-[#F8FAFB]"
            />
            <div className="flex gap-2">
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="flex-1 text-xs border border-[#E2E8F0] rounded-lg px-2 py-1.5 outline-none bg-[#F8FAFB] text-[#64748B]">
                <option value="task">Tarefa</option>
                <option value="pending">Pendência</option>
              </select>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="flex-1 text-xs border border-[#E2E8F0] rounded-lg px-2 py-1.5 outline-none bg-[#F8FAFB] text-[#64748B]">
                <option value="low">Baixa</option>
                <option value="normal">Normal</option>
                <option value="high">Alta</option>
              </select>
            </div>
            <div className="flex gap-2">
              <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                className="flex-1 text-xs border border-[#E2E8F0] rounded-lg px-2 py-1.5 outline-none bg-[#F8FAFB] text-[#64748B]" />
              <input type="time" value={form.due_time} onChange={(e) => setForm({ ...form, due_time: e.target.value })}
                className="flex-1 text-xs border border-[#E2E8F0] rounded-lg px-2 py-1.5 outline-none bg-[#F8FAFB] text-[#64748B]" />
            </div>
            <div className="flex gap-2">
              <button onClick={add} className="flex-1 py-2 bg-[#00C8FF] text-white text-sm font-semibold rounded-xl hover:bg-[#0099CC] transition-colors">
                Salvar
              </button>
              <button onClick={() => setAdding(false)} className="px-4 py-2 text-sm text-[#64748B] hover:text-[#0A1628]">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Lista */}
        <div className="space-y-2">
          {filtered.map((t) => (
            <div key={t.id} className={`flex items-start gap-3 p-3 rounded-xl transition-all ${
              t.completed ? "opacity-50 glass-soft" : "glass-card"
            }`}>
              <button onClick={() => toggle(t.id, t.completed)}
                className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                  t.completed ? "bg-[#00C8FF] border-[#00C8FF]" : "border-[#E2E8F0] hover:border-[#00C8FF]"
                }`}>
                {t.completed && <Check size={10} strokeWidth={3} className="text-white" />}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${t.completed ? "line-through text-[#94A3B8]" : "text-[#0A1628]"}`}>{t.title}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${priorityColor[t.priority]}`}>
                    {priorityLabel[t.priority]}
                  </span>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${
                    t.type === "task" ? "bg-[#E0F7FF] text-[#00C8FF] border-[#B3EEFF]" : "bg-orange-50 text-orange-600 border-orange-200"
                  }`}>
                    {t.type === "task" ? "Tarefa" : "Pendência"}
                  </span>
                  {t.due_date && (
                    <span className="flex items-center gap-0.5 text-[10px] text-[#64748B]">
                      <Clock size={10} /> {t.due_date} {t.due_time ?? ""}
                    </span>
                  )}
                </div>
                {schedulingTask === t.id && (
                  <div className="mt-2 space-y-1.5">
                    <div className="flex gap-1">
                      <input autoFocus type="date" value={scheduleForm.date}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, date: e.target.value })}
                        className="flex-1 text-xs border border-[#00C8FF] rounded-lg px-2 py-1.5 outline-none bg-white" />
                      <input type="time" value={scheduleForm.time}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, time: e.target.value })}
                        className="flex-1 text-xs border border-[#00C8FF] rounded-lg px-2 py-1.5 outline-none bg-white" />
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => confirmSchedule(t)}
                        className="flex-1 py-1 bg-[#00C8FF] text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1">
                        <Check size={10} /> Agendar e notificar
                      </button>
                      <button onClick={() => setSchedulingTask(null)} className="w-7 flex items-center justify-center text-[#64748B] border border-[#E2E8F0] rounded-lg">
                        <X size={10} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <button onClick={() => { setSchedulingTask(t.id); setScheduleForm({ date: t.due_date ?? "", time: t.due_time?.slice(0,5) ?? "" }); }}
                className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-[#E0F7FF] text-[#64748B] hover:text-[#00C8FF] transition-colors">
                <CalendarPlus size={13} />
              </button>
              <button onClick={() => remove(t.id)} className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-red-50 text-[#64748B] hover:text-red-400 transition-colors">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12">
              <CheckSquare size={32} className="text-[#E2E8F0] mx-auto mb-2" />
              <p className="text-sm text-[#64748B]">Nenhuma tarefa aqui</p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
