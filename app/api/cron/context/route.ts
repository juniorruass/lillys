import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase-server";
import { sendToAdmin } from "@/lib/whatsapp";

function getClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// Cruza agenda + tarefas em aberto e avisa proativamente quando algo relevante
// está próximo (ex: reunião chegando com tarefa relacionada ainda pendente).
// Roda a cada 15-30min. Marca events.context_notified pra não repetir aviso.
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

  const { data: events } = await supabase
    .from("events")
    .select("id,title,time,description")
    .eq("date", today)
    .eq("context_notified", false)
    .not("time", "is", null);

  const upcoming = (events ?? []).filter((e) => {
    const [h, m] = String(e.time).split(":").map(Number);
    const diff = h * 60 + m - nowMinutes;
    return diff >= 0 && diff <= 120;
  });

  if (!upcoming.length) return NextResponse.json({ ok: true, sent: 0 });

  const [{ data: tasks }, { data: projectTasks }] = await Promise.all([
    supabase.from("tasks").select("title,priority,due_date").eq("completed", false).lte("due_date", today),
    supabase.from("project_tasks").select("title,status,due_date").neq("status", "done").lte("due_date", today),
  ]);

  const context = `
Horário atual: ${Math.floor(nowMinutes / 60)}:${String(nowMinutes % 60).padStart(2, "0")}
Eventos próximos (próximas 2h): ${upcoming.map((e) => `${e.title} às ${e.time}${e.description ? ` (${e.description})` : ""}`).join("; ")}
Tarefas em aberto: ${tasks?.map((t) => `${t.title}${t.priority === "alta" ? " [urgente]" : ""}`).join(", ") || "nenhuma"}
Tarefas de projeto em aberto: ${projectTasks?.map((t) => t.title).join(", ") || "nenhuma"}
`;

  const completion = await getClient().chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 200,
    messages: [
      {
        role: "system",
        content: `Você é o assistente pessoal proativo do Junior. Com base no contexto (eventos próximos + tarefas em aberto), decida se vale a pena mandar um aviso agora. Só avise se houver algo genuinamente relevante (ex: evento chegando com tarefa relacionada pendente, ou conflito de horário). Se não valer a pena avisar, responda exatamente "SKIP". Se valer, responda só a mensagem curta e direta (sem saudação, sem frase de efeito), pronta pra mandar no WhatsApp. Formatação: negrito é *um asterisco* (nunca **dois**), sem markdown de título.`,
      },
      { role: "user", content: context },
    ],
  });

  const text = completion.choices[0].message.content?.trim() ?? "SKIP";

  await supabase.from("events").update({ context_notified: true }).in("id", upcoming.map((e) => e.id));

  if (text === "SKIP" || !text) return NextResponse.json({ ok: true, sent: 0 });

  await sendToAdmin(`🔔 ${text}`);
  return NextResponse.json({ ok: true, sent: 1 });
}
