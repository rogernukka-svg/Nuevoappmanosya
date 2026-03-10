import '@/app/globals.css';

export const metadata = {
  title: 'ManosYA | Acceso',
  description: 'Iniciá sesión o creá tu cuenta en ManosYA.',
};

export default function LoginLayout({ children }) {
  return (
    <div
      className="
        min-h-[100dvh] flex items-center justify-center
        bg-[#f8fafc] text-slate-900 relative overflow-hidden
      "
    >
      {/* Fondo general */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        {/* base clara */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.10),transparent_32%),radial-gradient(circle_at_85%_18%,rgba(34,211,238,0.08),transparent_24%)]" />

        {/* blobs suaves */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[560px] h-[240px] rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="absolute top-28 -left-20 w-[220px] h-[220px] rounded-full bg-cyan-200/30 blur-3xl" />
        <div className="absolute bottom-[-80px] right-[-40px] w-[260px] h-[260px] rounded-full bg-teal-200/25 blur-3xl" />

        {/* grid tecnológica sutil */}
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(15,23,42,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.08) 1px, transparent 1px)',
            backgroundSize: '42px 42px',
          }}
        />

        {/* velo blanco */}
        <div className="absolute inset-0 bg-white/55" />
      </div>

      {/* marco central */}
      <div className="relative w-full max-w-md px-4 sm:px-6 py-8 z-10">
        <div
          className="
            rounded-[32px]
            border border-white/80
            bg-white/70
            backdrop-blur-xl
            shadow-[0_24px_70px_rgba(15,23,42,0.10)]
            p-3 sm:p-4
          "
        >
          {children}
        </div>
      </div>
    </div>
  );
}