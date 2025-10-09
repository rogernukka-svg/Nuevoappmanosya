import '@/app/globals.css';

export const metadata = {
  title: 'ManosYA | Acceso',
  description: 'Iniciá sesión o creá tu cuenta en ManosYA.',
};

export default function LoginLayout({ children }) {
  return (
    <div
      className="
        min-h-screen flex items-center justify-center
        bg-[#F9FAFB] text-gray-900 relative overflow-hidden
      "
    >
      {/* Fondo decorativo */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute top-0 left-0 w-72 h-72 bg-emerald-300/20 blur-3xl rounded-full -translate-x-1/3 -translate-y-1/3" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-cyan-300/20 blur-3xl rounded-full translate-x-1/3 translate-y-1/3" />
      </div>

      <div className="w-full max-w-md p-6 z-10">{children}</div>
    </div>
  );
}
