import webpush from "web-push";
import { createClient } from "@/lib/supabase-server";

export async function sendPushToAll(title: string, body: string, url = "/dashboard", tag = "lillys") {
  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  if (!vapidPublic || !vapidPrivate) return { sent: 0, total: 0 };

  webpush.setVapidDetails(`mailto:${process.env.VAPID_EMAIL}`, vapidPublic, vapidPrivate);

  const supabase = await createClient();
  const { data: subs } = await supabase.from("push_subscriptions").select("subscription");
  if (!subs?.length) return { sent: 0, total: 0 };

  const payload = JSON.stringify({ title, body, url, tag });
  const results = await Promise.allSettled(
    subs.map((row) => webpush.sendNotification(JSON.parse(row.subscription), payload))
  );
  const sent = results.filter((r) => r.status === "fulfilled").length;
  return { sent, total: subs.length };
}
