import { NextResponse } from "next/server";

const EVOLUTION_URL = process.env.EVOLUTION_API_URL ?? "";
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY ?? "";
const INSTANCE = process.env.EVOLUTION_INSTANCE ?? "";
const JUNIOR_NUMBER = process.env.JUNIOR_WHATSAPP ?? "";

export async function POST() {
  try {
    const res = await fetch(`${EVOLUTION_URL}/message/sendText/${INSTANCE}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: EVOLUTION_KEY },
      body: JSON.stringify({
        number: JUNIOR_NUMBER,
        text: "✅ Lilly's — teste de conexão WhatsApp OK",
        options: { delay: 1500, presence: "composing" },
      }),
    });
    if (!res.ok) return NextResponse.json({ ok: false }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
