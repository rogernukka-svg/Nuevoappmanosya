import "../globals.css";

export const metadata = {
  title: "ManosYA | Trabajador",
  description: "Panel profesional del trabajador de ManosYA.",
};

export default function WorkerLayout({ children }) {
  return (
    <div
      className="
        min-h-screen
        bg-[linear-gradient(180deg,#f8fffd_0%,#ffffff_38%,#f8fafc_100%)]
        text-gray-900
        overflow-y-auto
      "
    >
      {/* glow de fondo suave igual al login */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute left-[-70px] top-10 h-52 w-52 rounded-full bg-[#62bfb9]/10 blur-3xl" />
        <div className="absolute right-[-70px] top-16 h-52 w-52 rounded-full bg-cyan-300/10 blur-3xl" />
        <div className="absolute left-[30%] bottom-10 h-44 w-44 rounded-full bg-emerald-200/10 blur-3xl" />
      </div>

      {/* solo contenido */}
      <main className="relative z-10">
        {children}
      </main>
    </div>
  );
}