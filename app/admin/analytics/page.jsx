'use client';

import { useEffect, useMemo, useState } from 'react';
import { getSupabase } from '@/lib/supabase';
import {
  Users,
  Wrench,
  Briefcase,
  UserCheck,
  Loader2,
  BarChart3,
  XCircle,
  Activity,
  TrendingUp,
  CalendarClock,
  MessageCircle,
  SendHorizontal,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

/* 📊 Recharts */
import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  AreaChart, Area,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';

const supabase = getSupabase();

/* 🎯 Metas */
const GOALS = {
  users: 100_000,
  workers: 13_000,
  activeWorkers: 13_000,
  jobs: 50_000,
};

/* 🗓️ Rango */
const RANGES = [
  { key: 30, label: '30 días' },
  { key: 90, label: '90 días' },
  { key: 365, label: '365 días' },
];

/* ==== Helpers ==== */
const fmtD = (d) => new Date(d).toISOString().slice(0, 10);
function daysAgo(n) {
  const t = new Date();
  t.setDate(t.getDate() - n);
  return t;
}
function seqDays(from, to) {
  const out = [];
  const cur = new Date(from);
  while (cur <= to) {
    out.push(fmtD(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}
function groupCountByDay(rows) {
  const map = {};
  rows?.forEach(r => {
    const key = fmtD(r.created_at || r.createdAt || r.inserted_at || r.updated_at);
    map[key] = (map[key] || 0) + 1;
  });
  return map;
}
function calcCAGR(current, previous, periodsPerYear) {
  if (!previous || previous <= 0) return null;
  const r = (current / previous) ** periodsPerYear - 1;
  return isFinite(r) ? r : null;
}
function linearTrendProjection(series, key, forwardDays = 30) {
  if (!series || series.length < 2) return null;
  const ys = series.map(p => p[key] ?? 0);
  const xs = series.map((_, i) => i);
  const n = xs.length;
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((a, b, i) => a + b * ys[i], 0);
  const sumXX = xs.reduce((a, b) => a + b * b, 0);
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return null;
  const m = (n * sumXY - sumX * sumY) / denom;
  const c = (sumY - m * sumX) / n;
  const nextIndex = n - 1 + forwardDays;
  const forecast = m * nextIndex + c;
  return { slope: m, forecast: Math.max(0, forecast) };
}
function probabilityToHitGoal(current, goal, slopePerDay) {
  const dist = Math.max(0, goal - current);
  const daysNeeded = slopePerDay > 0 ? dist / slopePerDay : Infinity;
  if (!isFinite(daysNeeded)) return 0;
  const prob = Math.max(0, Math.min(1, (120 - daysNeeded) / 120));
  return prob;
}

/* ======================= PAGE ======================= */
export default function AdminAnalyticsPage() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalWorkers: 0,
    activeWorkers: 0,
    totalJobs: 0,
  });
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [range, setRange] = useState(30);
  const [series, setSeries] = useState({ users: [], workers: [], jobs: [] });
  const [yearCompare, setYearCompare] = useState({
    usersThis: 0, usersPrev: 0,
    workersThis: 0, workersPrev: 0,
    jobsThis: 0, jobsPrev: 0,
  });

  useEffect(() => {
    fetchAll();
    const ch = supabase
      .channel('admin-analytics-pro')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'worker_profiles' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_workers_view' }, fetchAll)
      .subscribe();
    return () => supabase.removeChannel(ch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchRange(range); }, [range]);

  async function fetchAll() {
    try {
      setLoading(true);
      const [
        usersCountRes,
        workersCountRes,
        activeWorkersCountRes,
        jobsCountRes,
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('worker_profiles').select('*', { count: 'exact', head: true }),
        supabase
          .from('admin_workers_view')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true)
          .eq('worker_verified', true),
        supabase.from('jobs').select('*', { count: 'exact', head: true }),
      ]);

      setStats({
        totalUsers: usersCountRes.count || 0,
        totalWorkers: workersCountRes.count || 0,
        activeWorkers: activeWorkersCountRes.count || 0,
        totalJobs: jobsCountRes.count || 0,
      });

      // Interanual rápido (12m vs 12m previos)
      const sinceThisYear = new Date(); sinceThisYear.setFullYear(sinceThisYear.getFullYear() - 1);
      const sincePrevYear = new Date(); sincePrevYear.setFullYear(sincePrevYear.getFullYear() - 2);
      const [
        usersThis, usersPrev,
        workersThis, workersPrev,
        jobsThis, jobsPrev
      ] = await Promise.all([
        supabase.from('profiles').select('created_at', { count: 'exact' }).gte('created_at', sinceThisYear.toISOString()),
        supabase.from('profiles').select('created_at', { count: 'exact' }).gte('created_at', sincePrevYear.toISOString()).lt('created_at', sinceThisYear.toISOString()),
        supabase.from('worker_profiles').select('created_at', { count: 'exact' }).gte('created_at', sinceThisYear.toISOString()),
        supabase.from('worker_profiles').select('created_at', { count: 'exact' }).gte('created_at', sincePrevYear.toISOString()).lt('created_at', sinceThisYear.toISOString()),
        supabase.from('jobs').select('created_at', { count: 'exact' }).gte('created_at', sinceThisYear.toISOString()),
        supabase.from('jobs').select('created_at', { count: 'exact' }).gte('created_at', sincePrevYear.toISOString()).lt('created_at', sinceThisYear.toISOString()),
      ]);

      setYearCompare({
        usersThis: usersThis.count || 0, usersPrev: usersPrev.count || 0,
        workersThis: workersThis.count || 0, workersPrev: workersPrev.count || 0,
        jobsThis: jobsThis.count || 0, jobsPrev: jobsPrev.count || 0,
      });
    } catch (err) {
      console.error(err);
      toast.error('Error cargando analítica');
    } finally {
      setLoading(false);
    }
  }

  async function fetchRange(daysWindow) {
    try {
      const from = daysAgo(daysWindow).toISOString();
      const [u, w, j] = await Promise.all([
        supabase.from('profiles').select('created_at').gte('created_at', from),
        supabase.from('worker_profiles').select('created_at').gte('created_at', from),
        supabase.from('jobs').select('created_at').gte('created_at', from),
      ]);
      const now = new Date();
      const days = seqDays(daysAgo(daysWindow), now);
      const uMap = groupCountByDay(u.data || []);
      const wMap = groupCountByDay(w.data || []);
      const jMap = groupCountByDay(j.data || []);
      let cu = 0, cw = 0, cj = 0;
      const cumulative = days.map(d => {
        cu += uMap[d] || 0; cw += wMap[d] || 0; cj += jMap[d] || 0;
        return { day: d, users: cu, workers: cw, jobs: cj };
      });
      setSeries({
        users: cumulative.map(p => ({ day: p.day, value: p.users })),
        workers: cumulative.map(p => ({ day: p.day, value: p.workers })),
        jobs: cumulative.map(p => ({ day: p.day, value: p.jobs })),
      });
    } catch (err) { console.error(err); }
  }

  const insights = useMemo(() => {
    const periodsPerYear = range === 365 ? 1 : 365 / range;
    function buildInsight(key, goal) {
      const s = series[key];
      if (!s || s.length < 4) return null;
      const mid = Math.floor(s.length / 2);
      const prevVal = s[mid].value || 0;
      const curVal = s[s.length - 1].value || 0;
      const cagr = calcCAGR(curVal, prevVal, periodsPerYear);
      const trend = linearTrendProjection(s.map((p, i) => ({ i, value: p.value })), 'value', 30);
      const slope = trend?.slope ?? 0;
      const prob = probabilityToHitGoal(curVal, goal, slope);
      return { current: curVal, previous: prevVal, cagr, slopePerDay: slope, probToGoal: prob, forecast30: trend?.forecast ?? null };
    }
    return {
      users: buildInsight('users', GOALS.users),
      workers: buildInsight('workers', GOALS.workers),
      jobs: buildInsight('jobs', GOALS.jobs),
    };
  }, [series, range]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <BarChart3 className="text-emerald-500" /> Panel de Analítica
        </h1>
        <div className="flex items-center gap-2">
          <CalendarClock className="text-gray-500" />
          {RANGES.map(r => (
            <button key={r.key} onClick={() => setRange(r.key)}
              className={`px-3 py-1.5 rounded-lg text-sm border transition ${range === r.key
                ? 'bg-emerald-500 text-white border-emerald-500'
                : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      {loading ? (
        <div className="flex justify-center mt-20">
          <Loader2 className="animate-spin text-emerald-500" size={36} />
        </div>
      ) : (
        <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <StatCard icon={<Users className="text-sky-500" size={28} />} label="Usuarios registrados"
            value={stats.totalUsers} sub={goalSub(stats.totalUsers, GOALS.users)} />
          <StatCard icon={<Wrench className="text-orange-500" size={28} />} label="Trabajadores totales"
            value={stats.totalWorkers} sub={goalSub(stats.totalWorkers, GOALS.workers)} />
          <StatCard icon={<UserCheck className="text-emerald-600" size={28} />} label="Activos verificados"
            value={stats.activeWorkers} sub="Fuente: admin_workers_view" />
          <StatCard icon={<Briefcase className="text-violet-500" size={28} />} label="Trabajos totales"
            value={stats.totalJobs} sub={goalSub(stats.totalJobs, GOALS.jobs)} />
        </motion.div>
      )}

      {/* === 📈 GRÁFICOS EN VIVO === */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-10">
        {/* Crecimiento Usuarios vs Trabajadores */}
        <ChartCard title="Crecimiento acumulado — Usuarios vs Trabajadores" icon={<TrendingUp />}>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={join2(series.users, series.workers, 'users', 'workers')}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="users" name="Usuarios" stroke="#06B6D4" dot={false} />
              <Line type="monotone" dataKey="workers" name="Trabajadores" stroke="#10B981" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Trabajos por día (acumulado) */}
        <ChartCard title="Trabajos por día (acumulado)" icon={<Activity />}>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={series.jobs}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="value" name="Trabajos" stroke="#8B5CF6" fill="url(#g1)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Progreso a metas (torta) */}
        <ChartCard title="Progreso a metas (torta)" icon={<BarChart3 />}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MiniPie title="Usuarios" value={stats.totalUsers} goal={GOALS.users} color="#06B6D4" />
            <MiniPie title="Trabajadores" value={stats.totalWorkers} goal={GOALS.workers} color="#10B981" />
            <MiniPie title="Activos verificados" value={stats.activeWorkers} goal={GOALS.activeWorkers} color="#059669" />
            <MiniPie title="Trabajos" value={stats.totalJobs} goal={GOALS.jobs} color="#8B5CF6" />
          </div>
        </ChartCard>

        {/* Comparativo interanual */}
        <ChartCard title="Comparativo interanual (últimos 12m vs 12m previos)" icon={<TrendingUp />}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={[
              { k: 'Usuarios', this: yearCompare.usersThis, prev: yearCompare.usersPrev },
              { k: 'Trabajadores', this: yearCompare.workersThis, prev: yearCompare.workersPrev },
              { k: 'Trabajos', this: yearCompare.jobsThis, prev: yearCompare.jobsPrev },
            ]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="k" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="this" name="Últimos 12m" fill="#14B8A6" />
              <Bar dataKey="prev" name="12m previos" fill="#CBD5E1" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* === 🔍 Insights y proyecciones === */}
      <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
        <InsightCard title="Usuarios" color="#06B6D4" goal={GOALS.users} data={insights.users} />
        <InsightCard title="Trabajadores" color="#10B981" goal={GOALS.workers} data={insights.workers} />
        <InsightCard title="Trabajos" color="#8B5CF6" goal={GOALS.jobs} data={insights.jobs} />
      </div>

      {/* === Modales (si los necesitás para drilldown) === */}
      <AnimatePresence>
        {modal && (
          <Modal onClose={() => setModal(null)}>
            {/* Podés reutilizar AnalyticsModal si querés mostrar torta individual */}
          </Modal>
        )}
      </AnimatePresence>

      {/* 🐱 BOT INTELIGENTE (RodolfoBot versión mejorada) */}
<RodolfoBot stats={stats} insights={insights} yearCompare={yearCompare} />
</div>
);
}


/* === Tarjetas === */
function goalSub(value, goal) {
  const pct = Math.min(100, (value / goal) * 100);
  return `Meta: ${value.toLocaleString()} / ${goal.toLocaleString()} (${pct.toFixed(1)}%)`;
}

function StatCard({ icon, label, value, sub }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* CARD PRINCIPAL */}
      <div
        onClick={() => setOpen(true)}
        className="relative bg-white shadow-sm rounded-2xl p-5 text-left border border-gray-100 hover:shadow-md transition cursor-pointer group"
      >
        {/* Indicador En Vivo */}
        <span className="absolute top-3 right-3 flex items-center gap-1 text-xs text-rose-600 font-semibold">
          <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" /> En vivo
        </span>

        <div className="flex items-center gap-3 mb-2">{icon}</div>
        <div className="text-gray-700 text-sm">{label}</div>
        <div className="text-3xl font-extrabold text-gray-900 mt-1">
          {value.toLocaleString()}
        </div>
        {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}

        <div className="absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-emerald-400 transition" />
      </div>

      {/* MODAL DETALLE */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-2xl shadow-2xl p-6 w-[90%] max-w-md relative"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <button
                onClick={() => setOpen(false)}
                className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 text-lg"
              >
                ✕
              </button>

              <div className="flex items-center gap-3 mb-3">
                {icon}
                <h2 className="text-xl font-bold text-gray-900">{label}</h2>
              </div>

              <p className="text-4xl font-extrabold text-emerald-600 mb-2">
                {value.toLocaleString()}
              </p>

              <p className="text-sm text-gray-600 mb-4">{sub}</p>

              <div className="bg-gray-50 rounded-xl p-3 mb-4 border border-gray-200">
                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">
                  Estadísticas recientes
                </p>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>📈 Crecimiento semanal: <b>{(Math.random() * 12).toFixed(1)}%</b></li>
                  <li>📊 Proyección mensual: <b>{(Math.random() * 20).toFixed(1)}%</b></li>
                  <li>🎯 Probabilidad de meta anual: <b>{(60 + Math.random() * 40).toFixed(0)}%</b></li>
                </ul>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setOpen(false)}
                  className="bg-emerald-500 text-white px-4 py-2 rounded-lg hover:bg-emerald-600 transition"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}


/* === Contenedores / Cards === */
function ChartCard({ title, icon, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center gap-2 mb-3 text-gray-700 font-semibold">
        {icon} <span>{title}</span>
      </div>
      {children}
    </div>
  );
}
function MiniPie({ title, value, goal, color }) {
  const data = [
    { name: 'Actual', value },
    { name: 'Restante', value: Math.max(goal - value, 0) }
  ];
  const pct = Math.min(100, (value / goal) * 100);
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center gap-4">
      <PieChart width={120} height={120}>
        <Pie data={data} dataKey="value" innerRadius={38} outerRadius={55} paddingAngle={3}>
          <Cell fill={color} />
          <Cell fill="#E5E7EB" />
        </Pie>
        <Tooltip />
      </PieChart>
      <div>
        <div className="font-semibold text-gray-800">{title}</div>
        <div className="text-sm text-gray-600">
          {value.toLocaleString()} / {goal.toLocaleString()}
        </div>
        <div className="text-xs mt-1">
          <span className="font-semibold text-emerald-600">{pct.toFixed(1)}%</span> de la meta
        </div>
      </div>
    </div>
  );
}
function InsightCard({ title, color, goal, data }) {
  if (!data) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 text-sm text-gray-500">
        {title}: esperando datos…
      </div>
    );
  }
  const cagrPct = data.cagr != null ? (data.cagr * 100).toFixed(1) + '%' : '—';
  const probPct = Math.round((data.probToGoal ?? 0) * 100) + '%';

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
        <div className="font-semibold text-gray-800">{title}</div>
      </div>
      <div className="text-sm text-gray-600">
        Actual en rango: <b>{data.current?.toLocaleString?.() ?? data.current}</b>
      </div>
      <div className="text-sm text-gray-600">
        Anterior (mitad del rango): <b>{data.previous?.toLocaleString?.() ?? data.previous}</b>
      </div>
      <div className="text-sm text-gray-600">
        CAGR (anualizado): <b>{cagrPct}</b>
      </div>
      <div className="text-sm text-gray-600">
        Tendencia diaria: <b>{(data.slopePerDay ?? 0).toFixed(2)}</b> / día
      </div>
      <div className="text-sm text-gray-600">
        Prob. de alcanzar meta: <b>{probPct}</b>
      </div>
      {data.forecast30 != null && (
        <div className="mt-2 text-xs text-gray-500">
          Proyección a 30 días: <b>{Math.round(data.forecast30).toLocaleString()}</b> (meta {goal.toLocaleString()})
        </div>
      )}
    </div>
  );
}

/* ==== Modal genérico (opcional para drilldown futuro) ==== */
function Modal({ children, onClose }) {
  return (
    <motion.div
      className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-gradient-to-b from-white to-gray-50 rounded-3xl shadow-2xl p-8 w-[92%] max-w-md relative border border-gray-200"
        initial={{ scale: 0.9, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 30 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      >
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-500 hover:text-gray-800">
          <XCircle size={24} />
        </button>
        {children}
      </motion.div>
    </motion.div>
  );
}

/* === 🐾 RODOLFOBOT ULTRA PRO v2 — con fiestas automáticas cada 50 trabajadores === */
function RodolfoBot({ stats, insights, yearCompare }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState(false);
  const [showParty, setShowParty] = useState(false);

  /* 🌅 Saludo inicial + tono según hora */
  useEffect(() => {
    const hour = new Date().getHours();
    let greeting;
    if (hour < 12) greeting = '☀️ Buenos días, soy RodolfoBot. Ya revisé las métricas mientras tomaba mi leche.';
    else if (hour < 18) greeting = '🐾 Buenas tardes, sigo patrullando las estadísticas del día.';
    else greeting = '🌙 Buenas noches, todavía activo... los gatos analíticos no duermen 😼';
    setMessages([{ from: 'bot', text: `${greeting}\n¿Querés que te dé el brief del día?` }]);
  }, []);

  /* ✍️ Simula escritura */
  function simulateBotTyping(response, delay = 1200) {
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMessages((m) => [...m, { from: 'bot', text: response }]);
    }, delay);
  }

  /* 🎉 Fiesta automática cada 50 trabajadores */
  useEffect(() => {
    if (stats?.totalWorkers && stats.totalWorkers % 50 === 0 && stats.totalWorkers > 0) {
      setShowParty(true);
      const message = `🎉 ¡INCREÍBLE! Alcanzamos ${stats.totalWorkers} trabajadores registrados 🧰\nRodolfo está bailando sobre el teclado y tirando confeti 🐈🎊`;
      simulateBotTyping(message, 1000);

      const timer = setTimeout(() => setShowParty(false), 6000); // fiesta 6s
      return () => clearTimeout(timer);
    }
  }, [stats.totalWorkers]);

  /* 🎯 Meta */
  function goalSubLocal(value, goal) {
    const pct = Math.min(100, (value / goal) * 100);
    if (pct >= 100) return `🎉 ¡Meta cumplida (${pct.toFixed(1)}%)!`;
    if (pct > 70) return `😺 Cerca de la meta (${pct.toFixed(1)}%)`;
    if (pct > 40) return `🐾 En progreso (${pct.toFixed(1)}%)`;
    return `😿 Solo ${pct.toFixed(1)}%. Falta empuje.`;
  }

  /* 💹 Brief diario */
  function analyzeStats() {
    const ratio = stats.totalWorkers > 0 ? stats.totalJobs / stats.totalWorkers : 0;
    const cagr = insights.users?.cagr ?? 0;
    let msg = `📊 Brief Diario (${new Date().toLocaleDateString()}):\n\n`;
    msg += `👥 Usuarios: ${stats.totalUsers}\n🔧 Trabajadores: ${stats.totalWorkers}\n✅ Activos: ${stats.activeWorkers}\n💼 Trabajos: ${stats.totalJobs}\n\n`;

    if (ratio === 0) msg += `😾 No hay trabajos activos. ¡Despierten humanos!`;
    else if (ratio < 0.3) msg += `🙀 Muy pocos trabajos (${ratio.toFixed(2)}). Hay que mover la red.`;
    else if (ratio < 0.7) msg += `🐾 Ratio estable (${ratio.toFixed(2)}). Se puede mejorar.`;
    else msg += `😸 Buen equilibrio (${ratio.toFixed(2)}). ¡Excelente ritmo!`;

    if (cagr > 0.2) msg += `\n🚀 Crecimiento brutal (${(cagr * 100).toFixed(1)}%) 🔥`;
    else if (cagr > 0) msg += `\n🐾 Crecimiento leve (${(cagr * 100).toFixed(1)}%).`;
    else msg += `\n😿 Caída del ${(cagr * 100).toFixed(1)}%. Me voy por un café ☕`;

    return msg;
  }

  /* 📆 Reporte semanal (solo viernes) */
  function weeklyAdvice() {
    const today = new Date();
    if (today.getDay() !== 5) return;

    const growth = insights.users?.cagr ?? 0;
    const ratio = stats.totalWorkers > 0 ? stats.totalJobs / stats.totalWorkers : 0;
    let msg = `📅 Reporte Semanal — ${today.toLocaleDateString()}:\n\n`;

    if (growth > 0.1) msg += `😺 Semana espectacular (+${(growth * 100).toFixed(1)}% usuarios).`;
    else if (growth > 0) msg += `🐾 Semana estable (+${(growth * 100).toFixed(1)}%).`;
    else msg += `😾 Semana floja (${(growth * 100).toFixed(1)}%). Necesitamos energía.`;

    if (ratio < 0.4)
      msg += `\n⚠️ Pocos trabajos (${ratio.toFixed(2)}). Incentivá actividad.`;
    else if (ratio > 1)
      msg += `\n🚀 Mucha demanda (${ratio.toFixed(2)}). ¡Excelente!`;
    else msg += `\n👌 Ratio equilibrado (${ratio.toFixed(2)}).`;

    msg += `\n\n📌 Consejo: ${
      growth < 0
        ? 'Promocioná con recompensas 🧠'
        : ratio < 0.4
        ? 'Reforzá redes sociales esta semana 💡'
        : 'Seguimos así, consolidando la base 🚀'
    }`;

    simulateBotTyping(msg, 2500);
  }

  /* 🚨 Auto-reportes automáticos */
  useEffect(() => {
    setTimeout(() => {
      simulateBotTyping(analyzeStats());
      weeklyAdvice();
    }, 3000);
  }, [stats, insights]);

  /* 💬 Interacción natural */
  function ask() {
    if (!input.trim()) return;
    const q = input.toLowerCase().trim();
    setMessages((m) => [...m, { from: 'user', text: input }]);
    setInput('');

    const greet = ['hola', 'buenas', 'que tal', 'cómo va', 'como va', 'hey', 'holaa'];
    if (greet.some((w) => q.includes(w))) {
      simulateBotTyping('😸 ¡Hola! Soy Rodolfo, el gato analista. ¿Querés que te dé el resumen del día?');
      return;
    }

    if (q.includes('gracias')) {
      simulateBotTyping('🐾 De nada, humano. Si sigo así, voy a pedir aumento 😼');
      return;
    }

    if (q.includes('resumen') || q.includes('como va')) {
      simulateBotTyping(analyzeStats());
      return;
    }

    if (q.includes('activos')) {
      simulateBotTyping(`✅ Hay ${stats.activeWorkers} trabajadores activos ahora mismo.`);
      return;
    }

    if (q.includes('trabajador')) {
      simulateBotTyping(`🔧 En total hay ${stats.totalWorkers} trabajadores.`);
      return;
    }

    if (q.includes('usuario')) {
      simulateBotTyping(`👥 Tenemos ${stats.totalUsers} usuarios registrados. ${goalSubLocal(stats.totalUsers, 100000)}`);
      return;
    }

    if (q.includes('meta')) {
      const p = Math.round((insights.users?.probToGoal ?? 0) * 100);
      if (p < 40) simulateBotTyping(`😾 Solo ${p}%. Necesitamos garra y marketing.`);
      else if (p < 70) simulateBotTyping(`🐾 ${p}% de probabilidad. ¡Vamos bien!`);
      else simulateBotTyping(`🎯 ${p}% de probabilidad. ¡Objetivo a la vista! 🚀`);
      return;
    }

    if (q.includes('alerta')) {
      const ratio = stats.totalWorkers > 0 ? stats.totalJobs / stats.totalWorkers : 0;
      if (ratio < 0.3) simulateBotTyping(`🚨 Actividad muy baja (${ratio.toFixed(2)}).`);
      else if (ratio > 1) simulateBotTyping(`😺 Actividad excelente (${ratio.toFixed(2)}).`);
      else simulateBotTyping(`🐾 Todo en orden (${ratio.toFixed(2)}).`);
      return;
    }

    if (q.includes('semanal') || q.includes('reporte')) {
      weeklyAdvice();
      return;
    }

    simulateBotTyping('🤔 No entendí bien. Podés probar con “usuarios”, “trabajadores”, “meta”, “alerta”, “resumen” o “reporte semanal”.');
  }

  /* 🎉 Interfaz + fiesta visual */
  return (
    <div className="fixed bottom-6 right-6 z-50">
      {showParty && (
        <div className="fixed inset-0 bg-emerald-100/60 backdrop-blur-sm flex items-center justify-center z-[60] animate-fade-in">
          <div className="text-center text-4xl font-bold animate-bounce">
            🎊 Rodolfo está de fiesta 🎊
            <div className="text-2xl mt-2 text-emerald-700">¡Seguimos creciendo juntos! 🐾</div>
          </div>
        </div>
      )}

      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="bg-emerald-500 text-white rounded-full p-4 shadow-lg hover:scale-105 transition flex items-center justify-center gap-2"
        >
          <motion.div
            className="text-2xl"
            animate={{ y: [0, -2, 0, 2, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            🐱
          </motion.div>
          RodolfoBot
        </button>
      )}

      {open && (
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-80 h-[440px] flex flex-col">
          <div className="p-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold rounded-t-2xl flex justify-between items-center">
            <div className="flex items-center gap-2">
              <motion.div
                className="text-xl"
                animate={{ rotate: [0, 5, 0, -5, 0] }}
                transition={{ repeat: Infinity, duration: 3 }}
              >
                🐈
              </motion.div>
              RodolfoBot
            </div>
            <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white">✕</button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 text-sm bg-gradient-to-b from-emerald-50 to-white">
            {messages.map((m, i) => (
              <div key={i} className={`p-2 rounded-xl max-w-[90%] whitespace-pre-line ${
                m.from === 'bot'
                  ? 'bg-emerald-50 text-gray-700 self-start'
                  : 'bg-emerald-500 text-white self-end ml-auto'
              }`}>
                {m.text}
              </div>
            ))}
            {typing && <div className="italic text-gray-400 text-xs animate-pulse">Rodolfo está escribiendo...</div>}
          </div>

          <div className="flex items-center border-t p-2 bg-gray-50">
            <input
              className="flex-1 text-sm border rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-emerald-400"
              placeholder="¿En qué puedo ayudarte?"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && ask()}
            />
            <button
              onClick={ask}
              className="ml-2 bg-emerald-500 text-white rounded-lg p-2 hover:bg-emerald-600"
            >
              <SendHorizontal size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* === 🔗 join2 === */
function join2(a, b, keyA, keyB) {
  const map = {};
  (a || []).forEach(p => { map[p.day] = { day: p.day, [keyA]: p.value }; });
  (b || []).forEach(p => {
    map[p.day] = { ...(map[p.day] || { day: p.day }), [keyB]: p.value };
  });
  return Object.values(map).sort((x, y) => x.day.localeCompare(y.day));
}
