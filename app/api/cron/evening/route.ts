import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { sendToAdmin as sendMessage } from "@/lib/whatsapp";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  const [{ data: tasks }, { data: goals }, { data: habits }, { data: habitLogs }] = await Promise.all([
    supabase.from("tasks").select("title,completed,type").eq("type", "task"),
    supabase.from("goals").select("title,completed").eq("date", today),
    supabase.from("habits").select("id,name,icon").eq("active", true),
    supabase.from("habit_logs").select("habit_id,completed").eq("date", today),
  ]);

  const doneTasks = tasks?.filter((t) => t.completed).length ?? 0;
  const openTasks = tasks?.filter((t) => !t.completed).length ?? 0;
  const doneGoals = goals?.filter((g) => g.completed).length ?? 0;
  const totalGoals = goals?.length ?? 0;
  const doneHabitsCount = habits?.filter((h) => habitLogs?.some((l) => l.habit_id === h.id && l.completed)).length ?? 0;
  const pendGoals = goals?.filter((g) => !g.completed).map((g) => `  • ${g.title}`).join("\n");

  const msg = `🌙 *Resumo do dia, Junior!*

✅ Tarefas concluídas: ${doneTasks}
⏳ Tarefas em aberto: ${openTasks}
🎯 Metas: ${doneGoals}/${totalGoals} concluídas
🔥 Hábitos: ${doneHabitsCount}/${habits?.length ?? 0} marcados

${pendGoals ? `📋 *Metas que ficaram:*\n${pendGoals}` : "🎉 Todas as metas do dia concluídas!"}

Bom descanso! Amanhã tem mais. 💪`;

  await sendMessage(msg);
  return NextResponse.json({ ok: true, sent: true });
}
