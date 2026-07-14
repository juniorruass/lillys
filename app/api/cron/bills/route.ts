import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { sendToAdmin as sendMessage } from "@/lib/whatsapp";

function fmt(n: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
}

// Avisa contas a pagar (finance_entries type='conta') vencendo nos próximos 3 dias.
// Roda 1x/dia. Uma vez avisada, reminder_sent=true até ser paga (vira type='saida').
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];
  const limit = new Date();
  limit.setDate(limit.getDate() + 3);
  const limitDate = limit.toISOString().split("T")[0];

  const { data: contas } = await supabase
    .from("finance_entries")
    .select("id,description,amount,date")
    .eq("type", "conta")
    .eq("reminder_sent", false)
    .lte("date", limitDate);

  if (!contas?.length) return NextResponse.json({ ok: true, sent: 0 });

  const lines = contas.map((c) => {
    const vencida = c.date < today;
    return `• ${c.description} — ${fmt(Number(c.amount))}${vencida ? " ⚠️ vencida" : ` (vence ${c.date})`}`;
  });

  const msg = `💸 *Contas a pagar:*\n${lines.join("\n")}`;
  await sendMessage(msg);
  await supabase.from("finance_entries").update({ reminder_sent: true }).in("id", contas.map((c) => c.id));

  return NextResponse.json({ ok: true, sent: contas.length });
}
