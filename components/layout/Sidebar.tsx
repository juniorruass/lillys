"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, CheckSquare, BookOpen, Heart,
  Newspaper, DollarSign, Briefcase, BarChart2, Flame,
  RefreshCw, Sparkles, MessageCircle, Settings, LogOut, ShieldCheck, Megaphone, Users
} from "lucide-react";

const nav = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Tarefas", href: "/tarefas", icon: CheckSquare },
  { section: "Pessoal" },
  { label: "Insights", href: "/pessoal/insights", icon: Sparkles },
  { label: "Estudos", href: "/pessoal/estudos", icon: BookOpen },
  { label: "Espiritualidade", href: "/pessoal/espiritualidade", icon: Heart },
  { label: "Notícias", href: "/pessoal/noticias", icon: Newspaper },
  { label: "Financeiro", href: "/pessoal/financeiro", icon: DollarSign },
  { section: "Profissional" },
  { label: "Projetos", href: "/profissional/projetos", icon: Briefcase },
  { label: "Status Upflu", href: "/profissional/status", icon: BarChart2 },
  { label: "Campanhas", href: "/profissional/campanhas", icon: Megaphone },
  { label: "Grupos", href: "/profissional/grupos", icon: Users },
  { section: "Mais" },
  { label: "Hábitos", href: "/habitos", icon: Flame },
  { label: "Revisão Semanal", href: "/revisao", icon: RefreshCw },
  { label: "IA Pessoal", href: "/ia", icon: Sparkles },
  { label: "Configurações", href: "/configuracoes", icon: Settings },
  { label: "Admin",         href: "/admin",         icon: ShieldCheck },
];

type NavItem = { label: string; href: string; icon: React.ElementType } | { section: string };

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  return (
    <aside className="sidebar max-lg:hidden flex flex-col w-56 shrink-0 border-r border-[#E2E8F0] bg-white h-screen sticky top-0 shadow-sm">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-[#E2E8F0]">
        <div className="w-8 h-8 rounded-xl overflow-hidden shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/favicon.png" alt="Lilly's" width={32} height={32} style={{ width: 32, height: 32, borderRadius: 10 }} />
        </div>
        <span className="font-semibold text-[#0A1628] text-lg">Lilly&apos;s</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {(nav as NavItem[]).map((item, i) => {
          if ("section" in item) {
            return (
              <p key={i} className="text-xs font-semibold text-[#64748B] uppercase tracking-wider px-3 pt-4 pb-1">
                {item.section}
              </p>
            );
          }
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-0.5 ${
                active
                  ? "bg-[#E0F7FF] text-[#00C8FF]"
                  : "text-[#0A1628] hover:bg-[#F8FAFB]"
              }`}
            >
              <Icon size={16} strokeWidth={active ? 2.5 : 1.8} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-[#E2E8F0] space-y-1.5">
        <div className="flex items-center gap-2 px-3 py-2 bg-[#F0FFF4] rounded-lg">
          <MessageCircle size={14} className="text-green-500" />
          <span className="text-xs text-green-700 font-medium">Bot WA ativo</span>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[#64748B] hover:bg-red-50 hover:text-red-500 transition-colors text-xs font-medium"
        >
          <LogOut size={14} />
          Sair
        </button>
      </div>
    </aside>
  );
}
