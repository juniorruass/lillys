import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase-server";

function getClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export async function POST(req: NextRequest) {
  const { type, question } = await req.json();
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  // Buscar contexto do usuário
  const [{ data: tasks }, { data: goals }, { data: habits }, { data: habitLogs }] = await Promise.all([
    supabase.from("tasks").select("title,type,priority,completed,due_date").eq("completed", false).limit(20),
    supabase.from("goals").select("title,completed").eq("date", today),
    supabase.from("habits").select("id,name").eq("active", true),
    supabase.from("habit_logs").select("habit_id,completed").eq("date", today),
  ]);

  const context = `
Hoje é ${today}.
Tarefas em aberto: ${tasks?.map((t) => `[${t.priority}] ${t.title}${t.due_date ? ` (vence: ${t.due_date})` : ""}`).join(", ") || "nenhuma"}
Metas do dia: ${goals?.map((g) => `${g.title} (${g.completed ? "concluída" : "pendente"})`).join(", ") || "nenhuma"}
Hábitos hoje: ${habits?.map((h) => {
    const done = habitLogs?.some((l) => l.habit_id === h.id && l.completed);
    return `${h.name}: ${done ? "✓" : "✗"}`;
  }).join(", ") || "nenhum"}
`;

  if (type === "daily") {
    const msg = await getClient().chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 600,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: `Você é o assistente pessoal do Junior. Baseado no contexto do dia dele, gere um briefing em JSON com os campos: greeting, summary, focus, insight, suggestion. Seja direto, motivador mas sem elogios forçados. Use linguagem informal mas profissional. Responda APENAS com JSON válido.` },
        { role: "user", content: `Contexto:\n${context}\n\nGere o briefing JSON.` },
      ],
    });
    try {
      const text = msg.choices[0].message.content ?? "";
      const json = JSON.parse(text);
      return NextResponse.json(json);
    } catch {
      return NextResponse.json({
        greeting: `Bom dia, Junior!`,
        summary: context,
        focus: tasks?.[0]?.title ?? "Sem tarefas urgentes",
        insight: "Mantenha o foco no que gera resultado.",
        suggestion: "Comece pela tarefa mais importante do dia.",
      });
    }
  }

  if (type === "question") {
    const msg = await getClient().chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 400,
      messages: [
        { role: "system", content: `Você é o assistente pessoal do Junior. Responda de forma direta e útil com base no contexto do dia. Sem enrolação.` },
        { role: "user", content: `Contexto:\n${context}\n\nPergunta: ${question}` },
      ],
    });
    return NextResponse.json({ answer: msg.choices[0].message.content ?? "" });
  }

  return NextResponse.json({ error: "type inválido" }, { status: 400 });
}
