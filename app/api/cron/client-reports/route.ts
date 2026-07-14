import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { sendToGroup } from "@/lib/whatsapp";

const ADM_URL = process.env.ADM_UPFLU_URL || "https://adm.upflu.digital";
const ADM_SECRET = process.env.ADM_API_SECRET || "";

function fmt(n: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
}

type ClientReport = {
  id: string;
  name: string;
  active_campaigns?: number;
  spend_7d?: number;
  clicks_7d?: number;
  leads_7d?: number;
  error?: string;
};

// Manda resumo de campanhas (últimos 7 dias) pro grupo do WhatsApp de cada cliente.
// Requer que o cliente tenha um jid cadastrado em whatsapp_groups (client_name = clients.name).
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const res = await fetch(`${ADM_URL}/api/dashboard/campaigns-report`, {
    headers: { Authorization: `Bearer ${ADM_SECRET}` },
    cache: "no-store",
  });
  if (!res.ok) return NextResponse.json({ error: "adm offline" }, { status: 503 });
  const { clients } = (await res.json()) as { clients: ClientReport[] };

  const supabase = await createClient();
  const { data: groups } = await supabase.from("whatsapp_groups").select("client_name,jid");
  if (!groups?.length) return NextResponse.json({ ok: true, sent: 0, note: "nenhum grupo cadastrado em whatsapp_groups" });

  let sent = 0;
  for (const client of clients) {
    if (client.error) continue;
    const group = groups.find((g) => g.client_name === client.name);
    if (!group) continue;

    const msg = `📊 *Relatório de campanhas — ${client.name}* (últimos 7 dias)\n\n` +
      `🎯 Campanhas ativas: ${client.active_campaigns ?? 0}\n` +
      `💰 Investido: ${fmt(client.spend_7d ?? 0)}\n` +
      `👆 Cliques: ${client.clicks_7d ?? 0}\n` +
      `📩 Leads: ${client.leads_7d ?? 0}`;

    await sendToGroup(msg, group.jid);
    sent++;
  }

  return NextResponse.json({ ok: true, sent });
}
