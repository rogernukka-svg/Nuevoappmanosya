"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getSupabase } from "@/lib/supabase";
import {
  Loader2,
  Building2,
  Calendar,
  CheckCircle2,
  PauseCircle,
  Clock,
  Search,
} from "lucide-react";
import { toast } from "sonner";

/* 🔹 Fuerza renderizado solo en cliente (elimina hydration errors) */
export const dynamic = "force-dynamic";

/* === Hook para evitar hydration mismatch === */
function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

const supabase = getSupabase();

export default function BusinessJobsPage() {
  const mounted = useMounted();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("active"); // active | paused | completed
  const [user, setUser] = useState(null);

  /* === Cargar usuario + trabajos empresariales === */
  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setUser(data.user);
        loadJobs(data.user.id);
      } else {
        setLoading(false);
      }
    }
    init();
  }, []);

  async function loadJobs(uid) {
    setLoading(true);
    const { data, error } = await supabase
      .from("jobs")
      .select("id, title, description, status, schedule, created_at")
      .eq("client_id", uid)
      .not("schedule", "is", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ Error cargando jobs:", error);
      toast.error("Error al cargar tus servicios");
    } else setJobs(data || []);

    setLoading(false);
  }

  const filteredJobs = jobs.filter((j) => {
    if (filter === "active") return j.status === "open" || j.status === "in_progress";
    if (filter === "paused") return j.status === "paused";
    if (filter === "completed") return j.status === "completed";
    return true;
  });

  /* 🧠 Espera al montaje antes de renderizar (evita hydration mismatch) */
  if (!mounted) return null;

  return (
    <motion.div
      className="min-h-screen bg-gradient-to-b from-white via-gray-50 to-gray-100 text-gray-900 pb-24"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* ======= HEADER ======= */}
      <div className="max-w-6xl mx-auto px-6 pt-10">
        <div className="flex items-center gap-2 mb-1">
          <Building2 className="text-emerald-600 w-7 h-7" />
          <h1 className="text-3xl font-extrabold text-emerald-600">
            Panel empresarial
          </h1>
        </div>
        <p className="text-gray-600 mb-8">
          Visualizá y gestioná tus servicios activos, programados y completados.
        </p>

        {/* ======= FILTROS ======= */}
        <div className="flex gap-3 mb-8 flex-wrap">
          {[
            { key: "active", label: "Activos" },
            { key: "paused", label: "Pausados" },
            { key: "completed", label: "Completados" },
          ].map((btn) => (
            <button
              key={btn.key}
              onClick={() => setFilter(btn.key)}
              className={`px-5 py-2 rounded-full font-semibold text-sm transition-all ${
                filter === btn.key
                  ? "bg-emerald-500 text-white shadow-md"
                  : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* ======= LISTA ======= */}
        {loading ? (
          <div className="flex justify-center items-center mt-10 gap-2 text-gray-400">
            <Loader2 className="animate-spin" /> Cargando servicios...
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="text-center text-gray-500 py-20">
            <Search className="mx-auto mb-3 opacity-50" />
            <p>No se encontraron servicios en esta categoría.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredJobs.map((job, i) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-lg transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-gray-800 text-lg line-clamp-1">
                    {job.title}
                  </h3>
                  <StatusBadge status={job.status} />
                </div>

                <p className="text-sm text-gray-600 line-clamp-3 mb-4">
                  {job.description}
                </p>

                {job.schedule && (
                  <div className="text-xs text-gray-500 mb-3">
                    <Calendar className="inline w-3.5 h-3.5 mr-1 text-emerald-500" />
                    {job.schedule.start_date} → {job.schedule.end_date}
                  </div>
                )}

                <ProgressBar status={job.status} />

                <button
                  className="w-full mt-4 py-2 rounded-xl font-semibold bg-emerald-500 text-white hover:bg-emerald-600 transition"
                  onClick={() => toast(`🧩 Ver detalles de ${job.title}`)}
                >
                  Ver detalle
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* === Componente: Estado visual === */
function StatusBadge({ status }) {
  const map = {
    open: {
      label: "Pendiente",
      color: "bg-gray-100 text-gray-700",
      icon: <Clock size={14} />,
    },
    in_progress: {
      label: "Activo",
      color: "bg-emerald-100 text-emerald-700",
      icon: <CheckCircle2 size={14} />,
    },
    paused: {
      label: "Pausado",
      color: "bg-yellow-100 text-yellow-700",
      icon: <PauseCircle size={14} />,
    },
    completed: {
      label: "Completado",
      color: "bg-blue-100 text-blue-700",
      icon: <CheckCircle2 size={14} />,
    },
  };
  const s = map[status] || map.open;
  return (
    <span
      className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1 ${s.color}`}
    >
      {s.icon} {s.label}
    </span>
  );
}

/* === Componente: Barra de progreso simulada === */
function ProgressBar({ status }) {
  const percent =
    status === "open"
      ? 10
      : status === "in_progress"
      ? 55
      : status === "paused"
      ? 35
      : 100;
  return (
    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
      <div
        className="h-full bg-emerald-500 transition-all duration-700"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
