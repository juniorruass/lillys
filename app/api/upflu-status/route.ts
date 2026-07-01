import { NextResponse } from "next/server";

const ADM_URL = process.env.ADM_UPFLU_URL || "https://adm.upflu.digital";
const ADM_SECRET = process.env.ADM_API_SECRET || "";

export async function GET() {
  try {
    const res = await fetch(`${ADM_URL}/api/dashboard/summary`, {
      headers: { Authorization: `Bearer ${ADM_SECRET}` },
      cache: "no-store",
    });
    if (!res.ok) throw new Error("adm offline");
    const data = await res.json();
    return NextResponse.json({
      mrr: data.mrr ?? 0,
      arr: (data.mrr ?? 0) * 12,
      clients: data.active_clients ?? 0,
      onboarding: data.onboarding ?? 0,
      renewals_30d: data.renewals_30d ?? 0,
      kanban: data.kanban ?? { todo: 0, doing: 0, done: 0 },
    });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
