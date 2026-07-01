import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const supabase = await createClient();
  let query = supabase.from("events").select("*").order("date").order("time");
  if (from) query = query.gte("date", from);
  if (to) query = query.lte("date", to);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, description, date, time, end_time, color = "#00C8FF", type = "event" } = body;

  if (!title?.trim() || !date) {
    return NextResponse.json({ error: "title e date são obrigatórios" }, { status: 400 });
  }

  // Sanitização básica
  const clean = (s: string | undefined) => s?.slice(0, 500).trim();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .insert({ title: clean(title), description: clean(description), date, time: time || null, end_time: end_time || null, color, type })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
