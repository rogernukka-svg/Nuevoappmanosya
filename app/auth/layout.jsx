import '@/app/globals.css';

export const metadata = {
  title: 'ManosYA | Acceso',
  description: 'Iniciá sesión o creá tu cuenta en ManosYA.',
};

export default function LoginLayout({ children }) {
  return (
    <div className="relative h-[100dvh] overflow-hidden bg-[#62bfb9] text-slate-900">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-140px] h-[380px] w-[780px] -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute left-[-100px] top-[18%] h-[280px] w-[280px] rounded-full bg-white/8 blur-3xl" />
        <div className="absolute bottom-[-120px] right-[-80px] h-[320px] w-[320px] rounded-full bg-white/8 blur-3xl" />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.10),transparent_30%),radial-gradient(circle_at_85%_15%,rgba(255,255,255,0.08),transparent_22%),linear-gradient(to_bottom,rgba(98,191,185,0.92),rgba(98,191,185,0.98))]" />

        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(255,255,255,0.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.18) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
          }}
        />

        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-white/20 to-transparent" />
      </div>

      <div className="relative z-10 hidden w-full sm:block">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-end px-4 py-5 sm:px-6 lg:px-8">
          <div className="hidden sm:flex items-center gap-2 rounded-full border border-white/35 bg-white/15 px-3 py-1.5 backdrop-blur-md shadow-sm">
            <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
            <span className="text-xs font-semibold text-white/95">
              Plataforma activa
            </span>
          </div>
        </div>
      </div>

      <main className="relative z-10 flex h-[100dvh] items-center justify-center px-2 py-2 sm:h-[calc(100dvh-72px)] sm:px-5 sm:pb-6 sm:pt-2 lg:px-6">
        <div className="h-full w-full max-w-7xl">
          <div className="relative h-full overflow-hidden rounded-[28px] border border-white/30 bg-white/10 shadow-[0_30px_90px_rgba(15,23,42,0.10)] backdrop-blur-2xl sm:rounded-[34px]">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-white/12 to-transparent" />
            <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-white/25 sm:rounded-[34px]" />
            <div className="pointer-events-none absolute left-0 top-0 h-full w-[1px] bg-gradient-to-b from-transparent via-white/20 to-transparent" />
            <div className="pointer-events-none absolute right-0 top-0 h-full w-[1px] bg-gradient-to-b from-transparent via-white/20 to-transparent" />

            <div className="relative h-full">{children}</div>
          </div>
        </div>
      </main>
    </div>
  );
}
