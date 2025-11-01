import "../../globals.css";
import Link from "next/link";

export const metadata = {
  title: "ManosYA | Analítica Admin",
  description: "Panel de métricas internas de ManosYA.",
};

export default function AnalyticsLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-100 text-gray-900">
     {/* ===== CONTENIDO PRINCIPAL ===== */}
      <main className="flex-1">{children}</main>

      {/* ===== FOOTER ===== */}
      <footer className="text-center text-xs text-gray-500 py-4 border-t border-gray-200 bg-white">
        © {new Date().getFullYear()}{" "}
        <span className="text-emerald-600 font-semibold">ManosYA</span> · Alto Paraná PY
        <br />
        <span className="italic">Panel interno de gestión y monitoreo</span> ⚡
      </footer>
    </div>
  );
}
