import { NextResponse } from "next/server";

const ADM_URL = process.env.ADM_UPFLU_URL || "https://adm.upflu.digital";
const ADM_SECRET = process.env.ADM_API_SECRET || "";

export async function GET() {
  try {
    const res = await fetch(`${ADM_URL}/api/dashboard/campaigns-report`, {
      headers: { Authorization: `Bearer ${ADM_SECRET}` },
      cache: "no-store",
    });
    if (!res.ok) throw new Error("adm offline");
    const data = await res.json();
    return NextResponse.json({ clients: data.clients ?? [] });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
