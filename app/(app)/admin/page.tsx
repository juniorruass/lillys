"use client";
import { useState, useEffect } from "react";
import TopBar from "@/components/layout/TopBar";
import {
  ShieldCheck, Wifi, Database, MessageCircle,
  BarChart2, RefreshCw, CheckCircle2, XCircle, Ban, ShieldAlert, LogIn
} from "lucide-react";

interface Health { supabase: boolean; whatsapp: boolean; dashboard: boolean; }
interface AppStats { tasks: number; notes: number; entries: number; goals: number; }
interface Attempt { id: string; ip: string; success: boolean; user_agent: string; created_at: string; }
interface BannedIp { id: string; ip: string; reason: string; banned_at: string; }

type Status = "idle" | "loading" | "ok" | "error";

export default function AdminPage() {
  const [health, setHealth]       = useState<Health | null>(null);
  const [stats, setStats]         = useState<AppStats | null>(null);
  const [attempts, setAttempts]   = useState<Attempt[]>([]);
  const [bans, setBans]           = useState<BannedIp[]>([]);
  const [healthLoading, setHL]    = useState(false);
  const [waStatus, setWaStatus]   = useState<Status>("idle");
  const [briefStatus, setBrief]   = useState<Status>("idle");

  async function loadHealth() {
    setHL(true);
    try {
      const res = await fetch("/api/health");
      if (res.ok) setHealth(await res.json());
    } catch { /* ignore */ }
    setHL(false);
  }

  async function loadStats() {
    try {
      const res = await fetch("/api/admin/stats");
      if (res.ok) setStats(await res.json());
    } catch { /* ignore */ }
  }

  async function loadSecurity() {
    try {
      const [aRes, bRes] = await Promise.all([
        fetch("/api/security/attempts"),
        fetch("/api/security/bans"),
      ]);
      if (aRes.ok) setAttempts(await aRes.json());
      if (bRes.ok) setBans(await bRes.json());
    } catch { /* ignore */ }
  }

  async function unban(id: string) {
    await fetch("/api/security/bans", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setBans((prev) => prev.filter((b) => b.id !== id));
  }

  useEffect(() => {
    loadHealth();
    loadStats();
    loadSecurity();
  }, []);

  async function testWhatsApp() {
    setWaStatus("loading");
    const res = await fetch("/api/whatsapp/test", { method: "POST" });
    setWaStatus(res.ok ? "ok" : "error");
    setTimeout(() => setWaStatus("idle"), 4000);
  }

  async function sendBriefing() {
    setBrief("loading");
    const res = await fetch("/api/briefing", { method: "POST" });
    setBrief(res.ok ? "ok" : "error");
    setTimeout(() => setBrief("idle"), 4000);
  }

  const HealthIcon = ({ ok }: { ok: boolean }) =>
    ok ? <CheckCircle2 size={16} className="text-green-500" /> : <XCircle size={16} className="text-red-400" />;

  const BtnStatus = ({ status, idle, loading, ok, error, onClick, className = "" }: {
    status: Status; idle: string; loading: string; ok: string; error: string;
    onClick: () => void; className?: string;
  }) => (
    <button onClick={onClick} disabled={status === "loading"}
      className={`flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl transition-all disabled:opacity-60 ${
        status === "ok"    ? "bg-green-500 text-white" :
        status === "error" ? "bg-red-400 text-white" :
        className
      }`}>
      {status === "loading" ? <RefreshCw size={14} className="animate-spin" /> :
       status === "ok"      ? <CheckCircle2 size={14} /> :
       status === "error"   ? <XCircle size={14} /> : null}
      {status === "loading" ? loading : status === "ok" ? ok : status === "error" ? error : idle}
    </button>
  );

  return (
    <>
      <TopBar />
      <main className="flex-1 p-4 lg:p-8 max-w-4xl w-full mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#E0F7FF] flex items-center justify-center">
              <ShieldCheck size={20} className="text-[#00C8FF]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#0A1628]">Admin</h1>
              <p className="text-sm text-[#64748B]">Controle do sistema Lilly&apos;s</p>
            </div>
          </div>
          <button onClick={() => { loadHealth(); loadStats(); loadSecurity(); }}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F8FAFB] text-[#64748B] transition-colors">
            <RefreshCw size={14} className={healthLoading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* Health */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-sm mb-4">
          <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-3">Health Check</p>
          {health ? (
            <div className="space-y-2">
              {[
                { label: "Supabase",       ok: health.supabase,   icon: Database },
                { label: "WhatsApp API",   ok: health.whatsapp,   icon: MessageCircle },
                { label: "Dashboard Upflu",ok: health.dashboard,  icon: BarChart2 },
              ].map(({ label, ok, icon: Icon }) => (
                <div key={label} className="flex items-center justify-between py-1.5 border-b border-[#F1F5F9] last:border-0">
                  <div className="flex items-center gap-2">
                    <Icon size={14} className="text-[#64748B]" />
                    <span className="text-sm text-[#0A1628]">{label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <HealthIcon ok={ok} />
                    <span className={`text-xs font-medium ${ok ? "text-green-600" : "text-red-400"}`}>
                      {ok ? "Online" : "Offline"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2 animate-pulse">
              {[1,2,3].map((i) => <div key={i} className="h-8 bg-[#F8FAFB] rounded-lg" />)}
            </div>
          )}
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-4 gap-3 mb-4">
            {[
              { label: "Tarefas",  value: stats.tasks },
              { label: "Notas",    value: stats.notes },
              { label: "Lançamentos", value: stats.entries },
              { label: "Metas",    value: stats.goals },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white rounded-xl border border-[#E2E8F0] p-3 shadow-sm text-center">
                <p className="text-xl font-bold text-[#0A1628]">{value}</p>
                <p className="text-[10px] text-[#64748B]">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Ações */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-sm mb-4">
          <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-3">Ações</p>
          <div className="grid grid-cols-2 gap-3">
            <BtnStatus
              status={waStatus}
              idle="Testar WhatsApp"
              loading="Enviando..."
              ok="Enviado!"
              error="Falhou"
              onClick={testWhatsApp}
              className="bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"
            />
            <BtnStatus
              status={briefStatus}
              idle="Briefing agora"
              loading="Enviando..."
              ok="Enviado!"
              error="Falhou"
              onClick={sendBriefing}
              className="bg-[#E0F7FF] text-[#00C8FF] border border-[#B3EEFF] hover:bg-[#00C8FF] hover:text-white"
            />
          </div>
        </div>

        {/* Segurança — Tentativas de Login */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-sm mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <LogIn size={14} className="text-[#64748B]" />
              <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Tentativas de acesso</p>
            </div>
            <span className="text-[10px] text-[#94A3B8]">últimas 20</span>
          </div>
          {attempts.length === 0 ? (
            <p className="text-xs text-[#94A3B8]">Nenhum registro ainda.</p>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {attempts.map((a) => (
                <div key={a.id} className={`flex items-start gap-2 p-2 rounded-xl text-xs ${a.success ? "bg-green-50" : "bg-red-50"}`}>
                  {a.success
                    ? <CheckCircle2 size={13} className="text-green-500 mt-0.5 flex-shrink-0" />
                    : <XCircle size={13} className="text-red-400 mt-0.5 flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <span className="font-mono text-[#0A1628]">{a.ip}</span>
                    <span className={`ml-2 font-medium ${a.success ? "text-green-600" : "text-red-500"}`}>
                      {a.success ? "OK" : "FALHOU"}
                    </span>
                    <p className="text-[10px] text-[#94A3B8] truncate">{a.user_agent?.slice(0, 60)}</p>
                  </div>
                  <span className="text-[10px] text-[#94A3B8] flex-shrink-0 whitespace-nowrap">
                    {new Date(a.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Segurança — IPs Banidos */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-sm mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Ban size={14} className="text-red-400" />
            <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">IPs banidos</p>
            {bans.length > 0 && (
              <span className="ml-auto text-[10px] bg-red-50 text-red-500 px-2 py-0.5 rounded-full font-medium">{bans.length}</span>
            )}
          </div>
          {bans.length === 0 ? (
            <p className="text-xs text-[#94A3B8]">Nenhum IP banido.</p>
          ) : (
            <div className="space-y-1.5">
              {bans.map((b) => (
                <div key={b.id} className="flex items-center gap-2 p-2 rounded-xl bg-red-50">
                  <ShieldAlert size={13} className="text-red-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-mono text-[#0A1628]">{b.ip}</span>
                    {b.reason && <p className="text-[10px] text-[#94A3B8] truncate">{b.reason}</p>}
                  </div>
                  <button
                    onClick={() => unban(b.id)}
                    className="text-[10px] text-red-400 hover:text-red-600 border border-red-200 rounded-lg px-2 py-1 hover:bg-red-100 transition-colors flex-shrink-0"
                  >
                    Desbanir
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="bg-[#F8FAFB] rounded-2xl border border-[#E2E8F0] p-4">
          <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">Configuração</p>
          <div className="space-y-1.5 text-xs text-[#64748B]">
            <div className="flex items-center gap-2">
              <Wifi size={12} />
              <span>VPS: 2.25.168.207 · PM2 id 8 · porta 3003</span>
            </div>
            <div className="flex items-center gap-2">
              <Database size={12} />
              <span>Supabase: cbpqbmjpaxaakniaibld</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageCircle size={12} />
              <span>Evolution API v2 · instância LILLYS</span>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
