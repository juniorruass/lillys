import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const [
    { count: tasks },
    { count: notes },
    { count: entries },
    { count: goals },
  ] = await Promise.all([
    supabase.from("tasks").select("*", { count: "exact", head: true }),
    supabase.from("notes").select("*", { count: "exact", head: true }),
    supabase.from("finance_entries").select("*", { count: "exact", head: true }),
    supabase.from("goals").select("*", { count: "exact", head: true }),
  ]);
  return NextResponse.json({ tasks, notes, entries, goals });
}
