"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import TopBar from "@/components/layout/TopBar";
import { Users, RefreshCw, Search, Bot, ChevronDown, ChevronUp, CheckCircle2, AlertTriangle } from "lucide-react";
import Marquee from "@/components/ui/Marquee";

interface Group {
  jid: string;
  subject: string;
  size: number;
  client_name: string | null;
  attend_enabled: boolean;
  knowledge: string | null;
  daily_bom_dia: boolean;
  daily_pergunta: boolean;
  daily_metricas: boolean;
  daily_relatorios: boolean;
  daily_lembretes: boolean;
}

type DailyKey = "daily_bom_dia" | "daily_pergunta" | "daily_metricas" | "daily_relatorios" | "daily_lembretes";

const DAILY_TOGGLES: { key: DailyKey; label: string }[] = [
  { key: "daily_bom_dia", label: "Bom dia" },
  { key: "daily_pergunta", label: "Pergunta" },
  { key: "daily_metricas", label: "Métricas" },
  { key: "daily_relatorios", label: "Relatórios" },
  { key: "daily_lembretes", label: "Lembretes" },
];

interface Client {
  name: string;
  status: string;
  has_meta: boolean;
}

export default function GruposPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const [openJid, setOpenJid] = useState<string | null>(null);
  const [draft, setDraft] = useState<{
    client_name: string; knowledge: string;
    daily_bom_dia: boolean; daily_pergunta: boolean; daily_metricas: boolean; daily_relatorios: boolean; daily_lembretes: boolean;
  }>({ client_name: "", knowledge: "", daily_bom_dia: true, daily_pergunta: true, daily_metricas: true, daily_relatorios: true, daily_lembretes: true });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [groupsRes, clientsRes] = await Promise.all([
        fetch("/api/whatsapp/groups"),
        fetch("/api/clients-list"),
      ]);
      if (!groupsRes.ok) throw new Error();
      const groupsData = await groupsRes.json();
      setGroups(groupsData.groups ?? []);
      if (clientsRes.ok) {
        const clientsData = await clientsRes.json();
        setClients(clientsData.clients ?? []);
      }
    } catch {
      setError(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) => g.subject?.toLowerCase().includes(q));
  }, [groups, query]);

  function draftFrom(g: Group) {
    return {
      client_name: g.client_name ?? "", knowledge: g.knowledge ?? "",
      daily_bom_dia: g.daily_bom_dia ?? true, daily_pergunta: g.daily_pergunta ?? true,
      daily_metricas: g.daily_metricas ?? true, daily_relatorios: g.daily_relatorios ?? true,
      daily_lembretes: g.daily_lembretes ?? true,
    };
  }

  function openEditor(g: Group) {
    setOpenJid(g.jid === openJid ? null : g.jid);
    setDraft(draftFrom(g));
  }

  async function toggleAttend(g: Group) {
    const next = !g.attend_enabled;
    setGroups((prev) => prev.map((x) => (x.jid === g.jid ? { ...x, attend_enabled: next } : x)));
    await fetch("/api/whatsapp/groups", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jid: g.jid, attend_enabled: next, client_name: g.client_name, knowledge: g.knowledge }),
    });
    // Ativou agora — abre o editor direto, senão ninguém acha onde configurar
    if (next) {
      setOpenJid(g.jid);
      setDraft(draftFrom(g));
    }
  }

  async function save(g: Group) {
    setSaving(true);
    await fetch("/api/whatsapp/groups", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jid: g.jid, attend_enabled: g.attend_enabled, client_name: draft.client_name || null, knowledge: draft.knowledge,
        daily_bom_dia: draft.daily_bom_dia, daily_pergunta: draft.daily_pergunta, daily_metricas: draft.daily_metricas,
        daily_relatorios: draft.daily_relatorios, daily_lembretes: draft.daily_lembretes,
      }),
    });
    setGroups((prev) => prev.map((x) => (x.jid === g.jid ? {
      ...x, client_name: draft.client_name || null, knowledge: draft.knowledge,
      daily_bom_dia: draft.daily_bom_dia, daily_pergunta: draft.daily_pergunta, daily_metricas: draft.daily_metricas,
      daily_relatorios: draft.daily_relatorios, daily_lembretes: draft.daily_lembretes,
    } : x)));
    setSaving(false);
    setOpenJid(null);
  }

  const selectedClient = clients.find((c) => c.name === draft.client_name);

  return (
    <>
      <TopBar />
      <div className="border-b border-[#E2E8F0] py-1.5 bg-white/60 backdrop-blur-sm">
        <Marquee items={["Grupos do WhatsApp", "Modo atendente", "Selecione quem a Lilly atende"]} speed={35} className="text-[10px] font-semibold tracking-widest uppercase text-[#00C8FF]/50" separator="·" />
      </div>
      <main className="flex-1 p-4 lg:p-8 max-w-4xl w-full mx-auto">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#E0F7FF] flex items-center justify-center">
              <Users size={20} className="text-[#00C8FF]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#0A1628]">Grupos</h1>
              <p className="text-xs text-[#64748B]">Lista sempre sincronizada com o WhatsApp</p>
            </div>
          </div>
          <button onClick={load} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F8FAFB] text-[#64748B] transition-colors">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="relative mb-4">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar grupo..."
            className="w-full text-sm border border-[#E2E8F0] rounded-xl pl-9 pr-3 py-2 outline-none focus:border-[#00C8FF] bg-white"
          />
        </div>

        {error && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 text-center mb-4">
            <p className="text-sm text-orange-600 font-medium">Não foi possível sincronizar com a Evolution API</p>
            <button onClick={load} className="mt-2 text-xs text-orange-600 underline">Tentar novamente</button>
          </div>
        )}

        {loading && groups.length === 0 && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-[#E2E8F0] p-3 animate-pulse h-16" />
            ))}
          </div>
        )}

        <div className="space-y-2">
          {filtered.map((g) => {
            const groupClient = clients.find((c) => c.name === g.client_name);
            const open = openJid === g.jid;
            return (
              <div key={g.jid} className={`bg-white rounded-xl border p-3 transition-colors ${g.attend_enabled ? "border-[#00C8FF]" : "border-[#E2E8F0]"}`}>
                <div className="flex items-center gap-3">
                  <button
                    className="flex-1 min-w-0 flex items-center gap-2 text-left"
                    onClick={() => openEditor(g)}
                  >
                    {open ? <ChevronUp size={14} className="text-[#94A3B8] shrink-0" /> : <ChevronDown size={14} className="text-[#94A3B8] shrink-0" />}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#0A1628] truncate">{g.subject || "(sem nome)"}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-[#94A3B8]">{g.size} membros</span>
                        {g.client_name && (
                          <span className="text-[10px] bg-[#E0F7FF] text-[#00C8FF] px-1.5 py-0.5 rounded font-semibold flex items-center gap-1">
                            {g.client_name}
                            {groupClient?.has_meta ? (
                              <CheckCircle2 size={10} className="text-green-600" />
                            ) : (
                              <AlertTriangle size={10} className="text-orange-500" />
                            )}
                          </span>
                        )}
                        {g.attend_enabled && !g.knowledge && (
                          <span className="text-[10px] text-orange-500 font-medium">configurar →</span>
                        )}
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() => toggleAttend(g)}
                    className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      g.attend_enabled ? "bg-[#00C8FF] text-white" : "bg-[#F8FAFB] text-[#64748B] border border-[#E2E8F0]"
                    }`}
                  >
                    <Bot size={12} /> {g.attend_enabled ? "Atendendo" : "Atender"}
                  </button>
                </div>

                {open && (
                  <div className="mt-3 pt-3 border-t border-[#E2E8F0] space-y-2">
                    <div>
                      <label className="text-[10px] font-semibold text-[#64748B] uppercase block mb-1">Cliente (bate com o cadastro de tráfego)</label>
                      <select
                        value={draft.client_name}
                        onChange={(e) => setDraft({ ...draft, client_name: e.target.value })}
                        className="w-full text-sm border border-[#E2E8F0] rounded-xl px-3 py-2 outline-none focus:border-[#00C8FF] bg-[#F8FAFB]"
                      >
                        <option value="">Nenhum (não conecta com relatório de campanha)</option>
                        {clients.map((c) => (
                          <option key={c.name} value={c.name}>{c.name}{c.has_meta ? "" : " (sem Meta Ads configurado)"}</option>
                        ))}
                      </select>
                      {draft.client_name && (
                        <p className={`text-[11px] mt-1 flex items-center gap-1 ${selectedClient?.has_meta ? "text-green-600" : "text-orange-500"}`}>
                          {selectedClient?.has_meta ? (
                            <><CheckCircle2 size={11} /> Conectado ao tráfego — relatórios vão puxar dado real do Meta Ads</>
                          ) : (
                            <><AlertTriangle size={11} /> Esse cliente ainda não tem Meta Ads configurado no upflu-dashboard — relatório/mensagem diária não vai ter dado de campanha até isso ser resolvido</>
                          )}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-[#64748B] uppercase block mb-1">O que a Lilly deve saber sobre esse cliente</label>
                      <textarea
                        value={draft.knowledge}
                        onChange={(e) => setDraft({ ...draft, knowledge: e.target.value })}
                        placeholder="Ex: contratou tráfego pago + site. Prazo de resposta padrão: até 2h úteis. Dúvidas comuns: horário de atendimento, como pausar campanha, etc."
                        rows={5}
                        className="w-full text-sm border border-[#E2E8F0] rounded-xl px-3 py-2 outline-none focus:border-[#00C8FF] bg-[#F8FAFB] resize-none"
                      />
                      <p className="text-[10px] text-[#94A3B8] mt-1">Enquanto isso ficar vazio, ela só responde com certeza absoluta e escala o resto pra você.</p>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-[#64748B] uppercase block mb-1">Mensagem diária inclui</label>
                      <div className="flex flex-wrap gap-2">
                        {DAILY_TOGGLES.map((t) => {
                          const checked = draft[t.key];
                          return (
                            <button
                              key={t.key}
                              type="button"
                              onClick={() => setDraft({ ...draft, [t.key]: !checked })}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                                checked ? "bg-[#00C8FF] text-white border-[#00C8FF]" : "bg-[#F8FAFB] text-[#94A3B8] border-[#E2E8F0]"
                              }`}
                            >
                              {t.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => save(g)} disabled={saving} className="flex-1 py-2 bg-[#00C8FF] text-white text-sm font-semibold rounded-xl hover:bg-[#0099CC] transition-colors disabled:opacity-50">
                        {saving ? "Salvando..." : "Salvar"}
                      </button>
                      <button onClick={() => setOpenJid(null)} className="px-4 text-sm text-[#64748B]">Fechar</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </>
  );
}
