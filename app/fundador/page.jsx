import Link from "next/link";
import Brand from "@/components/layout/Brand";

export default function FundadorPage() {
  return (
    <section className="h-full overflow-hidden bg-[var(--color-primary)] p-5">
      <div className="mx-auto grid h-full max-w-6xl gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="flex flex-col justify-between rounded-[32px] bg-white p-6 shadow-[var(--shadow-hard)]">
          <Brand size="md" />
          <div>
            <p className="text-sm font-black uppercase text-black/48">Fundador</p>
            <h1 className="mt-3 text-5xl font-black leading-none tracking-[-0.06em]">La confianza tambien se disena.</h1>
            <p className="mt-5 text-base font-bold leading-relaxed text-black/62">
              ManosYA nace para que el trabajo real tenga visibilidad, reputacion y oportunidades inmediatas.
            </p>
            <Link href="/" className="btn-primary btn-mint mt-6">Volver a ManosYA</Link>
          </div>
        </div>
        <div className="hidden overflow-hidden rounded-[32px] bg-black/90 shadow-[var(--shadow-hard)] lg:block">
          <div className="flex h-full items-end bg-[linear-gradient(135deg,#111,#324541_52%,#64C7BE)] p-8 text-white">
            <div>
              <p className="text-sm font-black uppercase text-white/60">Vision</p>
              <p className="mt-2 max-w-md text-3xl font-black tracking-[-0.04em]">Una red social donde trabajar bien se convierte en reputacion visible.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
