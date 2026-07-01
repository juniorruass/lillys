import { NextResponse, type NextRequest } from "next/server";

const PUBLIC = ["/login", "/api/auth/", "/api/whatsapp/", "/api/health", "/api/cron/", "/sw.js", "/manifest.json"];

// Padrões de ataque conhecidos para bloquear na borda
const BLOCKED_PATHS = [
  "/etc/passwd", "/etc/shadow", "/.env", "/.git", "/wp-admin", "/wp-login",
  "/phpmyadmin", "/xmlrpc", "/admin.php", "/.htaccess", "/config.php",
  "/proc/self", "/var/www", "\\x00", "/../", "/./",
];

const BLOCKED_UA = ["sqlmap", "nikto", "nmap", "masscan", "zgrab", "nuclei", "dirsearch", "gobuster", "ffuf", "wfuzz"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Bloqueia path traversal e caminhos maliciosos ──
  const lower = pathname.toLowerCase();
  if (pathname.includes("..") || BLOCKED_PATHS.some((p) => lower.includes(p))) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // ── Bloqueia URLs excessivamente longas ──
  if (pathname.length > 512) {
    return new NextResponse("Bad Request", { status: 400 });
  }

  // ── Bloqueia scanners/bots conhecidos ──
  const ua = (request.headers.get("user-agent") ?? "").toLowerCase();
  if (BLOCKED_UA.some((b) => ua.includes(b))) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // ── Assets estáticos — passa direto ──
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname.match(/\.(png|jpg|svg|ico|webp|woff2?)$/)
  ) {
    return NextResponse.next();
  }

  // ── Rotas públicas ──
  if (PUBLIC.some((p) => pathname.startsWith(p))) {
    if (pathname === "/login" && request.cookies.get("lillys-session")?.value) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // ── Protege tudo — verificação JWT real fica no layout (Node.js runtime) ──
  if (!request.cookies.get("lillys-session")?.value) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
