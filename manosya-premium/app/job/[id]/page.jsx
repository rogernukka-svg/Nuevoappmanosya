import AppShell from "@/components/layout/AppShell";

export default function JobDetailPage({ params }) {
  return (
    <AppShell title="Detalle de trabajo">
      <section className="panel h-full p-5">
        <p className="text-sm font-black uppercase text-black/45">Trabajo #{params.id}</p>
        <h1 className="mt-3 text-3xl font-black tracking-[-0.05em]">Seguimiento del pedido</h1>
        <p className="mt-2 text-sm font-bold text-black/55">Estado, trabajador asignado, fotos, incidentes y calificacion.</p>
        <a href={`/job/${params.id}/chat`} className="btn-primary btn-mint mt-6 w-full">Abrir chat del trabajo</a>
      </section>
    </AppShell>
  );
}
