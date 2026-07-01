import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { sendToAdmin as sendMessage } from "@/lib/whatsapp";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];
  const hour = new Date().toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });

  const [{ data: tasks }, { data: goals }, { data: habits }, { data: habitLogs }] = await Promise.all([
    supabase.from("tasks").select("title,priority,due_date").eq("completed", false).order("priority").limit(5),
    supabase.from("goals").select("title,completed").eq("date", today),
    supabase.from("habits").select("id,name,icon").eq("active", true),
    supabase.from("habit_logs").select("habit_id,completed").eq("date", today),
  ]);

  const taskLines = tasks?.slice(0, 5).map((t) => `  • ${t.title}${t.priority === "high" ? " 🔴" : ""}${t.due_date === today ? " ⚠️ hoje" : ""}`).join("\n") ?? "  Sem tarefas";
  const goalLines = goals?.map((g) => `  • ${g.title}`).join("\n") ?? "  Sem metas definidas";
  const doneHabits = habits?.filter((h) => habitLogs?.some((l) => l.habit_id === h.id && l.completed));
  const pendHabits = habits?.filter((h) => !habitLogs?.some((l) => l.habit_id === h.id && l.completed));

  const msg = `🌅 *Bom dia, Junior!* — ${hour}

📋 *Tarefas em aberto (top 5):*
${taskLines}

🎯 *Metas de hoje:*
${goalLines}

${pendHabits && pendHabits.length > 0 ? `🔲 *Hábitos pendentes:* ${pendHabits.map((h) => `${h.icon} ${h.name}`).join(", ")}` : "✅ Todos os hábitos concluídos!"}

---
_Acesse: lilly.upflu.digital_
_Comandos: tarefa: / meta hoje: / nota: / status_`;

  await sendMessage(msg);
  return NextResponse.json({ ok: true, sent: true });
}
