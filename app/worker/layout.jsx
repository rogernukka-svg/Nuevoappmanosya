import "../globals.css";
import Link from "next/link";
import { Briefcase, Sparkles, ShieldCheck } from "lucide-react";

export const metadata = {
  title: "ManosYA | Trabajador",
  description: "Panel profesional del trabajador de ManosYA.",
};

export default function WorkerLayout({ children }) {
  return (
    <div
      className="
        min-h-screen
        flex flex-col
        bg-[linear-gradient(180deg,#f8fffd_0%,#ffffff_38%,#f8fafc_100%)]
        text-gray-900
        overflow-y-auto
      "
    >
      {/* ===== HEADER PREMIUM TRABAJADOR ===== */}
      <header className="sticky top-0 z-50 border-b border-emerald-100 bg-white/85 backdrop-blur-xl shadow-[0_10px_30px_rgba(16,185,129,0.06)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-5 py-3.5">
          <div className="flex items-center justify-between gap-3">
            {/* Logo / marca */}
            <Link
              href="/"
              className="
                group inline-flex items-center gap-3
                transition-all
              "
            >
              <div
                className="
                  relative flex h-11 w-11 items-center justify-center rounded-2xl
                  bg-gradient-to-br from-emerald-500 to-cyan-400
                  text-white
                  shadow-[0_14px_30px_rgba(16,185,129,0.22)]
                "
              >
                <Briefcase size={20} />
                <span className="absolute inset-0 rounded-2xl bg-white/10" />
              </div>

              <div className="leading-tight">
                <div className="text-xl font-extrabold tracking-tight">
                  <span className="text-gray-900 group-hover:text-gray-800 transition">
                    Manos
                  </span>
                  <span className="text-emerald-500 group-hover:text-cyan-500 transition">
                    YA
                  </span>
                </div>

                <div className="text-[11px] font-semibold text-gray-400 -mt-0.5">
                  Panel profesional
                </div>
              </div>
            </Link>

            {/* badge trabajador */}
            <div className="flex items-center gap-2">
              <div
                className="
                  hidden sm:inline-flex items-center gap-2
                  rounded-full border border-emerald-200
                  bg-emerald-50 px-3 py-1.5
                  text-[12px] font-bold text-emerald-700
                "
              >
                <ShieldCheck size={14} />
                Trabajador verificado
              </div>

              <div
                className="
                  inline-flex items-center gap-2
                  rounded-full border border-cyan-200
                  bg-gradient-to-r from-emerald-50 to-cyan-50
                  px-3 py-1.5
                  text-[12px] font-extrabold text-gray-700
                  shadow-sm
                "
              >
                <Sparkles size={14} className="text-emerald-600" />
                Modo Trabajador
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ===== CONTENIDO PRINCIPAL ===== */}
      <main className="flex-1 relative">
        {/* glow fondo */}
        <div className="pointer-events-none fixed inset-x-0 top-0 z-0">
          <div className="absolute left-[-60px] top-10 h-44 w-44 rounded-full bg-emerald-300/10 blur-3xl" />
          <div className="absolute right-[-60px] top-16 h-44 w-44 rounded-full bg-cyan-300/10 blur-3xl" />
        </div>

        <div className="relative z-10">
          {children}
        </div>
      </main>

      {/* ===== FOOTER PREMIUM ===== */}
      <footer className="border-t border-gray-200 bg-white/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-5 py-4 text-center">
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()}{" "}
            <span className="font-extrabold text-emerald-600">ManosYA</span>
            {" "}— tecnología, confianza y oportunidades para profesionales.
          </p>

          <p className="text-[11px] text-gray-400 mt-1">
            Plataforma pensada para trabajadores que quieren crecer con una imagen más seria, moderna y visible.
          </p>
        </div>
      </footer>
    </div>
  );
}