import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { sendToAdmin } from "@/lib/whatsapp";
import { sendPushToAll } from "@/lib/push";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, date, time, description, color = "#00C8FF", type = "task" } = body;

  if (!title?.trim() || !date) {
    return NextResponse.json({ error: "title e date são obrigatórios" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: event, error } = await supabase
    .from("events")
    .insert({ title: title.trim(), description, date, time: time || null, color, type })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const dateLabel = new Date(`${date}T00:00:00`).toLocaleDateString("pt-BR");
  const timeLabel = time ? ` às ${time}` : "";
  const msg = `📅 *Agendado:* ${title.trim()}\n${dateLabel}${timeLabel}`;

  await Promise.allSettled([
    sendToAdmin(msg),
    sendPushToAll("📅 Agendado", `${title.trim()} — ${dateLabel}${timeLabel}`, "/dashboard"),
  ]);

  return NextResponse.json({ ok: true, event });
}
