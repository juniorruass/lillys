"use client";
import { useState, useEffect, useCallback } from "react";
import TopBar from "@/components/layout/TopBar";
import { Briefcase, Plus, ChevronLeft, ChevronRight, Pencil, Trash2, Check, X, CalendarPlus } from "lucide-react";
import { createClient } from "@/lib/supabase";
import Marquee from "@/components/ui/Marquee";

interface Project { id: string; name: string; description?: string; status: string; color: string; order_index: number; }
interface PTask { id: string; project_id: string; title: string; status: string; order: number; due_date?: string | null; due_time?: string | null; }

const COLS = [
  { key: "todo",  label: "A Fazer",      bg: "bg-slate-50",  border: "border-slate-200" },
  { key: "doing", label: "Em Andamento", bg: "bg-blue-50",   border: "border-blue-200"  },
  { key: "done",  label: "Concluído",    bg: "bg-green-50",  border: "border-green-200" },
];
const COL_KEYS = COLS.map((c) => c.key);

export default function ProjetosPage() {
  const [projects, setProjects]     = useState<Project[]>([]);
  const [tasks, setTasks]           = useState<PTask[]>([]);
  const [activeProject, setActive]  = useState<string | null>(null);
  const [addingProject, setAddProj] = useState(false);
  const [addingTask, setAddTask]    = useState<string | null>(null);
  const [projectForm, setProjForm]  = useState({ name: "", description: "", color: "#00C8FF" });
  const [taskTitle, setTaskTitle]   = useState("");
  const [editingTask, setEditTask]  = useState<string | null>(null);
  const [editTitle, setEditTitle]   = useState("");
  const [draggedId, setDraggedId]   = useState<string | null>(null);
  const [schedulingTask, setSchedulingTask] = useState<string | null>(null);
  const [scheduleForm, setScheduleForm] = useState({ date: "", time: "" });
  const supabase = createClient();

  const load = useCallback(async () => {
    const [{ data: p }, { data: t }] = await Promise.all([
      supabase.from("projects").select("*").eq("status", "ativo").order("order_index"),
      supabase.from("project_tasks").select("*").order("order"),
    ]);
    const ps = p ?? [];
    setProjects(ps);
    setTasks(t ?? []);
    if (!activeProject && ps.length > 0) setActive(ps[0].id);
  }, [supabase, activeProject]);

  useEffect(() => { load(); }, [load]);

  async function addProject() {
    if (!projectForm.name.trim()) return;
    await supabase.from("projects").insert({ name: projectForm.name, description: projectForm.description, color: projectForm.color });
    setProjForm({ name: "", description: "", color: "#00C8FF" });
    setAddProj(false);
    load();
  }

  async function addTask(col: string) {
    if (!taskTitle.trim() || !activeProject) return;
    await supabase.from("project_tasks").insert({ project_id: activeProject, title: taskTitle.trim(), status: col });
    setTaskTitle(""); setAddTask(null);
    load();
  }

  async function moveTask(id: string, dir: "prev" | "next") {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const idx = COL_KEYS.indexOf(task.status);
    const nextIdx = dir === "next" ? idx + 1 : idx - 1;
    if (nextIdx < 0 || nextIdx >= COL_KEYS.length) return;
    await supabase.from("project_tasks").update({ status: COL_KEYS[nextIdx] }).eq("id", id);
    load();
  }

  async function saveEditTask(id: string) {
    if (!editTitle.trim()) return;
    await supabase.from("project_tasks").update({ title: editTitle.trim() }).eq("id", id);
    setEditTask(null);
    load();
  }

  async function deleteTask(id: string) {
    await supabase.from("project_tasks").delete().eq("id", id);
    load();
  }

  async function deleteProject(id: string) {
    await supabase.from("project_tasks").delete().eq("project_id", id);
    await supabase.from("projects").update({ status: "arquivado" }).eq("id", id);
    if (activeProject === id) setActive(null);
    load();
  }

  async function reorderProjects(targetId: string) {
    if (!draggedId || draggedId === targetId) return;
    const reordered = [...projects];
    const fromIdx = reordered.findIndex((p) => p.id === draggedId);
    const toIdx = reordered.findIndex((p) => p.id === targetId);
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    setProjects(reordered);
    setDraggedId(null);
    await Promise.all(reordered.map((p, i) => supabase.from("projects").update({ order_index: i }).eq("id", p.id)));
  }

  async function confirmSchedule(task: PTask) {
    if (!scheduleForm.date) return;
    await supabase.from("project_tasks").update({ due_date: scheduleForm.date, due_time: scheduleForm.time || null }).eq("id", task.id);
    await fetch("/api/calendar/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: task.title, date: scheduleForm.date, time: scheduleForm.time || null, type: "task" }),
    });
    setSchedulingTask(null);
    load();
  }

  const currentTasks = tasks.filter((t) => t.project_id === activeProject);

  const projMarquee = [
    `${projects.length} projetos ativos`,
    `${currentTasks.filter(t=>t.status==="doing").length} em andamento`,
    `${currentTasks.filter(t=>t.status==="done").length} concluídas`,
    "Kanban", "Projetos", "Gestão", "Execução", "Foco", "Resultados",
  ];

  return (
    <>
      <TopBar />
      <div className="border-b border-[#E2E8F0] py-1.5 bg-white/60 backdrop-blur-sm">
        <Marquee items={projMarquee} speed={35} className="text-[10px] font-semibold tracking-widest uppercase text-[#00C8FF]/50" separator="·" />
      </div>
      <main className="flex-1 p-4 lg:p-6 max-w-5xl w-full mx-auto">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#E0F7FF] flex items-center justify-center">
              <Briefcase size={20} className="text-[#00C8FF]" />
            </div>
            <h1 className="text-xl font-bold text-[#0A1628]">Projetos</h1>
          </div>
          <button onClick={() => setAddProj(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#00C8FF] text-white text-sm font-semibold rounded-xl hover:bg-[#0099CC] transition-colors shadow-sm shadow-[#00C8FF]/30">
            <Plus size={16} /> Novo projeto
          </button>
        </div>

        {/* Formulário novo projeto */}
        {addingProject && (
          <div className="bg-white rounded-2xl border border-[#00C8FF] p-4 mb-5 shadow-sm space-y-3">
            <input autoFocus value={projectForm.name} onChange={(e) => setProjForm({ ...projectForm, name: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && addProject()}
              placeholder="Nome do projeto"
              className="w-full text-sm border border-[#E2E8F0] rounded-xl px-3 py-2 outline-none focus:border-[#00C8FF] bg-[#F8FAFB]" />
            <input value={projectForm.description} onChange={(e) => setProjForm({ ...projectForm, description: e.target.value })}
              placeholder="Descrição (opcional)"
              className="w-full text-sm border border-[#E2E8F0] rounded-xl px-3 py-2 outline-none focus:border-[#00C8FF] bg-[#F8FAFB]" />
            <div className="flex gap-2">
              <button onClick={addProject} className="flex-1 py-2 bg-[#00C8FF] text-white text-sm font-semibold rounded-xl hover:bg-[#0099CC]">Criar</button>
              <button onClick={() => setAddProj(false)} className="px-4 text-sm text-[#64748B]">Cancelar</button>
            </div>
          </div>
        )}

        {/* Seletor de projetos (arraste para reordenar) */}
        {projects.length > 0 && (
          <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
            {projects.map((p) => (
              <div key={p.id} className="flex-shrink-0 flex items-center gap-1 group"
                draggable
                onDragStart={() => setDraggedId(p.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => reorderProjects(p.id)}
                onDragEnd={() => setDraggedId(null)}>
                <button onClick={() => setActive(p.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-sm font-medium transition-colors cursor-grab active:cursor-grabbing ${
                    draggedId === p.id ? "opacity-40" : ""
                  } ${
                    activeProject === p.id
                      ? "border-[#00C8FF] bg-[#E0F7FF] text-[#00C8FF]"
                      : "border-[#E2E8F0] bg-white text-[#64748B] hover:border-[#B3EEFF]"
                  }`}>
                  <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                  {p.name}
                </button>
                <button onClick={() => deleteProject(p.id)}
                  className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded-md hover:bg-red-50 text-[#94A3B8] hover:text-red-400 transition-all">
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Kanban */}
        {activeProject ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {COLS.map((col, colIdx) => {
              const colTasks = currentTasks.filter((t) => t.status === col.key);
              return (
                <div key={col.key} className={`${col.bg} rounded-2xl border ${col.border} p-3`}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">{col.label}</p>
                    <span className="text-[10px] bg-white border border-[#E2E8F0] text-[#64748B] px-2 py-0.5 rounded-full">{colTasks.length}</span>
                  </div>

                  <div className="space-y-2 min-h-[80px]">
                    {colTasks.map((t) => (
                      <div key={t.id} className="bg-white rounded-xl border border-[#E2E8F0] p-3 shadow-sm group">
                        {editingTask === t.id ? (
                          <div className="space-y-1.5">
                            <input autoFocus value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter") saveEditTask(t.id); if (e.key === "Escape") setEditTask(null); }}
                              className="w-full text-xs border border-[#00C8FF] rounded-lg px-2 py-1.5 outline-none bg-white" />
                            <div className="flex gap-1">
                              <button onClick={() => saveEditTask(t.id)}
                                className="flex-1 py-1 bg-[#00C8FF] text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1">
                                <Check size={10} /> Salvar
                              </button>
                              <button onClick={() => setEditTask(null)} className="w-7 flex items-center justify-center text-[#64748B] border border-[#E2E8F0] rounded-lg">
                                <X size={10} />
                              </button>
                            </div>
                          </div>
                        ) : schedulingTask === t.id ? (
                          <div className="space-y-1.5">
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
                        ) : (
                          <>
                            <p className="text-sm text-[#0A1628] leading-tight">{t.title}</p>
                            {t.due_date && (
                              <p className="text-[10px] text-[#00C8FF] mt-1">
                                📅 {new Date(`${t.due_date}T00:00:00`).toLocaleDateString("pt-BR")}{t.due_time ? ` às ${t.due_time.slice(0,5)}` : ""}
                              </p>
                            )}
                            <div className="flex items-center justify-between mt-2">
                              {/* setas de mover */}
                              <div className="flex gap-1">
                                <button onClick={() => moveTask(t.id, "prev")} disabled={colIdx === 0}
                                  className={`w-6 h-6 rounded-lg border flex items-center justify-center text-[#64748B] transition-all ${
                                    colIdx === 0
                                      ? "opacity-20 cursor-not-allowed border-[#E2E8F0]"
                                      : "hover:bg-[#E0F7FF] hover:text-[#00C8FF] hover:border-[#00C8FF] border-[#E2E8F0]"
                                  }`}>
                                  <ChevronLeft size={12} />
                                </button>
                                <button onClick={() => moveTask(t.id, "next")} disabled={colIdx === COLS.length - 1}
                                  className={`w-6 h-6 rounded-lg border flex items-center justify-center text-[#64748B] transition-all ${
                                    colIdx === COLS.length - 1
                                      ? "opacity-20 cursor-not-allowed border-[#E2E8F0]"
                                      : "hover:bg-[#E0F7FF] hover:text-[#00C8FF] hover:border-[#00C8FF] border-[#E2E8F0]"
                                  }`}>
                                  <ChevronRight size={12} />
                                </button>
                              </div>
                              {/* ações */}
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => { setSchedulingTask(t.id); setScheduleForm({ date: t.due_date ?? "", time: t.due_time?.slice(0,5) ?? "" }); }}
                                  className="w-6 h-6 rounded-lg hover:bg-[#E0F7FF] flex items-center justify-center text-[#94A3B8] hover:text-[#00C8FF] transition-colors">
                                  <CalendarPlus size={10} />
                                </button>
                                <button onClick={() => { setEditTask(t.id); setEditTitle(t.title); }}
                                  className="w-6 h-6 rounded-lg hover:bg-[#E0F7FF] flex items-center justify-center text-[#94A3B8] hover:text-[#00C8FF] transition-colors">
                                  <Pencil size={10} />
                                </button>
                                <button onClick={() => deleteTask(t.id)}
                                  className="w-6 h-6 rounded-lg hover:bg-red-50 flex items-center justify-center text-[#94A3B8] hover:text-red-400 transition-colors">
                                  <Trash2 size={10} />
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Adicionar tarefa */}
                  {addingTask === col.key ? (
                    <div className="mt-2 space-y-1.5">
                      <input autoFocus value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") addTask(col.key); if (e.key === "Escape") setAddTask(null); }}
                        placeholder="Título da tarefa..."
                        className="w-full text-xs border border-[#E2E8F0] rounded-lg px-2 py-1.5 outline-none focus:border-[#00C8FF] bg-white" />
                      <div className="flex gap-1">
                        <button onClick={() => addTask(col.key)} className="flex-1 py-1 bg-[#00C8FF] text-white text-xs font-semibold rounded-lg">Adicionar</button>
                        <button onClick={() => setAddTask(null)} className="w-7 flex items-center justify-center text-[#64748B] border border-[#E2E8F0] rounded-lg bg-white">
                          <X size={10} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => { setAddTask(col.key); setTaskTitle(""); }}
                      className="mt-2 w-full flex items-center gap-1.5 text-xs text-[#94A3B8] hover:text-[#00C8FF] transition-colors py-1.5">
                      <Plus size={12} /> Adicionar
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <Briefcase size={40} className="text-[#E2E8F0] mx-auto mb-3" />
            <p className="text-sm text-[#64748B] mb-4">Crie um projeto para começar</p>
            <button onClick={() => setAddProj(true)} className="text-sm text-[#00C8FF] font-semibold hover:text-[#0099CC]">
              + Novo projeto
            </button>
          </div>
        )}
      </main>
    </>
  );
}
