"use client";
import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Lilly's] page error:", error);
  }, [error]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
        <AlertTriangle size={28} className="text-red-400" />
      </div>
      <h2 className="text-lg font-bold text-[#0A1628] mb-1">Algo deu errado</h2>
      <p className="text-sm text-[#64748B] mb-6 max-w-xs">
        Ocorreu um erro inesperado. Tente novamente ou volte ao início.
      </p>
      <button
        onClick={reset}
        className="flex items-center gap-2 px-5 py-2.5 bg-[#00C8FF] text-white text-sm font-semibold rounded-xl hover:bg-[#00B0E0] transition-colors"
      >
        <RefreshCw size={15} />
        Tentar novamente
      </button>
    </div>
  );
}
