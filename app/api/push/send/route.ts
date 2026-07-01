import { NextRequest, NextResponse } from "next/server";
import { sendPushToAll } from "@/lib/push";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { title, body, url = "/dashboard", tag = "lillys" } = await req.json();
  const { sent, total } = await sendPushToAll(title, body, url, tag);
  return NextResponse.json({ sent, total });
}
