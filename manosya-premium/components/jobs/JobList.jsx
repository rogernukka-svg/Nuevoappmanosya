import { Clock, MapPin, MessageCircle } from "lucide-react";

const jobs = [
  { id: "1", title: "Arreglar perdida de agua", status: "Abierto", place: "Villa Morra", time: "Hoy" },
  { id: "2", title: "Instalar luces LED", status: "Asignado", place: "San Lorenzo", time: "Manana" },
  { id: "3", title: "Limpieza profunda", status: "Completado", place: "Luque", time: "Ayer" },
];

export default function JobList({ title = "Trabajos" }) {
  return (
    <section className="panel flex h-full flex-col overflow-hidden p-4">
      <h1 className="text-2xl font-black tracking-[-0.04em]">{title}</h1>
      <div className="scroll-area mt-4 grid gap-3">
        {jobs.map((job) => (
          <article key={job.id} className="rounded-3xl border border-black/8 bg-[var(--color-paper)] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-black leading-tight">{job.title}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-black/55">
                  <span className="inline-flex items-center gap-1"><MapPin size={13} />{job.place}</span>
                  <span className="inline-flex items-center gap-1"><Clock size={13} />{job.time}</span>
                </div>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-black">{job.status}</span>
            </div>
            <button className="btn-secondary mt-4 w-full"><MessageCircle size={17} /> Abrir chat</button>
          </article>
        ))}
      </div>
    </section>
  );
}
