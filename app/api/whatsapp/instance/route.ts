import { NextResponse } from "next/server";

const EVOLUTION_URL = process.env.EVOLUTION_API_URL ?? "https://evolution.upflu.digital";
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY ?? "";
const INSTANCE      = process.env.EVOLUTION_INSTANCE ?? "LILLYS";

function headers() {
  return { "Content-Type": "application/json", apikey: EVOLUTION_KEY };
}

// GET — estado da conexão
export async function GET() {
  try {
    const res = await fetch(`${EVOLUTION_URL}/instance/connectionState/${INSTANCE}`, {
      headers: headers(),
      cache: "no-store",
    });
    if (!res.ok) return NextResponse.json({ state: "unknown" }, { status: 200 });
    const data = await res.json();
    // Evolution API v2 retorna { instance: { state: "open" | "close" | "connecting" } }
    const state: string = data?.instance?.state ?? data?.state ?? "unknown";
    return NextResponse.json({ state });
  } catch {
    return NextResponse.json({ state: "unknown" });
  }
}

// POST — gera QR code para conectar
export async function POST() {
  try {
    const res = await fetch(`${EVOLUTION_URL}/instance/connect/${INSTANCE}`, {
      method: "GET", // Evolution API: GET /instance/connect/{instance} retorna QR
      headers: headers(),
      cache: "no-store",
    });
    if (!res.ok) return NextResponse.json({ ok: false }, { status: 502 });
    const data = await res.json();
    // Retorna base64 da imagem do QR code
    const qr: string = data?.base64 ?? data?.qrcode?.base64 ?? "";
    return NextResponse.json({ ok: true, qr });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

// DELETE — desconecta / logout da instância
export async function DELETE() {
  try {
    const res = await fetch(`${EVOLUTION_URL}/instance/logout/${INSTANCE}`, {
      method: "DELETE",
      headers: headers(),
    });
    return NextResponse.json({ ok: res.ok });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
