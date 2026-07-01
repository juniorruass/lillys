import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const clean = (s: string | undefined) => s?.slice(0, 500).trim();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .update({
      title: clean(body.title),
      description: clean(body.description),
      date: body.date,
      time: body.time || null,
      end_time: body.end_time || null,
      color: body.color,
      type: body.type,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
