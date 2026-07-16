import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

const EVOLUTION_URL = process.env.EVOLUTION_API_URL || "";
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY || "";
const INSTANCE = process.env.EVOLUTION_INSTANCE || "";

interface EvoGroup {
  id: string;
  subject: string;
  size: number;
}

// Sempre sincroniza a lista de grupos ao vivo da Evolution API (fonte de
// verdade é o WhatsApp), fazendo upsert em whatsapp_groups pra preservar as
// configurações já salvas (attend_enabled, knowledge, client_name).
export async function GET() {
  const res = await fetch(`${EVOLUTION_URL}/group/fetchAllGroups/${INSTANCE}?getParticipants=false`, {
    headers: { apikey: EVOLUTION_KEY },
    cache: "no-store",
  });
  if (!res.ok) return NextResponse.json({ error: "Evolution API indisponível" }, { status: 503 });

  const evoGroups = (await res.json()) as EvoGroup[];
  const supabase = await createClient();

  const { data: existing } = await supabase.from("whatsapp_groups").select("*");
  const byJid = new Map((existing ?? []).map((g) => [g.jid, g]));

  const now = new Date().toISOString();
  const rows = evoGroups.map((g) => ({
    jid: g.id,
    subject: g.subject,
    client_name: byJid.get(g.id)?.client_name ?? null,
    attend_enabled: byJid.get(g.id)?.attend_enabled ?? false,
    knowledge: byJid.get(g.id)?.knowledge ?? null,
    synced_at: now,
  }));

  await supabase.from("whatsapp_groups").upsert(rows, { onConflict: "jid" });

  const merged = rows
    .map((r) => ({ ...r, size: evoGroups.find((g) => g.id === r.jid)?.size ?? 0 }))
    .sort((a, b) => (b.attend_enabled ? 1 : 0) - (a.attend_enabled ? 1 : 0) || a.subject.localeCompare(b.subject));

  return NextResponse.json({ groups: merged });
}

export async function PATCH(req: NextRequest) {
  const { jid, client_name, attend_enabled, knowledge } = await req.json();
  if (!jid) return NextResponse.json({ error: "jid obrigatório" }, { status: 400 });

  const supabase = await createClient();
  const { error } = await supabase
    .from("whatsapp_groups")
    .update({ client_name, attend_enabled, knowledge })
    .eq("jid", jid);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
