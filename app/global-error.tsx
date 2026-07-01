"use client";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Lilly's] global error:", error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body style={{ fontFamily: "sans-serif", background: "#F8FAFB", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", margin: 0 }}>
        <div style={{ textAlign: "center", padding: 32, maxWidth: 360 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#0A1628", marginBottom: 8 }}>Erro crítico</h1>
          <p style={{ fontSize: 14, color: "#64748B", marginBottom: 24 }}>
            O aplicativo encontrou um problema grave. Tente recarregar a página.
          </p>
          <button
            onClick={reset}
            style={{ padding: "10px 24px", background: "#00C8FF", color: "#fff", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
          >
            Recarregar
          </button>
        </div>
      </body>
    </html>
  );
}
