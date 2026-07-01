"use client";
import { useState, useEffect, useCallback } from "react";
import TopBar from "@/components/layout/TopBar";
import { BookOpen, Plus, ChevronUp, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase";
import Marquee from "@/components/ui/Marquee";

interface Study {
  id: string; title: string; author?: string; type: string;
  progress: number; total_pages?: number; status: string;
}

const statusColor: Record<string, string> = {
  em_andamento: "bg-[#E0F7FF] text-[#00C8FF]",
  concluido: "bg-green-50 text-green-600",
  pausado: "bg-gray-100 text-gray-500",
};
const statusLabel: Record<string, string> = {
  em_andamento: "Em andamento", concluido: "Concluído", pausado: "Pausado",
};

export default function EstudosPage() {
  const [items, setItems] = useState<Study[]>([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: "", author: "", type: "livro", total_pages: "" });
  const supabase = createClient();

  const load = useCallback(async () => {
    const { data } = await supabase.from("studies").select("*").order("created_at", { ascending: false });
    setItems(data ?? []);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  async function add() {
    if (!form.title.trim()) return;
    await supabase.from("studies").insert({
      title: form.title.trim(), author: form.author || null,
      type: form.type, total_pages: form.total_pages ? parseInt(form.total_pages) : null,
      started_at: new Date().toISOString().split("T")[0],
    });
    setForm({ title: "", author: "", type: "livro", total_pages: "" });
    setAdding(false);
    load();
  }

  async function updateProgress(id: string, delta: number, total: number) {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    const next = Math.max(0, Math.min(100, item.progress + delta));
    const status = next >= 100 ? "concluido" : "em_andamento";
    await supabase.from("studies").update({ progress: next, status }).eq("id", id);
    load();
  }

  const active = items.filter((i) => i.status === "em_andamento");
  const rest = items.filter((i) => i.status !== "em_andamento");

  return (
    <>
      <TopBar />
      <div className="border-b border-[#E2E8F0] py-1.5 bg-white/60 backdrop-blur-sm">
        <Marquee items={["Estudos", "Livros", "Cursos", "Aprendizado contínuo", `${active.length} em andamento`, `${items.length} no total`]} speed={35} className="text-[10px] font-semibold tracking-widest uppercase text-[#00C8FF]/50" separator="·" />
      </div>
      <main className="flex-1 p-4 lg:p-8 max-w-4xl w-full mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#E0F7FF] flex items-center justify-center">
              <BookOpen size={20} className="text-[#00C8FF]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#0A1628]">Estudos</h1>
              <p className="text-sm text-[#64748B]">{active.length} em andamento</p>
            </div>
          </div>
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#00C8FF] text-white text-sm font-semibold rounded-xl hover:bg-[#0099CC] transition-colors shadow-sm shadow-[#00C8FF]/30"
          >
            <Plus size={16} /> Adicionar
          </button>
        </div>

        {adding && (
          <div className="bg-white rounded-2xl border border-[#00C8FF] p-4 mb-5 shadow-sm space-y-3">
            <input autoFocus value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Título do livro ou curso..." className="w-full text-sm border border-[#E2E8F0] rounded-xl px-3 py-2 outline-none focus:border-[#00C8FF] bg-[#F8FAFB]" />
            <div className="flex gap-2">
              <input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })}
                placeholder="Autor (opcional)" className="flex-1 text-sm border border-[#E2E8F0] rounded-xl px-3 py-2 outline-none focus:border-[#00C8FF] bg-[#F8FAFB]" />
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="text-xs border border-[#E2E8F0] rounded-xl px-3 py-2 outline-none bg-[#F8FAFB] text-[#64748B]">
                <option value="livro">Livro</option>
                <option value="curso">Curso</option>
                <option value="podcast">Podcast</option>
                <option value="artigo">Artigo</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={add} className="flex-1 py-2 bg-[#00C8FF] text-white text-sm font-semibold rounded-xl hover:bg-[#0099CC] transition-colors">
                Salvar
              </button>
              <button onClick={() => setAdding(false)} className="px-4 text-sm text-[#64748B]">Cancelar</button>
            </div>
          </div>
        )}

        {/* Em andamento */}
        {active.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-3">Em andamento</p>
            <div className="space-y-3">
              {active.map((item) => (
                <StudyCard key={item.id} item={item} onUpdate={(d) => updateProgress(item.id, d, item.total_pages ?? 100)} />
              ))}
            </div>
          </div>
        )}

        {/* Outros */}
        {rest.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-3">Outros</p>
            <div className="space-y-3">
              {rest.map((item) => (
                <StudyCard key={item.id} item={item} onUpdate={(d) => updateProgress(item.id, d, item.total_pages ?? 100)} />
              ))}
            </div>
          </div>
        )}

        {items.length === 0 && !adding && (
          <div className="text-center py-12">
            <BookOpen size={32} className="text-[#E2E8F0] mx-auto mb-2" />
            <p className="text-sm text-[#64748B]">Nenhum estudo cadastrado</p>
          </div>
        )}
      </main>
    </>
  );
}

function StudyCard({ item, onUpdate }: { item: Study; onUpdate: (delta: number) => void }) {
  const statusColor: Record<string, string> = {
    em_andamento: "bg-[#E0F7FF] text-[#00C8FF]",
    concluido: "bg-green-50 text-green-600",
    pausado: "bg-gray-100 text-gray-500",
  };
  const statusLabel: Record<string, string> = {
    em_andamento: "Em andamento", concluido: "Concluído", pausado: "Pausado",
  };
  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 hover:border-[#B3EEFF] transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-[#0A1628]">{item.title}</p>
          {item.author && <p className="text-xs text-[#64748B] mt-0.5">{item.author}</p>}
        </div>
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${statusColor[item.status]}`}>
          {statusLabel[item.status]}
        </span>
      </div>
      <div className="mt-3">
        <div className="flex items-center justify-between text-xs text-[#64748B] mb-1">
          <span>Progresso</span>
          <span className="font-medium text-[#00C8FF]">{item.progress}%</span>
        </div>
        <div className="h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
          <div className="h-full bg-[#00C8FF] rounded-full transition-all" style={{ width: `${item.progress}%` }} />
        </div>
        <div className="flex items-center gap-2 mt-2">
          <button onClick={() => onUpdate(-10)} className="w-6 h-6 rounded-lg border border-[#E2E8F0] flex items-center justify-center hover:border-[#00C8FF] hover:text-[#00C8FF] text-[#64748B] transition-colors">
            <ChevronDown size={12} />
          </button>
          <button onClick={() => onUpdate(10)} className="w-6 h-6 rounded-lg border border-[#E2E8F0] flex items-center justify-center hover:border-[#00C8FF] hover:text-[#00C8FF] text-[#64748B] transition-colors">
            <ChevronUp size={12} />
          </button>
          <span className="text-xs text-[#94A3B8]">+/- 10%</span>
        </div>
      </div>
    </div>
  );
}
