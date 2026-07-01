import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const results = await Promise.allSettled([
    // Supabase — ping leve na tabela tasks
    (async () => {
      const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const sbKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      const r = await fetch(`${sbUrl}/rest/v1/tasks?select=id&limit=1`, {
        headers: { apikey: sbKey ?? "", Authorization: `Bearer ${sbKey}` },
        signal: AbortSignal.timeout(4000),
      });
      if (!r.ok) throw new Error("supabase error");
    })(),
    // WhatsApp — verifica instâncias
    fetch(`${process.env.EVOLUTION_API_URL}/instance/fetchInstances`, {
      headers: { apikey: process.env.EVOLUTION_API_KEY ?? "" },
      signal: AbortSignal.timeout(4000),
    }),
    // Dashboard Upflu
    fetch(`${process.env.ADM_UPFLU_URL}/api/dashboard/summary`, {
      headers: { Authorization: `Bearer ${process.env.ADM_API_SECRET}` },
      signal: AbortSignal.timeout(4000),
      cache: "no-store",
    }),
  ]);

  const [supabaseR, waR, dashR] = results;

  return NextResponse.json({
    supabase:  supabaseR.status === "fulfilled",
    whatsapp:  waR.status === "fulfilled" && (waR.value as Response).ok,
    dashboard: dashR.status === "fulfilled" && (dashR.value as Response).ok,
  });
}
