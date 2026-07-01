import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { sendToAdmin as sendMessage } from "@/lib/whatsapp";

// Lembra tarefas com prazo chegando: roda a cada 30min, avisa uma vez por tarefa
// (devido ao filtro reminder_sent=false) quando o prazo é hoje ou já passou.
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];
  const nowMinutes = (() => {
    const t = new Date().toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", hour12: false });
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  })();

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id,title,priority,due_date,due_time")
    .eq("completed", false)
    .eq("reminder_sent", false)
    .lte("due_date", today);

  if (!tasks?.length) return NextResponse.json({ ok: true, sent: 0 });

  // Tarefas atrasadas (due_date < hoje) entram direto; as de hoje só entram
  // se tiverem due_time dentro das próximas 2h, ou sem due_time definido.
  const due = tasks.filter((t) => {
    if (t.due_date < today) return true;
    if (!t.due_time) return true;
    const [h, m] = String(t.due_time).split(":").map(Number);
    const dueMinutes = h * 60 + m;
    return dueMinutes - nowMinutes <= 120;
  });

  if (!due.length) return NextResponse.json({ ok: true, sent: 0 });

  const lines = due.map((t) => {
    const overdue = t.due_date < today ? " ⚠️ atrasada" : "";
    const prio = t.priority === "alta" ? " 🔴" : "";
    return `• ${t.title}${prio}${overdue}`;
  });

  const msg = `⏰ *Prazo chegando:*\n${lines.join("\n")}`;
  await sendMessage(msg);
  await supabase.from("tasks").update({ reminder_sent: true }).in("id", due.map((t) => t.id));

  return NextResponse.json({ ok: true, sent: due.length });
}
