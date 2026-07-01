"use client";
import { useState, useEffect, useCallback } from "react";
import { Zap, Save } from "lucide-react";
import { createClient } from "@/lib/supabase";

interface Note { id: string; content: string; created_at: string; }

export default function QuickNote() {
  const [text, setText] = useState("");
  const [notes, setNotes] = useState<Note[]>([]);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("notes")
      .select("*")
      .eq("type", "quick")
      .order("created_at", { ascending: false })
      .limit(5);
    setNotes(data ?? []);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!text.trim()) return;
    setSaving(true);
    await supabase.from("notes").insert({ content: text.trim(), type: "quick" });
    setText("");
    load();
    setSaving(false);
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-sm h-full flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <Zap size={16} className="text-[#00C8FF]" />
        <h2 className="font-semibold text-[#0A1628]">Nota rápida</h2>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && e.metaKey) save(); }}
        placeholder="Capturar ideia, lembrança... (⌘+Enter para salvar)"
        className="flex-1 w-full text-sm border border-[#E2E8F0] rounded-xl p-3 outline-none focus:border-[#00C8FF] bg-[#F8FAFB] resize-none placeholder:text-[#94A3B8] min-h-[100px]"
      />

      <button
        onClick={save}
        disabled={!text.trim() || saving}
        className="mt-2 flex items-center justify-center gap-2 w-full py-2 bg-[#00C8FF] text-white text-sm font-semibold rounded-xl hover:bg-[#0099CC] transition-colors disabled:opacity-40"
      >
        <Save size={14} />
        Salvar
      </button>

      {/* Notas recentes */}
      {notes.length > 0 && (
        <div className="mt-3 space-y-1.5">
          <p className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">Recentes</p>
          {notes.slice(0, 3).map((n) => (
            <div key={n.id} className="text-xs text-[#64748B] bg-[#F8FAFB] rounded-lg px-2 py-1.5 line-clamp-2">
              {n.content}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
