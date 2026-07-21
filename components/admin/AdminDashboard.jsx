import { Activity, ShieldCheck, TrendingUp, UsersRound } from "lucide-react";

const stats = [
  { label: "Usuarios", value: "1.248", icon: UsersRound },
  { label: "Verificados", value: "312", icon: ShieldCheck },
  { label: "Pedidos", value: "684", icon: Activity },
  { label: "Conversion", value: "38%", icon: TrendingUp },
];

export default function AdminDashboard({ title = "Operacion ManosYA" }) {
  return (
    <section className="panel flex h-full flex-col overflow-hidden p-4">
      <h1 className="text-3xl font-black tracking-[-0.05em]">{title}</h1>
      <div className="mt-5 grid grid-cols-2 gap-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <article key={stat.label} className="rounded-3xl bg-[var(--color-paper)] p-4">
              <Icon size={20} />
              <p className="mt-4 text-2xl font-black">{stat.value}</p>
              <p className="text-xs font-bold text-black/50">{stat.label}</p>
            </article>
          );
        })}
      </div>
      <div className="scroll-area mt-5 grid gap-3">
        {["Trabajadores pendientes", "Documentos por revisar", "Pedidos abiertos", "Alertas de seguridad"].map((item) => (
          <article key={item} className="rounded-3xl border border-black/8 p-4">
            <p className="font-black">{item}</p>
            <p className="mt-1 text-sm font-bold text-black/52">Modulo operativo listo para conectar a Supabase.</p>
          </article>
        ))}
      </div>
    </section>
  );
}
