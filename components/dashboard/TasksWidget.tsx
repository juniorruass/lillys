"use client";
import { useState, useEffect, useCallback } from "react";
import { CheckSquare, Plus, Check, Clock, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase";

interface Task {
  id: string;
  title: string;
  type: "task" | "pending";
  priority: string;
  completed: boolean;
  due_date?: string;
  due_time?: string;
}

const priorityColor: Record<string, string> = {
  high: "bg-red-100 text-red-600",
  normal: "bg-[#E0F7FF] text-[#00C8FF]",
  low: "bg-gray-100 text-gray-500",
};

export default function TasksWidget({ onUpdate }: { onUpdate?: () => void }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tab, setTab] = useState<"task" | "pending">("task");
  const [adding, setAdding] = useState(false);
  const [newTask, setNewTask] = useState("");
  const [priority, setPriority] = useState("normal");
  const supabase = createClient();

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("completed", false)
      .order("created_at", { ascending: false });
    setTasks(data ?? []);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  async function toggle(id: string) {
    await supabase.from("tasks").update({ completed: true }).eq("id", id);
    load();
    onUpdate?.();
  }

  async function add() {
    if (!newTask.trim()) return;
    await supabase.from("tasks").insert({ title: newTask.trim(), type: tab, priority });
    setNewTask("");
    setAdding(false);
    load();
    onUpdate?.();
  }

  const filtered = tasks.filter((t) => t.type === tab);

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-sm">
      {/* Header + Tabs */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CheckSquare size={16} className="text-[#00C8FF]" />
          <h2 className="font-semibold text-[#0A1628]">Tarefas</h2>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="w-6 h-6 flex items-center justify-center rounded-full bg-[#E0F7FF] hover:bg-[#00C8FF] hover:text-white text-[#00C8FF] transition-colors"
        >
          <Plus size={13} strokeWidth={2.5} />
        </button>
      </div>

      <div className="flex gap-1 mb-4 bg-[#F8FAFB] p-0.5 rounded-lg">
        <button
          onClick={() => setTab("task")}
          className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-colors ${
            tab === "task" ? "bg-white text-[#0A1628] shadow-sm" : "text-[#64748B]"
          }`}
        >
          Tarefas ({tasks.filter((t) => t.type === "task").length})
        </button>
        <button
          onClick={() => setTab("pending")}
          className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-colors ${
            tab === "pending" ? "bg-white text-[#0A1628] shadow-sm" : "text-[#64748B]"
          }`}
        >
          Pendências ({tasks.filter((t) => t.type === "pending").length})
        </button>
      </div>

      {/* Lista */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {filtered.map((t) => (
          <div key={t.id} className="flex items-start gap-3 p-2.5 rounded-xl border border-[#E2E8F0] hover:border-[#B3EEFF] group transition-colors">
            <button
              onClick={() => toggle(t.id)}
              className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                "border-[#E2E8F0] group-hover:border-[#00C8FF]"
              }`}
            >
              <Check size={10} strokeWidth={3} className="text-transparent group-hover:text-[#00C8FF] transition-colors" />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[#0A1628] leading-5">{t.title}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${priorityColor[t.priority]}`}>
                  {t.priority === "high" ? "Alta" : t.priority === "low" ? "Baixa" : "Normal"}
                </span>
                {t.due_date && (
                  <span className="flex items-center gap-0.5 text-[10px] text-[#64748B]">
                    <Clock size={10} />
                    {t.due_date} {t.due_time ?? ""}
                  </span>
                )}
              </div>
            </div>
            {t.priority === "high" && (
              <AlertCircle size={14} className="text-red-400 mt-0.5 shrink-0" />
            )}
          </div>
        ))}
        {filtered.length === 0 && !adding && (
          <p className="text-sm text-[#64748B] text-center py-6">
            {tab === "task" ? "Sem tarefas abertas" : "Sem pendências"}
          </p>
        )}
      </div>

      {/* Input nova tarefa */}
      {adding && (
        <div className="mt-3 space-y-2">
          <input
            autoFocus
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") add(); if (e.key === "Escape") setAdding(false); }}
            placeholder={tab === "task" ? "Nova tarefa..." : "Nova pendência..."}
            className="w-full text-sm border border-[#E2E8F0] rounded-lg px-3 py-1.5 outline-none focus:border-[#00C8FF] bg-[#F8FAFB]"
          />
          <div className="flex items-center gap-2">
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="text-xs border border-[#E2E8F0] rounded-lg px-2 py-1 outline-none focus:border-[#00C8FF] bg-[#F8FAFB] text-[#64748B]"
            >
              <option value="low">Baixa</option>
              <option value="normal">Normal</option>
              <option value="high">Alta</option>
            </select>
            <button onClick={add} className="flex-1 px-3 py-1 bg-[#00C8FF] text-white text-xs font-semibold rounded-lg hover:bg-[#0099CC] transition-colors">
              Salvar
            </button>
            <button onClick={() => setAdding(false)} className="px-3 py-1 text-xs text-[#64748B] hover:text-[#0A1628]">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
