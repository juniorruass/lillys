"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, CheckSquare, Flame, DollarSign, Briefcase } from "lucide-react";

const tabs = [
  { label: "Home",      href: "/dashboard",            icon: LayoutDashboard },
  { label: "Tarefas",   href: "/tarefas",               icon: CheckSquare },
  { label: "Hábitos",   href: "/habitos",               icon: Flame },
  { label: "Financeiro",href: "/pessoal/financeiro",    icon: DollarSign },
  { label: "Projetos",  href: "/profissional/projetos", icon: Briefcase },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#E2E8F0] pb-safe z-50 shadow-[0_-2px_12px_rgba(0,0,0,0.08)]">
      <div className="flex">
        {tabs.map(({ label, href, icon: Icon }) => {
          const base = href.split("/").slice(0, 3).join("/");
          const active = pathname === href || pathname.startsWith(base + "/") || pathname === base;
          return (
            <Link key={href} href={href}
              className="flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 btn-press relative">
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#00C8FF] rounded-full" />
              )}
              <Icon size={21}
                className={`transition-all ${active ? "text-[#00C8FF]" : "text-[#94A3B8]"}`}
                strokeWidth={active ? 2.5 : 1.8} />
              <span className={`text-[10px] font-medium transition-colors ${active ? "text-[#00C8FF]" : "text-[#94A3B8]"}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
