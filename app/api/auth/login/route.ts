import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import { sendToAdmin as sendMessage } from "@/lib/whatsapp";

// ── In-memory fallback (usado se Supabase estiver indisponível) ───────────────
const memAttempts = new Map<string, { count: number; resetAt: number }>();
const MEM_MAX = 5;
const MEM_WINDOW = 15 * 60 * 1000;

// ── Constantes de segurança ───────────────────────────────────────────────────
const DB_WINDOW_MIN = 15;
const DB_WINDOW_MS  = DB_WINDOW_MIN * 60 * 1000;
const DB_MAX        = 5;
const BAN_LIMIT     = 10;
const BAN_WINDOW_MS = 60 * 60 * 1000;
const DB_TIMEOUT_MS = 3000; // abandona query Supabase após 3s

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

function nowBR(): string {
  return new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function shortUA(ua: string): string {
  const browser = ua.match(/(Chrome|Safari|Firefox|Edge|Opera)\/[\d.]+/)?.[0] ?? "";
  const os      = ua.match(/\(([^)]+)\)/)?.[1]?.split(";")[0] ?? "";
  return [browser, os].filter(Boolean).join(" · ").slice(0, 80) || ua.slice(0, 80);
}

// Executa thenable com timeout — nunca lança, retorna null em caso de falha
async function safe<T>(promise: PromiseLike<T>): Promise<T | null> {
  try {
    return await Promise.race([
      Promise.resolve(promise),
      new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), DB_TIMEOUT_MS)
      ),
    ]);
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const ip  = getIp(req);
  const ua  = req.headers.get("user-agent") ?? "desconhecido";
  const now = Date.now();

  // ── Tenta usar Supabase para rate limiting persistente ────────────────────
  let dbOk = false;
  try {
    const { createClient } = await import("@/lib/supabase-server");
    const supabase = await createClient();

    // 1. Verifica ban permanente
    const banResult = await safe(
      supabase.from("banned_ips").select("id").eq("ip", ip).maybeSingle()
    );
    if (banResult && (banResult as { data?: unknown }).data) {
      return NextResponse.json({ error: "Acesso bloqueado." }, { status: 403 });
    }

    // 2. Rate limiting persistente (15 min)
    const windowStart = new Date(now - DB_WINDOW_MS).toISOString();
    const countResult = await safe(
      supabase
        .from("login_attempts")
        .select("*", { count: "exact", head: true })
        .eq("ip", ip)
        .eq("success", false)
        .gte("created_at", windowStart)
    );
    const recentFails = (countResult as { count?: number } | null)?.count ?? 0;
    if (recentFails >= DB_MAX) {
      return NextResponse.json(
        { error: `Muitas tentativas. Aguarde ${DB_WINDOW_MIN} min.` },
        { status: 429 }
      );
    }

    dbOk = true;

    // ── Parse e validação de credenciais ─────────────────────────────────────
    let body: { email?: string; password?: string } = {};
    try { body = await req.json(); } catch { /* ignore */ }
    const { email, password } = body;

    const correctEmail    = process.env.APP_EMAIL    ?? "";
    const correctPassword = process.env.APP_PASSWORD ?? "";
    const secret          = process.env.SESSION_SECRET ?? "";

    if (!correctEmail || !correctPassword || !secret) {
      return NextResponse.json({ error: "Servidor mal configurado." }, { status: 500 });
    }

    if (email !== correctEmail || password !== correctPassword) {
      // Log falha
      safe(supabase.from("login_attempts").insert({ ip, success: false, user_agent: ua }));

      // Auto-ban após muitas falhas em 1h
      const hourStart = new Date(now - BAN_WINDOW_MS).toISOString();
      const hourResult = await safe(
        supabase
          .from("login_attempts")
          .select("*", { count: "exact", head: true })
          .eq("ip", ip)
          .eq("success", false)
          .gte("created_at", hourStart)
      );
      const hourFails = ((hourResult as { count?: number } | null)?.count ?? 0) + 1;

      if (hourFails >= BAN_LIMIT) {
        safe(supabase.from("banned_ips").upsert(
          { ip, reason: `${hourFails} falhas em 1h` },
          { onConflict: "ip" }
        ));
        sendMessage(`🚫 *IP banido — Lilly's*\nIP: \`${ip}\`\n${hourFails} tentativas em 1h\n${nowBR()}`).catch(() => null);
      } else if (hourFails === 3) {
        sendMessage(`⚠️ *Alerta — Lilly's*\n3 falhas de login\nIP: \`${ip}\`\n${shortUA(ua)}\n${nowBR()}`).catch(() => null);
      }

      return NextResponse.json({ error: "E-mail ou senha incorretos." }, { status: 401 });
    }

    // Sucesso com DB
    safe(supabase.from("login_attempts").insert({ ip, success: true, user_agent: ua }));
    sendMessage(`✅ *Login — Lilly's*\nIP: \`${ip}\`\n${shortUA(ua)}\n${nowBR()}`).catch(() => null);

    return buildSuccessResponse(secret);

  } catch {
    // Supabase falhou — usa fallback in-memory
    dbOk = false;
  }

  // ── Fallback in-memory quando Supabase está indisponível ──────────────────
  const rec = memAttempts.get(ip);
  if (rec && now < rec.resetAt && rec.count >= MEM_MAX) {
    const wait = Math.ceil((rec.resetAt - now) / 60000);
    return NextResponse.json(
      { error: `Muitas tentativas. Aguarde ${wait} min.` },
      { status: 429 }
    );
  }
  if (!rec || now >= rec.resetAt) memAttempts.delete(ip);

  let body: { email?: string; password?: string } = {};
  try { body = await req.json(); } catch { /* ignore */ }
  const { email, password } = body;

  const correctEmail    = process.env.APP_EMAIL    ?? "";
  const correctPassword = process.env.APP_PASSWORD ?? "";
  const secret          = process.env.SESSION_SECRET ?? "";

  if (!correctEmail || !correctPassword || !secret) {
    return NextResponse.json({ error: "Servidor mal configurado." }, { status: 500 });
  }

  if (email !== correctEmail || password !== correctPassword) {
    const cur = memAttempts.get(ip) ?? { count: 0, resetAt: now + MEM_WINDOW };
    cur.count++;
    memAttempts.set(ip, cur);
    return NextResponse.json({ error: "E-mail ou senha incorretos." }, { status: 401 });
  }

  memAttempts.delete(ip);
  return buildSuccessResponse(secret);
}

async function buildSuccessResponse(secret: string): Promise<NextResponse> {
  const token = await new SignJWT({ role: "owner" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(new TextEncoder().encode(secret));

  const res = NextResponse.json({ ok: true });
  res.cookies.set("lillys-session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  return res;
}
