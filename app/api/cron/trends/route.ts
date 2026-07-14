import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase-server";
import { sendToAdmin } from "@/lib/whatsapp";

function getClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

const SERPAPI_URL = "https://serpapi.com/search.json";

async function searchNews(query: string, gl: string, hl: string) {
  const params = new URLSearchParams({
    q: query,
    tbm: "nws",
    gl, // país
    hl, // idioma
    num: "10",
    api_key: process.env.SERPAPI_KEY ?? "",
  });
  const res = await fetch(`${SERPAPI_URL}?${params}`, { signal: AbortSignal.timeout(10000) });
  const json = await res.json();
  return (json.news_results ?? []) as { title: string; snippet?: string; source?: string }[];
}

// Busca novidades de marketing digital no Brasil e nos EUA, resume com IA
// e manda pro WhatsApp. Roda 1x/semana.
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [br, us] = await Promise.all([
    searchNews("tendências marketing digital", "br", "pt"),
    searchNews("digital marketing trends", "us", "en"),
  ]);

  if (!br.length && !us.length) return NextResponse.json({ ok: true, sent: 0 });

  const context = `
Notícias Brasil:
${br.map((n) => `- ${n.title} (${n.source ?? ""})`).join("\n") || "nenhuma"}

Notícias EUA:
${us.map((n) => `- ${n.title} (${n.source ?? ""})`).join("\n") || "nenhuma"}
`;

  const completion = await getClient().chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 500,
    messages: [
      {
        role: "system",
        content: `Você é um analista de marketing digital. Resuma as novidades mais relevantes de marketing digital no Brasil e nos EUA em um texto curto, direto, formatado pra WhatsApp (use *negrito* e bullets •). Ignore notícias irrelevantes ou repetitivas. Foque no que é acionável pra uma empresa de crescimento digital.`,
      },
      { role: "user", content: context },
    ],
  });

  const summary = completion.choices[0].message.content?.trim() ?? "";
  if (!summary) return NextResponse.json({ ok: true, sent: 0 });

  const msg = `📊 *Tendências de marketing digital*\n\n${summary}`;
  await sendToAdmin(msg);

  const supabase = await createClient();
  await supabase.from("notes").insert({ content: msg, type: "trend_report" });

  return NextResponse.json({ ok: true, sent: 1 });
}
