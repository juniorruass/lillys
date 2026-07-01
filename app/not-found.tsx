import Link from "next/link";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F8FAFB] flex flex-col items-center justify-center p-8 text-center">
      <p className="text-7xl font-bold text-[#E2E8F0] mb-2">404</p>
      <h1 className="text-xl font-bold text-[#0A1628] mb-2">Página não encontrada</h1>
      <p className="text-sm text-[#64748B] mb-8">Esse endereço não existe no Lilly&apos;s.</p>
      <Link
        href="/dashboard"
        className="flex items-center gap-2 px-5 py-2.5 bg-[#00C8FF] text-white text-sm font-semibold rounded-xl hover:bg-[#00B0E0] transition-colors"
      >
        <Home size={15} />
        Ir para o início
      </Link>
    </div>
  );
}
