"use client";
import { useState, useEffect, useCallback } from "react";
import TopBar from "@/components/layout/TopBar";
import { Sparkles, Plus, Trash2, Search } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Marquee from "@/components/ui/Marquee";

interface Note { id: string; content: string; created_at: string; }

export default function InsightsPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const supabase = createClient();

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("notes").select("*").eq("type", "insight")
      .order("created_at", { ascending: false });
    setNotes(data ?? []);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!text.trim()) return;
    await supabase.from("notes").insert({ content: text.trim(), type: "insight" });
    setText("");
    load();
  }

  async function remove(id: string) {
    await supabase.from("notes").delete().eq("id", id);
    load();
  }

  const filtered = notes.filter((n) => n.content.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <TopBar />
      <div className="border-b border-[#E2E8F0] py-1.5 bg-white/60 backdrop-blur-sm">
        <Marquee items={["Insights", "Reflexões", "Ideias", "Clareza mental", "Conhecimento acumulado", `${notes.length} reflexões salvas`]} speed={35} className="text-[10px] font-semibold tracking-widest uppercase text-[#00C8FF]/50" separator="·" />
      </div>
      <main className="flex-1 p-4 lg:p-8 max-w-4xl w-full mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-[#E0F7FF] flex items-center justify-center">
            <Sparkles size={20} className="text-[#00C8FF]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#0A1628]">Insights</h1>
            <p className="text-sm text-[#64748B]">{notes.length} reflexões salvas</p>
          </div>
        </div>

        {/* Nova nota */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 mb-5 shadow-sm">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Escreva um insight, reflexão ou ideia..."
            className="w-full text-sm border-none outline-none resize-none bg-transparent placeholder:text-[#94A3B8] text-[#0A1628] min-h-[80px]"
          />
          <div className="flex justify-end mt-2 pt-2 border-t border-[#E2E8F0]">
            <button
              onClick={save}
              disabled={!text.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-[#00C8FF] text-white text-sm font-semibold rounded-xl hover:bg-[#0099CC] transition-colors disabled:opacity-40"
            >
              <Plus size={14} /> Salvar insight
            </button>
          </div>
        </div>

        {/* Busca */}
        <div className="relative mb-4">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar insights..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-[#E2E8F0] rounded-xl outline-none focus:border-[#00C8FF]"
          />
        </div>

        {/* Lista */}
        <div className="space-y-3">
          {filtered.map((n) => (
            <div key={n.id} className="bg-white rounded-2xl border border-[#E2E8F0] p-4 hover:border-[#B3EEFF] transition-colors group">
              <p className="text-sm text-[#0A1628] leading-relaxed whitespace-pre-wrap">{n.content}</p>
              <div className="flex items-center justify-between mt-3">
                <span className="text-[10px] text-[#94A3B8]">
                  {format(new Date(n.created_at), "d 'de' MMM, yyyy · HH:mm", { locale: ptBR })}
                </span>
                <button
                  onClick={() => remove(n.id)}
                  className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded-lg hover:bg-red-50 text-[#94A3B8] hover:text-red-400 transition-all"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12">
              <Sparkles size={32} className="text-[#E2E8F0] mx-auto mb-2" />
              <p className="text-sm text-[#64748B]">Nenhum insight ainda</p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
