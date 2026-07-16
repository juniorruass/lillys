import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase-server";
import { sendToGroup } from "@/lib/whatsapp";

const ADM_URL = process.env.ADM_UPFLU_URL || "https://adm.upflu.digital";
const ADM_SECRET = process.env.ADM_API_SECRET || "";

function getClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function fmt(n: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
}

// Mensagem diária proativa nos grupos com atendimento ativado: bom dia +
// atualização/pergunta natural (usando o conhecimento cadastrado por grupo)
// + destaque de campanha (Meta) quando o cliente tiver dado disponível.
// Uma mensagem só por dia por grupo — evita virar spam em grupo pequeno.
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const supabase = await createClient();
  const { data: groups } = await supabase
    .from("whatsapp_groups")
    .select("jid, subject, client_name, knowledge")
    .eq("attend_enabled", true);

  if (!groups?.length) return NextResponse.json({ ok: true, sent: 0 });

  // Métricas do Meta (mesma fonte do agente de relatórios) — opcional, só usa se o cliente bater
  let clientsMeta: { name: string; spend_7d?: number; leads_7d?: number; error?: string }[] = [];
  try {
    const res = await fetch(`${ADM_URL}/api/dashboard/campaigns-report`, {
      headers: { Authorization: `Bearer ${ADM_SECRET}` },
      cache: "no-store",
    });
    if (res.ok) clientsMeta = (await res.json()).clients ?? [];
  } catch {
    // segue sem dado de Meta se o adm estiver offline
  }

  const openai = getClient();
  let sent = 0;

  for (const group of groups) {
    const clientLabel = group.client_name || group.subject || "cliente";
    const meta = clientsMeta.find((c) => c.name === group.client_name && !c.error);
    const metaLine = meta
      ? `Dados da campanha (últimos 7 dias): ${fmt(meta.spend_7d ?? 0)} investidos, ${meta.leads_7d ?? 0} leads.`
      : "Sem dado de campanha disponível hoje.";

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 250,
      messages: [
        {
          role: "system",
          content: `Você é a assistente da Upflu Agência no grupo de suporte do cliente "${clientLabel}". Escreva UMA mensagem curta de bom dia pra esse grupo, natural e profissional (não robótica), que pode incluir: uma atualização, uma sugestão de melhoria, ou uma pergunta rápida de acompanhamento — varie o foco a cada dia, não repita sempre a mesma estrutura.

Seja específico, não genérico: se houver conhecimento cadastrado ou dado de campanha, use eles pra dizer algo concreto (nome de campanha, número, ação pendente) em vez de frase vaga tipo "tudo bem por aí?" ou "como estão as coisas?". Se não tiver nada específico pra dizer, prefira uma mensagem curta e direta a encher linguiça.

Formatação pro WhatsApp: negrito é *um asterisco* (nunca **dois**), sem markdown de título (#), sem link em colchetes. Máximo 4 linhas. No máximo 1-2 emojis.

Conhecimento sobre o cliente:
"""
${group.knowledge || "(nenhum conhecimento cadastrado ainda)"}
"""

${metaLine}`,
        },
        { role: "user", content: "Gere a mensagem de hoje." },
      ],
    });

    const text = completion.choices[0].message.content?.trim();
    if (!text) continue;

    await sendToGroup(text, group.jid);
    sent++;
  }

  return NextResponse.json({ ok: true, sent });
}
