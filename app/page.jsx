import Link from "next/link";
import { ArrowRight, BadgeCheck, BriefcaseBusiness, MessageCircle } from "lucide-react";
import Brand from "@/components/layout/Brand";
import WorkerReelFeed from "@/components/feed/WorkerReelFeed";

export default function HomePage() {
  return (
    <section className="home-premium grid h-full overflow-hidden bg-[var(--color-primary)] lg:grid-cols-[0.82fr_1.18fr]">
      <div className="home-copy flex min-h-0 flex-col justify-between p-5 lg:p-10">
        <div className="home-nav flex items-center justify-between">
          <Brand size="md" />
          <Link href="/login" className="home-login">Entrar</Link>
        </div>

        <div className="home-main max-w-xl">
          <p className="home-badge">Trabajadores verificados cerca</p>
          <h1 className="home-title">
            Contrata ayuda real en minutos.
          </h1>
          <p className="home-subtitle">
            Un feed profesional para encontrar, evaluar y contactar trabajadores de confianza.
          </p>
          <div className="home-actions">
            <Link href="/client" className="home-primary">
              Ver trabajadores <ArrowRight size={18} />
            </Link>
            <Link href="/register" className="home-secondary">Crear cuenta</Link>
          </div>
        </div>

        <div className="home-trust grid grid-cols-3 gap-2 text-xs font-black text-black/70">
          <TrustPill icon={BadgeCheck} text="Verificados" />
          <TrustPill icon={MessageCircle} text="Chat directo" />
          <TrustPill icon={BriefcaseBusiness} text="Pedidos reales" />
        </div>
      </div>

      <div className="hidden min-h-0 p-5 lg:block">
        <WorkerReelFeed />
      </div>
    </section>
  );
}

function TrustPill({ icon: Icon, text }) {
  return (
    <div className="home-trust-pill flex items-center gap-2">
      <Icon size={17} />
      <span>{text}</span>
    </div>
  );
}
