import { NextRequest, NextResponse } from "next/server";
import OpenAI, { toFile } from "openai";
import { sendMessage, sendToGroup, sendToAdmin, sendTyping } from "@/lib/whatsapp";
import { TOOLS, executeTool } from "@/lib/agent-tools";
import { createServiceClient } from "@/lib/supabase-service";

export const dynamic = "force-dynamic";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Deduplicação: ignora o mesmo messageId em menos de 30s
const recentIds = new Map<string, number>();
setInterval(() => {
  const now = Date.now();
  for (const [id, ts] of recentIds) {
    if (now - ts > 30_000) recentIds.delete(id);
  }
}, 15_000);

const SYSTEM_PROMPT = (userName: string) =>
  `Você é Lilly, assistente pessoal e psicóloga de ${userName}.

Você alterna entre dois modos conforme o que ${userName} traz:

## MODO PSICÓLOGA
Quando ${userName} desabafa ou fala de sentimentos, cansaço, ansiedade, pressão, relacionamentos, medos, dúvidas pessoais:
- Escute com presença. Responda ao que ele disse, não ao que você quer dizer.
- Faça UMA pergunta por vez.
- Valide o sentimento antes de orientar. Não minimize com "vai passar" ou "podia ser pior".
- Não dê conselhos não pedidos.
- Use o histórico: lembre o que foi dito antes e faça conexões.
- Se perceber algo grave (crise, pensamentos de se machucar), acolha e sugira buscar profissional.
- Quando surgir insight importante, use save_reflection.

## MODO ASSISTENTE
Quando há instrução clara de tarefa. Execute imediatamente, sem pedir confirmação.
Confirmação: máximo 1 linha ("✅ Feito.").

## REGRAS DE FERRAMENTA — leia com atenção

### add_task
Use quando disser: "adiciona", "adicione", "cria", "coloca", "lembra de", "anota", "registra"
- SEMPRE adiciona — mesmo que a tarefa pareça já existir
- NUNCA confunda com complete_task

### complete_task
Use SOMENTE quando disser explicitamente: "fiz", "terminei", "concluí", "já fiz", "feito", "conclui", "pode marcar como feita/concluída"
- NUNCA use complete_task para "adicione" ou "adiciona"

### add_goal / complete_goal
- add_goal: "adiciona meta", "meta de hoje", "quero hoje"
- complete_goal: "cumpri a meta", "meta feita", "conclui a meta de X"

### add_expense / add_income
- add_expense: "gastei", "paguei", "saiu", "comprei" — também use quando receber uma FOTO de recibo/nota fiscal, extraindo valor e descrição da imagem
- add_income: "recebi", "entrou", "ganhei", "cliente pagou"

### create_video — "cria um vídeo sobre X", "faz um vídeo de Y" — gera com IA, não posta ainda
### post_video — "posta o vídeo", "pode postar", "publica" (depois de um create_video) — publica no TikTok o vídeo pronto
### add_bill / pay_bill / get_bills — "tenho uma conta de X pra pagar", "paguei a conta de X", "quais contas tenho pra pagar"

### get_tasks — quando perguntar sobre tarefas em aberto, o que tem pra fazer
### get_finance — quando perguntar sobre dinheiro, saldo, financeiro do mês
### get_status — "como tá o dia", "status"
### get_briefing — "briefing", "resumo do dia", "o que tenho hoje"
### add_habit — "orei", "li a bíblia", "me exercitei", "fiz leitura"
### save_reflection — quando chegar a conclusão importante sobre si mesmo

## Regras de interpretação
- "tô cansado / tô mal / preciso falar / que semana difícil / tô ansioso..." → PSICÓLOGA
- Mensagem ambígua → PSICÓLOGA primeiro; oferece ajuda prática no final se fizer sentido
- Nunca peça confirmação antes de executar tarefa simples

## Estilo
- Português informal e próximo — nunca formal
- Psicóloga: profundidade quando o momento pede, sem enrolar
- Assistente: direto, 1 linha de confirmação
- Emojis com moderação

## Nunca faça
- Nunca diagnostique condições clínicas
- Nunca prescreva medicamentos
- Nunca substitua profissional de saúde real`;

const HISTORY_LIMIT = 20;

function extractText(msg: Record<string, unknown>): string {
  const m = msg?.message as Record<string, unknown> | undefined;
  if (!m) return "";
  if (typeof m.conversation === "string") return m.conversation;
  const ext = m.extendedTextMessage as Record<string, unknown> | undefined;
  if (typeof ext?.text === "string") return ext.text;
  return "";
}

interface GroupReplyDecision {
  reply: string;
  needs_intervention: boolean;
  summary: string;
}

// Modo atendente: só age em grupos com attend_enabled=true (configurados em
// /profissional/grupos). Política conservadora — só responde no grupo se o
// conhecimento cadastrado cobrir a pergunta com certeza; qualquer dúvida
// escala pro Junior (needs_intervention), sem responder no grupo.
async function handleGroupMessage(
  message: Record<string, unknown>,
  groupJid: string,
  supabase: ReturnType<typeof createServiceClient>
) {
  const key = message.key as Record<string, unknown>;
  const text = extractText(message);
  if (!text) return; // ignora áudio/imagem/etc dentro de grupo por enquanto

  const { data: group } = await supabase
    .from("whatsapp_groups")
    .select("subject, client_name, attend_enabled, knowledge")
    .eq("jid", groupJid)
    .maybeSingle();

  if (!group?.attend_enabled) return;

  const senderName = (message.pushName as string) || String(key.participant ?? "Cliente");
  const clientLabel = group.client_name || group.subject || "cliente";

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 400,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `Você é a assistente de atendimento automático da Upflu Agência, atuando no grupo de suporte do cliente "${clientLabel}".

Conhecimento disponível sobre esse cliente/serviço (pode estar vazio):
"""
${group.knowledge || "(nenhum conhecimento cadastrado ainda)"}
"""

Regras:
- Responda no grupo SOMENTE se o conhecimento acima cobrir a pergunta com certeza absoluta.
- Se houver qualquer dúvida, reclamação, pedido de cancelamento, desconto, condição especial, ou pergunta fora do conhecimento cadastrado: NÃO responda no grupo (reply = ""), marque needs_intervention = true. O dono da agência (Junior) vai assumir manualmente.
- Nunca invente informação que não está no conhecimento cadastrado.
- Tom: profissional, direto, cordial.

Responda em JSON: { "reply": string (mensagem pro grupo, "" se não for responder), "needs_intervention": boolean, "summary": string (1-2 frases resumindo pro Junior o que o cliente pediu/atualizou) }`,
      },
      { role: "user", content: `Mensagem de ${senderName} no grupo: ${text}` },
    ],
  });

  let decision: GroupReplyDecision;
  try {
    decision = JSON.parse(completion.choices[0].message.content ?? "{}");
  } catch {
    decision = { reply: "", needs_intervention: true, summary: `Não consegui processar a mensagem de ${senderName}: "${text}"` };
  }

  if (decision.reply) await sendToGroup(decision.reply, groupJid);

  const prefix = decision.needs_intervention ? "🔔 *Precisa de você* — " : "ℹ️ ";
  await sendToAdmin(`${prefix}*${clientLabel}*: ${decision.summary}`);
}

// Normaliza JID para telefone: tenta 13 dígitos (com 9) e 12 (sem 9)
function phoneVariants(jid: string): string[] {
  const digits = jid.replace(/\D/g, "");
  const variants = [digits];
  // Brasil: 55 + DDD(2) + 9 + número(8) = 13 dígitos → variante sem o 9
  if (digits.startsWith("55") && digits.length === 13) {
    variants.push("55" + digits.slice(2, 4) + digits.slice(5)); // remove o 9
  }
  // Brasil: 55 + DDD(2) + número(8) = 12 dígitos → variante com o 9
  if (digits.startsWith("55") && digits.length === 12) {
    variants.push("55" + digits.slice(2, 4) + "9" + digits.slice(4));
  }
  return variants;
}

async function transcribeAudio(base64: string, mimetype: string): Promise<string | null> {
  try {
    const buffer = Buffer.from(base64, "base64");
    const ext = mimetype.includes("ogg") ? "ogg" : mimetype.includes("mp4") ? "mp4" : "webm";
    const file = await toFile(buffer, `audio.${ext}`, { type: mimetype });
    const transcription = await openai.audio.transcriptions.create({ file, model: "whisper-1" });
    return transcription.text?.trim() || null;
  } catch (err) {
    console.error("[webhook] transcribe error:", String(err));
    return null;
  }
}

interface UserContent {
  content: string | OpenAI.Chat.ChatCompletionContentPart[];
  displayText: string; // versão em texto puro, pra guardar no chat_history
}

// Monta o conteúdo da mensagem pro modelo — texto puro, transcrição de áudio
// (Whisper), ou texto+imagem (pra IA enxergar recibos e afins)
async function buildUserContent(msg: Record<string, unknown>): Promise<UserContent | null> {
  const text = extractText(msg);
  if (text) return { content: text, displayText: text };

  const message = msg.message as Record<string, unknown> | undefined;
  if (!message) return null;

  const audio = message.audioMessage as Record<string, unknown> | undefined;
  if (audio) {
    const base64 = (message.base64 as string | undefined) ?? (audio.base64 as string | undefined);
    if (!base64) {
      const fallback = "[Recebi um áudio mas não consegui carregar o conteúdo. Pode repetir em texto?]";
      return { content: fallback, displayText: fallback };
    }
    const mimetype = (audio.mimetype as string) ?? "audio/ogg";
    const transcribed = await transcribeAudio(base64, mimetype);
    if (!transcribed) {
      const fallback = "[Recebi um áudio mas não consegui entender. Pode repetir em texto?]";
      return { content: fallback, displayText: fallback };
    }
    return { content: transcribed, displayText: `[áudio] ${transcribed}` };
  }

  const image = message.imageMessage as Record<string, unknown> | undefined;
  if (image) {
    const caption = (image.caption as string) ?? "";
    const base64 = (message.base64 as string | undefined) ?? (image.base64 as string | undefined);
    if (!base64) {
      const fallback = caption || "[Recebi uma imagem mas não consegui carregar o conteúdo. Pode descrever em texto?]";
      return { content: fallback, displayText: `[imagem]${caption ? `: ${caption}` : ""}` };
    }
    const mimetype = (image.mimetype as string) ?? "image/jpeg";
    const promptText = caption || "Veja essa imagem. Se for recibo/nota fiscal, registre o gasto com add_expense.";
    return {
      content: [
        { type: "text", text: promptText },
        { type: "image_url", image_url: { url: `data:${mimetype};base64,${base64}` } },
      ],
      displayText: `[imagem]${caption ? `: ${caption}` : ""}`,
    };
  }

  return null;
}

async function createCompletionWithRetry(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  retries = 2
): Promise<OpenAI.Chat.ChatCompletion> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        tools: TOOLS,
        tool_choice: "auto",
        max_tokens: 1024,
        temperature: 0.7,
      });
    } catch (err) {
      lastErr = err;
      if (attempt < retries) await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
    }
  }
  throw lastErr;
}

export async function POST(req: NextRequest) {
  let remoteJid = "";

  try {
    const body = await req.json();

    const evt = (body?.event ?? "").toLowerCase().replace(/_/g, ".");
    if (evt !== "messages.upsert") return NextResponse.json({ ok: true });

    const message: Record<string, unknown> = body?.data?.key
      ? body.data
      : body?.data?.messages?.[0];

    if (!message) return NextResponse.json({ ok: true });

    const key = message.key as Record<string, unknown> | undefined;
    if (!key) return NextResponse.json({ ok: true });
    if (key.fromMe === true) return NextResponse.json({ ok: true });

    remoteJid = String(key.remoteJid ?? "");

    // Deduplicação por messageId
    const msgId = String(key.id ?? "");
    if (msgId && recentIds.has(msgId)) return NextResponse.json({ ok: true });
    if (msgId) recentIds.set(msgId, Date.now());

    const supabase = createServiceClient();

    // Grupos: só age em grupos com atendimento ativado (ver /profissional/grupos).
    // Não interfere na conversa pessoal (Lilly no PV) — fluxo totalmente separado.
    if (remoteJid.endsWith("@g.us")) {
      await handleGroupMessage(message, remoteJid, supabase);
      return NextResponse.json({ ok: true });
    }

    const userContent = await buildUserContent(message);
    if (!userContent) return NextResponse.json({ ok: true });

    // Busca usuário pelo telefone (tenta variantes com/sem 9)
    const phones = phoneVariants(remoteJid);
    const { data: user } = await supabase
      .from("users")
      .select("id, name")
      .in("phone", phones)
      .maybeSingle();

    if (!user) {
      // Número não cadastrado — ignora silenciosamente
      return NextResponse.json({ ok: true });
    }

    sendTyping(remoteJid).catch(() => null);

    const today = new Date().toLocaleDateString("pt-BR", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
      timeZone: "America/Sao_Paulo",
    });
    const time = new Date().toLocaleTimeString("pt-BR", {
      hour: "2-digit", minute: "2-digit",
      timeZone: "America/Sao_Paulo",
    });

    const [{ data: history }, { data: summaryRow }] = await Promise.all([
      supabase
        .from("chat_history")
        .select("role, content")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(HISTORY_LIMIT),
      supabase
        .from("chat_summaries")
        .select("summary")
        .eq("user_id", user.id)
        .order("period_end", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const historyMessages = (history ?? [])
      .reverse()
      .map((h) => ({ role: h.role as "user" | "assistant", content: h.content }));

    const memoryBlock = summaryRow?.summary
      ? `\n\nMemória de longo prazo (resumo de conversas anteriores — use pra lembrar de padrões, não repita literalmente):\n${summaryRow.summary}`
      : "";

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: `${SYSTEM_PROMPT(user.name ?? "você")}\n\nHoje: ${today}, ${time}${memoryBlock}` },
      ...historyMessages,
      { role: "user", content: userContent.content },
    ];

    let finalReply = "";

    for (let i = 0; i < 5; i++) {
      const response = await createCompletionWithRetry(messages);

      const choice = response.choices[0];
      messages.push(choice.message);

      if (choice.finish_reason !== "tool_calls" || !choice.message.tool_calls?.length) {
        finalReply = choice.message.content?.trim() ?? "";
        if (finalReply) await sendMessage(finalReply, remoteJid);
        break;
      }

      const toolResults = await Promise.all(
        choice.message.tool_calls.map(async (tc) => {
          const input = JSON.parse(tc.function.arguments) as Record<string, unknown>;
          const result = await executeTool(tc.function.name, input, user.id);
          return { role: "tool" as const, tool_call_id: tc.id, content: result };
        })
      );

      messages.push(...toolResults);
    }

    if (finalReply) {
      await supabase.from("chat_history").insert([
        { role: "user", content: userContent.displayText, user_id: user.id },
        { role: "assistant", content: finalReply, user_id: user.id },
      ]).then(({ error }) => { if (error) console.error("[webhook] history:", error.message); });
    }
  } catch (err) {
    console.error("[webhook] error:", String(err));
    if (remoteJid) {
      sendMessage("Opa, tive um perrengue técnico agora 🙏 Tenta de novo daqui a pouco.", remoteJid).catch(() => null);
    }
  }

  return NextResponse.json({ ok: true });
}
