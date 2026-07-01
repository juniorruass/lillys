"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import TopBar from "@/components/layout/TopBar";
import { Settings, User, Bell, Flame, Rss, Plug, Plus, Trash2, Check, Loader2, Wifi, WifiOff, QrCode, LogOut, Users } from "lucide-react";
import { createClient } from "@/lib/supabase";

interface Habit { id: string; name: string; category: string; icon: string; active: boolean; }
interface WaUser { id: string; phone: string; name: string | null; created_at: string; }

const CATEGORIES = [
  { value: "espiritualidade", label: "Espiritualidade", icon: "🙏" },
  { value: "exercicio", label: "Exercício", icon: "💪" },
  { value: "estudo", label: "Estudo", icon: "📚" },
  { value: "leitura", label: "Leitura", icon: "📖" },
  { value: "outro", label: "Outro", icon: "⭐" },
];

const DEFAULT_FEEDS = [
  { label: "Brasil", url: "https://g1.globo.com/rss/g1/" },
  { label: "Mundo", url: "https://g1.globo.com/rss/g1/mundo/" },
  { label: "Tecnologia", url: "https://g1.globo.com/rss/g1/tecnologia/" },
  { label: "Meta / IA", url: "https://techcrunch.com/feed/" },
];

export default function ConfiguracoesPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [newHabit, setNewHabit] = useState({ name: "", category: "espiritualidade" });
  const [addingHabit, setAddingHabit] = useState(false);
  const [name, setName] = useState("Junior");
  const [feeds, setFeeds] = useState(DEFAULT_FEEDS);
  const [testingWA, setTestingWA] = useState(false);
  const [waStatus, setWaStatus] = useState<"idle" | "ok" | "error">("idle");
  const [integrations, setIntegrations] = useState({ supabase: false, openai: false, wa: false });
  const [instanceState, setInstanceState] = useState<"open" | "close" | "connecting" | "unknown">("unknown");
  const [qrCode, setQrCode] = useState<string>("");
  const [qrCountdown, setQrCountdown] = useState(0);
  const [connectingQR, setConnectingQR] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const qrRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [saved, setSaved] = useState(false);
  const [waUsers, setWaUsers] = useState<WaUser[]>([]);
  const [addingUser, setAddingUser] = useState(false);
  const [newUser, setNewUser] = useState({ phone: "", name: "" });
  const [savingUser, setSavingUser] = useState(false);
  const supabase = createClient();

  const loadHabits = useCallback(async () => {
    const { data } = await supabase.from("habits").select("*").order("created_at");
    setHabits(data ?? []);
  }, [supabase]);

  const loadWaUsers = useCallback(async () => {
    const { data } = await supabase.from("users").select("*").order("created_at");
    setWaUsers(data ?? []);
  }, [supabase]);

  const stopQrRefresh = useCallback(() => {
    if (qrRefreshRef.current) { clearInterval(qrRefreshRef.current); qrRefreshRef.current = null; }
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
    setQrCountdown(0);
  }, []);

  const fetchQr = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp/instance", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (data.qr) {
          setQrCode(data.qr);
          // Countdown regressivo de 20s
          setQrCountdown(20);
          if (countdownRef.current) clearInterval(countdownRef.current);
          countdownRef.current = setInterval(() => {
            setQrCountdown((n) => (n <= 1 ? 0 : n - 1));
          }, 1000);
        }
      }
    } catch { /* ignore */ }
  }, []);

  const checkInstanceState = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp/instance");
      if (res.ok) {
        const data = await res.json();
        setInstanceState(data.state);
        if (data.state === "open") {
          setQrCode("");
          stopQrRefresh();
          if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
        }
      }
    } catch { /* ignore */ }
  }, [stopQrRefresh]);

  useEffect(() => {
    loadHabits();
    loadWaUsers();
    const stored = localStorage.getItem("lillys_settings");
    if (stored) {
      try {
        const s = JSON.parse(stored);
        if (s.name) setName(s.name);
        if (s.feeds) setFeeds(s.feeds);
      } catch { /* ignore */ }
    }
    checkIntegrations();
    checkInstanceState();
  }, [loadHabits, loadWaUsers, checkInstanceState]);

  // Para todos os timers ao desmontar
  useEffect(() => { return () => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (qrRefreshRef.current) clearInterval(qrRefreshRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  }; }, []);

  async function connectInstance() {
    setConnectingQR(true);
    setQrCode("");
    stopQrRefresh();
    await fetchQr();
    // Polling de estado a cada 4s
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(checkInstanceState, 4000);
    // Renova o QR a cada 18s (expira em ~20s)
    qrRefreshRef.current = setInterval(fetchQr, 18000);
    setConnectingQR(false);
  }

  async function disconnectInstance() {
    setDisconnecting(true);
    try {
      await fetch("/api/whatsapp/instance", { method: "DELETE" });
      setInstanceState("close");
      setQrCode("");
    } catch { /* ignore */ }
    setDisconnecting(false);
  }

  async function checkIntegrations() {
    try {
      const res = await fetch("/api/health");
      if (res.ok) {
        const data = await res.json();
        setIntegrations({ supabase: !!data.supabase, openai: !!data.openai, wa: !!data.wa });
      }
    } catch { /* deixa como false */ }
  }

  async function addHabit() {
    if (!newHabit.name.trim()) return;
    const cat = CATEGORIES.find((c) => c.value === newHabit.category);
    await supabase.from("habits").insert({
      name: newHabit.name.trim(),
      category: newHabit.category,
      icon: cat?.icon ?? "⭐",
      active: true,
    });
    setNewHabit({ name: "", category: "espiritualidade" });
    setAddingHabit(false);
    loadHabits();
  }

  async function toggleHabit(id: string, active: boolean) {
    await supabase.from("habits").update({ active: !active }).eq("id", id);
    loadHabits();
  }

  async function removeHabit(id: string) {
    await supabase.from("habits").delete().eq("id", id);
    loadHabits();
  }

  function saveProfile() {
    const current = JSON.parse(localStorage.getItem("lillys_settings") ?? "{}");
    localStorage.setItem("lillys_settings", JSON.stringify({ ...current, name, feeds }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function testWhatsApp() {
    setTestingWA(true);
    try {
      const res = await fetch("/api/whatsapp/test", { method: "POST" });
      setWaStatus(res.ok ? "ok" : "error");
    } catch {
      setWaStatus("error");
    }
    setTestingWA(false);
    setTimeout(() => setWaStatus("idle"), 4000);
  }

  async function addWaUser() {
    const phone = newUser.phone.replace(/\D/g, "");
    if (phone.length < 10) return;
    setSavingUser(true);
    await supabase.from("users").insert({ phone, name: newUser.name.trim() || null });
    setNewUser({ phone: "", name: "" });
    setAddingUser(false);
    setSavingUser(false);
    loadWaUsers();
  }

  async function removeWaUser(id: string) {
    await supabase.from("users").delete().eq("id", id);
    loadWaUsers();
  }

  function updateFeed(i: number, field: "label" | "url", val: string) {
    setFeeds((f) => f.map((item, idx) => idx === i ? { ...item, [field]: val } : item));
  }

  return (
    <>
      <TopBar />
      <main className="flex-1 p-4 lg:p-8 max-w-4xl w-full mx-auto space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-[#E0F7FF] flex items-center justify-center">
            <Settings size={20} className="text-[#00C8FF]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#0A1628]">Configurações</h1>
            <p className="text-sm text-[#64748B]">Personalize o Lilly&apos;s</p>
          </div>
        </div>

        {/* ── Perfil ─────────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <User size={16} className="text-[#00C8FF]" />
            <h2 className="font-semibold text-[#0A1628]">Perfil</h2>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wider block mb-1.5">
                Nome na saudação
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-sm border border-[#E2E8F0] rounded-xl px-3 py-2.5 outline-none focus:border-[#00C8FF] bg-[#F8FAFB]"
                placeholder="Seu nome"
              />
              <p className="text-xs text-[#94A3B8] mt-1">Aparece no hero: &quot;Boa tarde, {name}!&quot;</p>
            </div>
            <button
              onClick={saveProfile}
              className="flex items-center gap-2 px-4 py-2 bg-[#00C8FF] text-white text-sm font-semibold rounded-xl hover:bg-[#0099CC] transition-colors"
            >
              {saved ? <><Check size={14} /> Salvo!</> : "Salvar perfil"}
            </button>
          </div>
        </section>

        {/* ── Hábitos ────────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Flame size={16} className="text-orange-400" />
              <h2 className="font-semibold text-[#0A1628]">Hábitos</h2>
            </div>
            <button
              onClick={() => setAddingHabit(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#00C8FF] hover:text-[#0099CC]"
            >
              <Plus size={13} /> Novo hábito
            </button>
          </div>

          {addingHabit && (
            <div className="flex gap-2 mb-4">
              <input
                autoFocus
                value={newHabit.name}
                onChange={(e) => setNewHabit({ ...newHabit, name: e.target.value })}
                onKeyDown={(e) => { if (e.key === "Enter") addHabit(); if (e.key === "Escape") setAddingHabit(false); }}
                placeholder="Nome do hábito"
                className="flex-1 text-sm border border-[#E2E8F0] rounded-xl px-3 py-2 outline-none focus:border-[#00C8FF] bg-[#F8FAFB]"
              />
              <select
                value={newHabit.category}
                onChange={(e) => setNewHabit({ ...newHabit, category: e.target.value })}
                className="text-xs border border-[#E2E8F0] rounded-xl px-2 py-2 outline-none bg-[#F8FAFB] text-[#64748B]"
              >
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
              </select>
              <button onClick={addHabit} className="px-3 py-2 bg-[#00C8FF] text-white text-xs font-semibold rounded-xl">OK</button>
            </div>
          )}

          <div className="space-y-2">
            {habits.map((h) => (
              <div key={h.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-[#E2E8F0] hover:border-[#B3EEFF] transition-colors">
                <span className="text-lg">{h.icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#0A1628]">{h.name}</p>
                  <p className="text-xs text-[#94A3B8]">{CATEGORIES.find((c) => c.value === h.category)?.label}</p>
                </div>
                <button
                  onClick={() => toggleHabit(h.id, h.active)}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                    h.active ? "bg-[#E0F7FF] text-[#00C8FF]" : "bg-[#F8FAFB] text-[#94A3B8]"
                  }`}
                >
                  {h.active ? "Ativo" : "Inativo"}
                </button>
                <button
                  onClick={() => removeHabit(h.id)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-[#C4D4E0] hover:text-red-400 transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
            {habits.length === 0 && (
              <p className="text-sm text-[#94A3B8] text-center py-4">Nenhum hábito cadastrado</p>
            )}
          </div>
        </section>

        {/* ── WhatsApp ───────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Bell size={16} className="text-green-500" />
            <h2 className="font-semibold text-[#0A1628]">WhatsApp</h2>
          </div>
          <div className="space-y-3">

            {/* Status da instância */}
            <div className="flex items-center justify-between p-3 bg-[#F8FAFB] rounded-xl">
              <div className="flex items-center gap-2">
                {instanceState === "open"
                  ? <Wifi size={15} className="text-green-500" />
                  : instanceState === "connecting"
                  ? <Loader2 size={15} className="text-yellow-500 animate-spin" />
                  : <WifiOff size={15} className="text-[#94A3B8]" />}
                <div>
                  <p className="text-sm font-medium text-[#0A1628]">Instância LILLYS</p>
                  <p className="text-xs text-[#94A3B8]">Evolution API · {process.env.NEXT_PUBLIC_EVOLUTION_HOST ?? "2.25.168.207:8080"}</p>
                </div>
              </div>
              <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${
                instanceState === "open"       ? "bg-green-100 text-green-700" :
                instanceState === "connecting" ? "bg-yellow-100 text-yellow-700" :
                instanceState === "close"      ? "bg-red-50 text-red-500" :
                "bg-[#F8FAFB] text-[#94A3B8]"
              }`}>
                {instanceState === "open" ? "Conectado" : instanceState === "connecting" ? "Conectando..." : instanceState === "close" ? "Desconectado" : "Verificando..."}
              </span>
            </div>

            {/* QR Code */}
            {qrCode && instanceState !== "open" && (
              <div className="flex flex-col items-center gap-2 p-4 bg-[#F8FAFB] rounded-xl border border-dashed border-[#B3EEFF]">
                <div className="flex items-center justify-between w-full">
                  <p className="text-xs text-[#64748B] font-medium">Escaneie com o WhatsApp</p>
                  {qrCountdown > 0 && (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${qrCountdown <= 5 ? "bg-red-50 text-red-400" : "bg-[#E0F7FF] text-[#00C8FF]"}`}>
                      {qrCountdown}s
                    </span>
                  )}
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrCode} alt="QR Code WhatsApp" className="w-52 h-52 rounded-xl" />
                <p className="text-[10px] text-[#94A3B8] text-center">WhatsApp → Dispositivos conectados → Conectar dispositivo</p>
                <p className="text-[10px] text-[#B3EEFF] text-center">QR renova automaticamente a cada 18s</p>
              </div>
            )}

            {/* Ações de conexão */}
            <div className="flex gap-2">
              {instanceState !== "open" ? (
                <button
                  onClick={connectInstance}
                  disabled={connectingQR}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 disabled:opacity-60 transition-colors"
                >
                  {connectingQR ? <Loader2 size={14} className="animate-spin" /> : <QrCode size={14} />}
                  {connectingQR ? "Gerando QR..." : qrCode ? "Atualizar QR" : "Conectar WhatsApp"}
                </button>
              ) : (
                <button
                  onClick={disconnectInstance}
                  disabled={disconnecting}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl bg-red-50 text-red-500 border border-red-200 hover:bg-red-100 disabled:opacity-60 transition-colors"
                >
                  {disconnecting ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
                  {disconnecting ? "Desconectando..." : "Desconectar"}
                </button>
              )}
              <button
                onClick={checkInstanceState}
                className="w-10 h-10 flex items-center justify-center rounded-xl border border-[#E2E8F0] text-[#64748B] hover:border-[#00C8FF] hover:text-[#00C8FF] transition-colors flex-shrink-0"
                title="Atualizar status"
              >
                <Bell size={14} />
              </button>
            </div>

            {/* Separador */}
            <div className="border-t border-[#F1F5F9]" />

            {/* Infos cron */}
            <div className="flex items-center justify-between p-3 bg-[#F8FAFB] rounded-xl">
              <div>
                <p className="text-sm font-medium text-[#0A1628]">Briefing matinal</p>
                <p className="text-xs text-[#94A3B8]">Enviado às 8h via cron</p>
              </div>
              <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-1 rounded-lg">Ativo</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-[#F8FAFB] rounded-xl">
              <div>
                <p className="text-sm font-medium text-[#0A1628]">Resumo noturno</p>
                <p className="text-xs text-[#94A3B8]">Enviado às 21h via cron</p>
              </div>
              <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-1 rounded-lg">Ativo</span>
            </div>

            {/* Teste de envio */}
            <button
              onClick={testWhatsApp}
              disabled={testingWA}
              className={`w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl transition-colors ${
                waStatus === "ok" ? "bg-green-500 text-white" :
                waStatus === "error" ? "bg-red-400 text-white" :
                "border border-[#E2E8F0] text-[#0A1628] hover:border-[#00C8FF]"
              }`}
            >
              {testingWA ? <Loader2 size={14} className="animate-spin" /> : null}
              {waStatus === "ok" ? "✓ Mensagem enviada!" : waStatus === "error" ? "✕ Falhou — verifique a instância" : "Testar envio WA"}
            </button>
          </div>
        </section>

        {/* ── Usuários WhatsApp ──────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-[#00C8FF]" />
              <h2 className="font-semibold text-[#0A1628]">Usuários WhatsApp</h2>
            </div>
            <button
              onClick={() => setAddingUser(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#00C8FF] hover:text-[#0099CC]"
            >
              <Plus size={13} /> Adicionar
            </button>
          </div>

          {addingUser && (
            <div className="flex gap-2 mb-4">
              <input
                autoFocus
                value={newUser.phone}
                onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                onKeyDown={(e) => { if (e.key === "Enter") addWaUser(); if (e.key === "Escape") setAddingUser(false); }}
                placeholder="55119XXXXXXXX"
                className="flex-1 text-sm border border-[#E2E8F0] rounded-xl px-3 py-2 outline-none focus:border-[#00C8FF] bg-[#F8FAFB]"
              />
              <input
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                onKeyDown={(e) => { if (e.key === "Enter") addWaUser(); if (e.key === "Escape") setAddingUser(false); }}
                placeholder="Nome (opcional)"
                className="flex-1 text-sm border border-[#E2E8F0] rounded-xl px-3 py-2 outline-none focus:border-[#00C8FF] bg-[#F8FAFB]"
              />
              <button
                onClick={addWaUser}
                disabled={savingUser}
                className="px-3 py-2 bg-[#00C8FF] text-white text-xs font-semibold rounded-xl disabled:opacity-60"
              >
                {savingUser ? <Loader2 size={13} className="animate-spin" /> : "OK"}
              </button>
            </div>
          )}

          <div className="space-y-2">
            {waUsers.map((u) => (
              <div key={u.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-[#E2E8F0]">
                <div className="w-8 h-8 rounded-full bg-[#E0F7FF] flex items-center justify-center flex-shrink-0">
                  <User size={14} className="text-[#00C8FF]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#0A1628]">{u.name ?? "Sem nome"}</p>
                  <p className="text-xs text-[#94A3B8] font-mono">+{u.phone}</p>
                </div>
                <button
                  onClick={() => removeWaUser(u.id)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-[#C4D4E0] hover:text-red-400 transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
            {waUsers.length === 0 && (
              <p className="text-sm text-[#94A3B8] text-center py-4">Nenhum usuário cadastrado</p>
            )}
          </div>
          <p className="text-xs text-[#94A3B8] mt-3">Só números cadastrados aqui recebem resposta da Lilly.</p>
        </section>

        {/* ── Feeds de notícias ──────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Rss size={16} className="text-[#00C8FF]" />
            <h2 className="font-semibold text-[#0A1628]">Feeds de Notícias</h2>
          </div>
          <div className="space-y-2">
            {feeds.map((f, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={f.label}
                  onChange={(e) => updateFeed(i, "label", e.target.value)}
                  className="w-24 text-xs border border-[#E2E8F0] rounded-lg px-2 py-2 outline-none focus:border-[#00C8FF] bg-[#F8FAFB]"
                  placeholder="Label"
                />
                <input
                  value={f.url}
                  onChange={(e) => updateFeed(i, "url", e.target.value)}
                  className="flex-1 text-xs border border-[#E2E8F0] rounded-lg px-2 py-2 outline-none focus:border-[#00C8FF] bg-[#F8FAFB]"
                  placeholder="URL do feed RSS"
                />
              </div>
            ))}
          </div>
          <button onClick={saveProfile} className="mt-3 text-xs text-[#00C8FF] font-semibold hover:text-[#0099CC]">
            Salvar feeds
          </button>
        </section>

        {/* ── Integrações ────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Plug size={16} className="text-[#64748B]" />
            <h2 className="font-semibold text-[#0A1628]">Integrações</h2>
          </div>
          <div className="space-y-2">
            {[
              { label: "Supabase", desc: "Banco de dados", ok: integrations.supabase },
              { label: "OpenAI (GPT-4o mini)", desc: "IA Pessoal", ok: integrations.openai },
              { label: "WhatsApp (Evolution API)", desc: "Bot de comandos", ok: integrations.wa },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between p-3 bg-[#F8FAFB] rounded-xl">
                <div>
                  <p className="text-sm font-medium text-[#0A1628]">{item.label}</p>
                  <p className="text-xs text-[#94A3B8]">{item.desc}</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${
                  item.ok ? "bg-green-100 text-green-700" : "bg-[#FFF3CD] text-yellow-700"
                }`}>
                  {item.ok ? "Conectado" : "Verificando..."}
                </span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
