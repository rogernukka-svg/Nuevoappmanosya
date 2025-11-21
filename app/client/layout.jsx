import "../globals.css";

export const metadata = {
  title: "ManosYA | Cliente",
  description: "Panel del cliente de ManosYA",
};

export default function ClientLayout({ children }) {
  return (
    <section className="flex flex-col min-h-screen bg-white text-gray-900 overflow-visible">
      {/* ===== CONTENIDO PRINCIPAL ===== */}
      <main className="flex-1 flex flex-col relative z-10">{children}</main>

     {/* ===== FOOTER CLIENTE ===== */}
<footer className="hidden md:flex text-center text-xs text-gray-500 py-4 border-t border-gray-200 bg-gray-50 relative z-10">
  © {new Date().getFullYear()}{" "}
  <span className="text-emerald-600 font-semibold">ManosYA</span> — Conectamos clientes y profesionales 💪
</footer>



      {/* 🚀 MODAL ROOT — lugar global para modales (chat, review, etc.) */}
      <div id="modal-root" className="fixed inset-0 z-[99999] pointer-events-none" />
    </section>
  );
}
