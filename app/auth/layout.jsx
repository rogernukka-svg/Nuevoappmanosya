import '@/app/globals.css';

export const metadata = {
  title: 'ManosYA | Acceso',
  description: 'Iniciá sesión o creá tu cuenta en ManosYA.',
};

export default function LoginLayout({ children }) {
  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#f4f7fb] text-slate-900">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-140px] h-[380px] w-[780px] -translate-x-1/2 rounded-full bg-emerald-300/30 blur-3xl" />
        <div className="absolute left-[-100px] top-[18%] h-[280px] w-[280px] rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="absolute bottom-[-120px] right-[-80px] h-[320px] w-[320px] rounded-full bg-teal-300/20 blur-3xl" />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.10),transparent_30%),radial-gradient(circle_at_85%_15%,rgba(34,211,238,0.09),transparent_22%),linear-gradient(to_bottom,rgba(255,255,255,0.72),rgba(255,255,255,0.88))]" />

        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(15,23,42,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.08) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
          }}
        />

        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-emerald-300/30 to-transparent" />
      </div>

      {/* HEADER SIN LOGO */}
      <div className="relative z-10 w-full">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-end px-4 py-5 sm:px-6 lg:px-8">
          <div className="hidden sm:flex items-center gap-2 rounded-full border border-white/70 bg-white/55 px-3 py-1.5 backdrop-blur-md shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-slate-600">
              Plataforma activa
            </span>
          </div>
        </div>
      </div>

      <main className="relative z-10 flex min-h-[calc(100dvh-72px)] items-center justify-center px-4 pb-8 pt-2 sm:px-6 lg:px-8">
        <div className="w-full max-w-7xl">
          <div className="relative overflow-hidden rounded-[34px] border border-white/80 bg-white/55 shadow-[0_30px_90px_rgba(15,23,42,0.10)] backdrop-blur-2xl">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-white/70 to-transparent" />
            <div className="pointer-events-none absolute inset-0 rounded-[34px] ring-1 ring-white/70" />
            <div className="pointer-events-none absolute left-0 top-0 h-full w-[1px] bg-gradient-to-b from-transparent via-emerald-200/60 to-transparent" />
            <div className="pointer-events-none absolute right-0 top-0 h-full w-[1px] bg-gradient-to-b from-transparent via-cyan-200/60 to-transparent" />

            <div className="relative">{children}</div>
          </div>
        </div>
      </main>
    </div>
  );
}