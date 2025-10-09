import "../globals.css";
import Link from "next/link";

export const metadata = {
  title: "ManosYA | Trabajador",
  description: "Panel del profesional de ManosYA.",
};

export default function WorkerLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
      {/* ===== HEADER TRABAJADOR ===== */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-5 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-1 text-xl font-extrabold transition-all hover:text-emerald-600"
          >
            <span className="text-gray-900">Manos</span>
            <span className="text-emerald-600">YA</span>
          </Link>

          <span className="text-sm text-emerald-600 font-medium">
            Modo Trabajador 🧑‍🔧
          </span>
        </div>
      </header>

      {/* ===== CONTENIDO PRINCIPAL ===== */}
      <main className="flex-1 bg-gray-50">{children}</main>

      {/* ===== FOOTER ===== */}
      <footer className="text-center text-xs text-gray-500 py-4 border-t border-gray-200 bg-white">
        © {new Date().getFullYear()}{" "}
        <span className="text-emerald-600 font-semibold">ManosYA</span> — Impulsando tu trabajo ⚙️
      </footer>
    </div>
  );
}
