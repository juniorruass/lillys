"use client";
import { useState, useEffect, useCallback } from "react";
import { Target, Plus, Check } from "lucide-react";
import { createClient } from "@/lib/supabase";

interface Goal { id: string; title: string; completed: boolean; }

export default function GoalsWidget({ onUpdate }: { onUpdate?: () => void }) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [newGoal, setNewGoal] = useState("");
  const [adding, setAdding] = useState(false);
  const supabase = createClient();
  const today = new Date().toISOString().split("T")[0];

  const load = useCallback(async () => {
    const { data } = await supabase.from("goals").select("*").eq("date", today).order("created_at");
    setGoals(data ?? []);
  }, [supabase, today]);

  useEffect(() => { load(); }, [load]);

  async function toggleGoal(id: string, completed: boolean) {
    await supabase.from("goals").update({ completed: !completed }).eq("id", id);
    load();
    onUpdate?.();
  }

  async function addGoal() {
    if (!newGoal.trim()) return;
    await supabase.from("goals").insert({ title: newGoal.trim(), date: today });
    setNewGoal("");
    setAdding(false);
    load();
    onUpdate?.();
  }

  const done = goals.filter((g) => g.completed).length;
  const progress = goals.length ? Math.round((done / goals.length) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-sm h-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target size={16} className="text-[#00C8FF]" />
          <h2 className="font-semibold text-[#0A1628]">Metas do dia</h2>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="w-6 h-6 flex items-center justify-center rounded-full bg-[#E0F7FF] hover:bg-[#00C8FF] hover:text-white text-[#00C8FF] transition-colors"
        >
          <Plus size={13} strokeWidth={2.5} />
        </button>
      </div>

      {/* Barra de progresso */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-[#64748B] mb-1">
          <span>{done}/{goals.length} concluídas</span>
          <span className="font-medium text-[#00C8FF]">{progress}%</span>
        </div>
        <div className="h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#00C8FF] rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {goals.map((g) => (
          <button
            key={g.id}
            onClick={() => toggleGoal(g.id, g.completed)}
            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-[#F8FAFB] transition-colors text-left group"
          >
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
              g.completed ? "bg-[#00C8FF] border-[#00C8FF]" : "border-[#E2E8F0] group-hover:border-[#00C8FF]"
            }`}>
              {g.completed && <Check size={10} strokeWidth={3} className="text-white" />}
            </div>
            <span className={`text-sm ${g.completed ? "line-through text-[#64748B]" : "text-[#0A1628]"}`}>
              {g.title}
            </span>
          </button>
        ))}
        {goals.length === 0 && !adding && (
          <p className="text-sm text-[#64748B] text-center py-4">Nenhuma meta para hoje</p>
        )}
      </div>

      {/* Input nova meta */}
      {adding && (
        <div className="mt-3 flex gap-2">
          <input
            autoFocus
            value={newGoal}
            onChange={(e) => setNewGoal(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addGoal(); if (e.key === "Escape") setAdding(false); }}
            placeholder="Nova meta..."
            className="flex-1 text-sm border border-[#E2E8F0] rounded-lg px-3 py-1.5 outline-none focus:border-[#00C8FF] bg-[#F8FAFB]"
          />
          <button onClick={addGoal} className="px-3 py-1.5 bg-[#00C8FF] text-white text-xs font-semibold rounded-lg hover:bg-[#0099CC] transition-colors">
            Salvar
          </button>
        </div>
      )}
    </div>
  );
}
