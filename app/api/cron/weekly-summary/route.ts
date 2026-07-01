import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createServiceClient } from "@/lib/supabase-service";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Gera um resumo da semana de conversas e guarda em chat_summaries, pra
// alimentar a memória de longo prazo da Lilly no webhook. Roda 1x/semana.
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const supabase = createServiceClient();

  const periodEnd = new Date();
  const periodStart = new Date(periodEnd);
  periodStart.setDate(periodStart.getDate() - 7);
  const periodEndStr = periodEnd.toISOString().split("T")[0];
  const periodStartStr = periodStart.toISOString().split("T")[0];

  const { data: user } = await supabase
    .from("users")
    .select("id, name")
    .eq("phone", process.env.JUNIOR_WHATSAPP ?? "")
    .maybeSingle();

  if (!user) return NextResponse.json({ ok: true, skipped: "no user" });

  const { data: history } = await supabase
    .from("chat_history")
    .select("role, content, created_at")
    .eq("user_id", user.id)
    .gte("created_at", periodStart.toISOString())
    .order("created_at", { ascending: true });

  if (!history?.length) return NextResponse.json({ ok: true, skipped: "no history" });

  const transcript = history.map((h) => `${h.role === "user" ? user.name : "Lilly"}: ${h.content}`).join("\n");

  const { data: previousSummary } = await supabase
    .from("chat_summaries")
    .select("summary")
    .eq("user_id", user.id)
    .order("period_end", { ascending: false })
    .limit(1)
    .maybeSingle();

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Resuma os principais padrões, temas recorrentes e estado emocional de ${user.name} a partir das conversas da semana abaixo. Seja direto, em até 6 linhas, focando no que é útil lembrar nas próximas semanas (preocupações recorrentes, decisões tomadas, hábitos, contexto emocional). Não liste tarefas pontuais já resolvidas.${
          previousSummary?.summary ? `\n\nResumo da semana anterior (pra dar continuidade, não repetir):\n${previousSummary.summary}` : ""
        }`,
      },
      { role: "user", content: transcript },
    ],
    max_tokens: 400,
    temperature: 0.5,
  });

  const summary = completion.choices[0]?.message?.content?.trim();
  if (!summary) return NextResponse.json({ ok: true, skipped: "empty summary" });

  const { error } = await supabase.from("chat_summaries").insert({
    user_id: user.id,
    period_start: periodStartStr,
    period_end: periodEndStr,
    summary,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, summary });
}
