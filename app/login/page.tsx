"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, Mail, Lock } from "lucide-react";
import FloatingOrbs from "@/components/ui/FloatingOrbs";
import Marquee from "@/components/ui/Marquee";

const MARQUEE_ITEMS = [
  "Produtividade", "Organização", "Foco Total", "Crescimento",
  "Disciplina", "Resultados", "Consistência", "Alta Performance",
  "Gestão do Tempo", "Mindset", "Execução", "Planejamento",
];

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        router.replace("/dashboard");
      } else {
        const data = await res.json();
        setError(data.error ?? "Credenciais inválidas.");
      }
    } catch {
      setError("Falha de conexão.");
    }
    setLoading(false);
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-[#060F1E] via-[#0A1F3C] to-[#0D2B50] flex flex-col items-center justify-center px-4 overflow-hidden">

      {/* Orbs com parallax no mouse */}
      <FloatingOrbs parallax className="fixed inset-0" />

      {/* Grade de pontos sutil */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: "radial-gradient(circle, #00C8FF 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Marquee topo */}
      <div className="fixed top-0 left-0 right-0 border-b border-white/5 py-2 z-10">
        <Marquee
          items={MARQUEE_ITEMS}
          speed={25}
          className="text-[10px] font-medium tracking-widest uppercase text-[#00C8FF]/30"
        />
      </div>

      {/* Conteúdo */}
      <div className="w-full max-w-sm relative animate-fade-in">

        {/* Logo */}
        <div className="text-center mb-8 animate-slide-up" style={{ animationDelay: "0.15s" }}>
          <div className="w-16 h-16 rounded-2xl bg-[#00C8FF] flex items-center justify-center mx-auto mb-4 glow-pulse shadow-lg shadow-[#00C8FF]/40">
            <span className="text-white text-2xl font-bold">L</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Lilly&apos;s</h1>
          <p className="text-[#4A7FA0] text-sm mt-1">Seu planner pessoal</p>
        </div>

        {/* Card */}
        <div className="animate-slide-up tilt-card" style={{ animationDelay: "0.25s" }}>
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
            <h2 className="text-white font-semibold text-lg mb-1">Bem-vindo de volta</h2>
            <p className="text-[#4A7FA0] text-sm mb-6">Entre com suas credenciais para continuar</p>

            <form onSubmit={submit} className="space-y-3">
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#4A7FA0] pointer-events-none" />
                <input
                  autoFocus
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="E-mail"
                  autoComplete="email"
                  className="w-full bg-white/8 border border-white/15 rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-[#4A7FA0] text-sm outline-none focus:border-[#00C8FF] focus:bg-white/10 transition-all"
                />
              </div>

              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#4A7FA0] pointer-events-none" />
                <input
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Senha"
                  autoComplete="current-password"
                  className="w-full bg-white/8 border border-white/15 rounded-xl pl-10 pr-11 py-3 text-white placeholder:text-[#4A7FA0] text-sm outline-none focus:border-[#00C8FF] focus:bg-white/10 transition-all"
                />
                <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4A7FA0] hover:text-[#00C8FF] transition-colors">
                  {show ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              {error && (
                <p className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !email || !password}
                className="w-full flex items-center justify-center gap-2 py-3 mt-1 bg-[#00C8FF] text-[#060F1E] font-bold rounded-xl hover:bg-[#33D4FF] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-[#00C8FF]/30 btn-glow"
              >
                {loading && <Loader2 size={15} className="animate-spin" />}
                {loading ? "Entrando..." : "Entrar"}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Marquee rodapé */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-white/5 py-2 z-10">
        <Marquee
          items={MARQUEE_ITEMS}
          speed={35}
          direction="right"
          className="text-[10px] font-medium tracking-widest uppercase text-[#00C8FF]/20"
        />
      </div>
    </div>
  );
}
