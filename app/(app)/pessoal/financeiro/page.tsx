"use client";
import { useState, useEffect, useCallback } from "react";
import TopBar from "@/components/layout/TopBar";
import { DollarSign, Plus, TrendingUp, TrendingDown, Trash2, CalendarCheck } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import Marquee from "@/components/ui/Marquee";

interface Entry { id: string; type: string; amount: number; category: string; description: string; date: string; }

const CATEGORIES = ["alimentacao","transporte","lazer","saude","investimento","assinatura","outros"];
const catLabel: Record<string,string> = {
  alimentacao:"Alimentação", transporte:"Transporte", lazer:"Lazer",
  saude:"Saúde", investimento:"Investimento", assinatura:"Assinatura", outros:"Outros"
};

function fmt(n: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
}

type Tab = "lancamentos" | "contas";

export default function FinanceiroPage() {
  const [tab, setTab] = useState<Tab>("lancamentos");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [contas, setContas] = useState<Entry[]>([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ type: "saida", amount: "", category: "outros", description: "", date: new Date().toISOString().split("T")[0] });
  const [contaForm, setContaForm] = useState({ amount: "", description: "", date: new Date().toISOString().split("T")[0] });
  const [pagandoId, setPagandoId] = useState<string | null>(null);
  const [valorPago, setValorPago] = useState("");
  const supabase = createClient();

  const load = useCallback(async () => {
    const start = startOfMonth(new Date()).toISOString().split("T")[0];
    const end = endOfMonth(new Date()).toISOString().split("T")[0];
    const [{ data: e }, { data: c }] = await Promise.all([
      supabase.from("finance_entries").select("*").in("type", ["entrada","saida"]).gte("date", start).lte("date", end).order("date", { ascending: false }),
      supabase.from("finance_entries").select("*").eq("type", "conta").order("date"),
    ]);
    setEntries(e ?? []);
    setContas(c ?? []);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  async function add() {
    if (!form.amount) return;
    await supabase.from("finance_entries").insert({
      type: form.type, amount: parseFloat(form.amount),
      category: form.category, description: form.description, date: form.date,
    });
    setForm({ type: "saida", amount: "", category: "outros", description: "", date: new Date().toISOString().split("T")[0] });
    setAdding(false);
    load();
  }

  async function addConta() {
    if (!contaForm.amount || !contaForm.description) return;
    await supabase.from("finance_entries").insert({
      type: "conta", amount: parseFloat(contaForm.amount),
      category: "outros", description: contaForm.description, date: contaForm.date,
    });
    setContaForm({ amount: "", description: "", date: new Date().toISOString().split("T")[0] });
    setAdding(false);
    load();
  }

  async function pagarConta(conta: Entry, valorReal: number) {
    await supabase.from("finance_entries").update({
      type: "saida",
      amount: valorReal,
      date: new Date().toISOString().split("T")[0],
    }).eq("id", conta.id);
    setPagandoId(null);
    setValorPago("");
    load();
  }

  function iniciarPagamento(conta: Entry) {
    setPagandoId(conta.id);
    setValorPago(String(conta.amount));
  }

  async function remove(id: string) {
    await supabase.from("finance_entries").delete().eq("id", id);
    load();
  }

  const total_entrada = entries.filter((e) => e.type === "entrada").reduce((s, e) => s + e.amount, 0);
  const total_saida = entries.filter((e) => e.type === "saida").reduce((s, e) => s + e.amount, 0);
  const saldo = total_entrada - total_saida;
  const total_contas = contas.reduce((s, c) => s + c.amount, 0);

  const today = new Date().toISOString().split("T")[0];

  const finMarquee = [
    `Entradas ${fmt(total_entrada)}`,
    `Saídas ${fmt(total_saida)}`,
    `Saldo ${fmt(saldo)}`,
    `${contas.length} contas a pagar`,
    "Controle financeiro", "Planejamento", "Disciplina", "Crescimento",
  ];

  return (
    <>
      <TopBar />
      <div className="border-b border-[#E2E8F0] py-1.5 bg-white/60 backdrop-blur-sm">
        <Marquee items={finMarquee} speed={40} className="text-[10px] font-semibold tracking-widest uppercase text-[#00C8FF]/50" separator="·" />
      </div>
      <main className="flex-1 p-4 lg:p-8 max-w-4xl w-full mx-auto">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-green-50 flex items-center justify-center">
              <DollarSign size={20} className="text-green-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#0A1628]">Financeiro</h1>
              <p className="text-sm text-[#64748B] capitalize">{format(new Date(), "MMMM yyyy", { locale: ptBR })}</p>
            </div>
          </div>
          <button onClick={() => setAdding(true)} className="flex items-center gap-2 px-4 py-2 bg-[#00C8FF] text-white text-sm font-semibold rounded-xl hover:bg-[#0099CC] transition-colors shadow-sm shadow-[#00C8FF]/30">
            <Plus size={16} /> {tab === "contas" ? "Nova conta" : "Lançar"}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-[#F8FAFB] rounded-xl p-1 mb-5">
          {(["lancamentos", "contas"] as Tab[]).map((t) => (
            <button key={t} onClick={() => { setTab(t); setAdding(false); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${tab === t ? "bg-white text-[#0A1628] shadow-sm" : "text-[#64748B]"}`}>
              {t === "lancamentos" ? "Lançamentos" : `Contas a Pagar${contas.length > 0 ? ` (${contas.length})` : ""}`}
            </button>
          ))}
        </div>

        {/* ── LANÇAMENTOS ─────────────────────────────────────────── */}
        {tab === "lancamentos" && (
          <>
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="glass-card tilt-card p-3">
                <p className="text-[10px] font-semibold text-[#64748B] uppercase mb-1">Entradas</p>
                <p className="text-base font-bold text-green-600">{fmt(total_entrada)}</p>
              </div>
              <div className="glass-card tilt-card p-3">
                <p className="text-[10px] font-semibold text-[#64748B] uppercase mb-1">Saídas</p>
                <p className="text-base font-bold text-red-500">{fmt(total_saida)}</p>
              </div>
              <div className={`glass-card tilt-card p-3 ${saldo >= 0 ? "border-green-200/60" : "border-red-200/60"}`}>
                <p className="text-[10px] font-semibold text-[#64748B] uppercase mb-1">Saldo</p>
                <p className={`text-base font-bold ${saldo >= 0 ? "text-green-600" : "text-red-500"}`}>{fmt(saldo)}</p>
              </div>
            </div>

            {adding && (
              <div className="bg-white rounded-2xl border border-[#00C8FF] p-4 mb-5 shadow-sm space-y-3">
                <div className="flex gap-2">
                  <button onClick={() => setForm({ ...form, type: "entrada" })}
                    className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-colors ${form.type === "entrada" ? "bg-green-500 text-white" : "bg-[#F8FAFB] text-[#64748B] border border-[#E2E8F0]"}`}>
                    + Entrada
                  </button>
                  <button onClick={() => setForm({ ...form, type: "saida" })}
                    className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-colors ${form.type === "saida" ? "bg-red-400 text-white" : "bg-[#F8FAFB] text-[#64748B] border border-[#E2E8F0]"}`}>
                    - Saída
                  </button>
                </div>
                <input autoFocus type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="Valor (R$)" className="w-full text-sm border border-[#E2E8F0] rounded-xl px-3 py-2 outline-none focus:border-[#00C8FF] bg-[#F8FAFB]" />
                <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Descrição" className="w-full text-sm border border-[#E2E8F0] rounded-xl px-3 py-2 outline-none focus:border-[#00C8FF] bg-[#F8FAFB]" />
                <div className="flex gap-2">
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="flex-1 text-xs border border-[#E2E8F0] rounded-xl px-3 py-2 outline-none bg-[#F8FAFB] text-[#64748B]">
                    {CATEGORIES.map((c) => <option key={c} value={c}>{catLabel[c]}</option>)}
                  </select>
                  <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="flex-1 text-xs border border-[#E2E8F0] rounded-xl px-3 py-2 outline-none bg-[#F8FAFB] text-[#64748B]" />
                </div>
                <div className="flex gap-2">
                  <button onClick={add} className="flex-1 py-2 bg-[#00C8FF] text-white text-sm font-semibold rounded-xl hover:bg-[#0099CC] transition-colors">Salvar</button>
                  <button onClick={() => setAdding(false)} className="px-4 text-sm text-[#64748B]">Cancelar</button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {entries.map((e) => (
                <div key={e.id} className="flex items-center gap-3 bg-white rounded-xl border border-[#E2E8F0] p-3 hover:border-[#B3EEFF] transition-colors group">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${e.type === "entrada" ? "bg-green-50" : "bg-red-50"}`}>
                    {e.type === "entrada" ? <TrendingUp size={14} className="text-green-500" /> : <TrendingDown size={14} className="text-red-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#0A1628]">{e.description || catLabel[e.category]}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-[#94A3B8]">{e.date}</span>
                      <span className="text-[10px] bg-[#F8FAFB] text-[#64748B] px-1.5 py-0.5 rounded">{catLabel[e.category]}</span>
                    </div>
                  </div>
                  <span className={`text-sm font-bold ${e.type === "entrada" ? "text-green-600" : "text-red-500"}`}>
                    {e.type === "entrada" ? "+" : "-"}{fmt(e.amount)}
                  </span>
                  <button onClick={() => remove(e.id)} className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded-lg hover:bg-red-50 text-[#94A3B8] hover:text-red-400 transition-all">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
              {entries.length === 0 && !adding && (
                <div className="text-center py-12">
                  <DollarSign size={32} className="text-[#E2E8F0] mx-auto mb-2" />
                  <p className="text-sm text-[#64748B]">Nenhum lançamento este mês</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── CONTAS A PAGAR ──────────────────────────────────────── */}
        {tab === "contas" && (
          <>
            {contas.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-2xl p-3 mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-orange-700">Total a pagar</p>
                  <p className="text-lg font-bold text-orange-600">{fmt(total_contas)}</p>
                </div>
                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-lg font-semibold">{contas.length} conta{contas.length !== 1 ? "s" : ""}</span>
              </div>
            )}

            {adding && (
              <div className="bg-white rounded-2xl border border-[#00C8FF] p-4 mb-5 shadow-sm space-y-3">
                <p className="text-xs font-semibold text-[#64748B] uppercase">Nova conta a pagar</p>
                <input autoFocus value={contaForm.description} onChange={(e) => setContaForm({ ...contaForm, description: e.target.value })}
                  placeholder="Ex: Aluguel, Conta de luz..." className="w-full text-sm border border-[#E2E8F0] rounded-xl px-3 py-2 outline-none focus:border-[#00C8FF] bg-[#F8FAFB]" />
                <input type="number" value={contaForm.amount} onChange={(e) => setContaForm({ ...contaForm, amount: e.target.value })}
                  placeholder="Valor (R$)" className="w-full text-sm border border-[#E2E8F0] rounded-xl px-3 py-2 outline-none focus:border-[#00C8FF] bg-[#F8FAFB]" />
                <div>
                  <label className="text-xs text-[#64748B] block mb-1">Vencimento</label>
                  <input type="date" value={contaForm.date} onChange={(e) => setContaForm({ ...contaForm, date: e.target.value })}
                    className="w-full text-sm border border-[#E2E8F0] rounded-xl px-3 py-2 outline-none focus:border-[#00C8FF] bg-[#F8FAFB] text-[#0A1628]" />
                </div>
                <div className="flex gap-2">
                  <button onClick={addConta} className="flex-1 py-2 bg-[#00C8FF] text-white text-sm font-semibold rounded-xl hover:bg-[#0099CC] transition-colors">Salvar</button>
                  <button onClick={() => setAdding(false)} className="px-4 text-sm text-[#64748B]">Cancelar</button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {contas.map((c) => {
                const vencida = c.date < today;
                return (
                  <div key={c.id} className={`bg-white rounded-xl border p-3 transition-colors group ${vencida ? "border-red-200 hover:border-red-300" : "border-[#E2E8F0] hover:border-orange-200"}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${vencida ? "bg-red-50" : "bg-orange-50"}`}>
                        <CalendarCheck size={14} className={vencida ? "text-red-400" : "text-orange-400"} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#0A1628]">{c.description}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[10px] font-medium ${vencida ? "text-red-500" : "text-orange-500"}`}>
                            {vencida ? "Venceu em " : "Vence em "}{c.date}
                          </span>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-orange-600">{fmt(c.amount)}</span>
                    </div>
                    {pagandoId === c.id ? (
                      <div className="mt-2.5 space-y-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-[#64748B] shrink-0">Valor pago (R$)</span>
                          <input
                            autoFocus
                            type="number"
                            step="0.01"
                            value={valorPago}
                            onChange={(e) => setValorPago(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && valorPago) pagarConta(c, parseFloat(valorPago));
                              if (e.key === "Escape") { setPagandoId(null); setValorPago(""); }
                            }}
                            className="flex-1 text-sm border border-green-300 rounded-lg px-2.5 py-1.5 outline-none focus:border-green-500 bg-white font-semibold text-[#0A1628]"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => { if (valorPago) pagarConta(c, parseFloat(valorPago)); }}
                            disabled={!valorPago}
                            className="flex-1 py-1.5 text-xs font-semibold bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-40">
                            ✓ Confirmar pagamento
                          </button>
                          <button
                            onClick={() => { setPagandoId(null); setValorPago(""); }}
                            className="px-3 py-1.5 text-xs text-[#64748B] border border-[#E2E8F0] rounded-lg hover:bg-[#F8FAFB]">
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2 mt-2.5">
                        <button onClick={() => iniciarPagamento(c)}
                          className="flex-1 py-1.5 text-xs font-semibold bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors">
                          ✓ Marcar como paga
                        </button>
                        <button onClick={() => remove(c.id)}
                          className="w-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-[#94A3B8] hover:text-red-400 transition-colors border border-[#E2E8F0]">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              {contas.length === 0 && !adding && (
                <div className="text-center py-12">
                  <CalendarCheck size={32} className="text-[#E2E8F0] mx-auto mb-2" />
                  <p className="text-sm text-[#64748B]">Nenhuma conta cadastrada</p>
                  <button onClick={() => setAdding(true)} className="mt-3 text-xs text-[#00C8FF] font-semibold hover:text-[#0099CC]">
                    + Adicionar conta
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </>
  );
}
