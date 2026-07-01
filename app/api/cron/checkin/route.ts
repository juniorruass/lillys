import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { sendToAdmin as sendMessage } from "@/lib/whatsapp";

// Check-in do meio do dia — roda uma vez, ~13h horário de Brasília
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  const [{ data: tasks }, { data: goals }] = await Promise.all([
    supabase.from("tasks").select("completed").eq("type", "task"),
    supabase.from("goals").select("completed").eq("date", today),
  ]);

  const doneTasks = tasks?.filter((t) => t.completed).length ?? 0;
  const openTasks = tasks?.filter((t) => !t.completed).length ?? 0;
  const doneGoals = goals?.filter((g) => g.completed).length ?? 0;
  const totalGoals = goals?.length ?? 0;

  const msg = `👋 Como tá indo o dia?\n\n📋 ${doneTasks} concluídas, ${openTasks} em aberto\n🎯 Metas: ${doneGoals}/${totalGoals}\n\nManda um "status" se quiser o resumo completo.`;

  await sendMessage(msg);
  return NextResponse.json({ ok: true, sent: true });
}
