'use client';

import { useEffect, useMemo, useState } from 'react';
import { getSupabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
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
  SendHorizontal,
  Radar,
  ShieldCheck,
  Sparkles,
  Brain,
  Wallet,
  Receipt,
  FilePlus2,
  DollarSign,
  TriangleAlert,
  TrendingDown,
  BadgeDollarSign,
  Building2,
  ClipboardList,
  PieChart as PieChartIcon,
  ScanSearch,
  Cpu,
  Bot,
  Target,
  Siren,
  FileSpreadsheet,
  CircleDollarSign,
  CheckCircle2,
  Clock3,
  Filter,
} from 'lucide-react';

/* 📊 Recharts */
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar as RadarShape,
} from 'recharts';

import '../../globals.css';

const supabase = getSupabase();

/* =========================
   CONFIG
========================= */
const GOALS = {
  users: 100000,
  workers: 13000,
  activeWorkers: 13000,
  jobs: 50000,
  revenue: 250000000, // Gs.
};

const RANGES = [
  { key: 30, label: '30 días' },
  { key: 90, label: '90 días' },
  { key: 365, label: '365 días' },
];

const EXPENSE_CATEGORIES = [
  'Marketing',
  'Operación',
  'Tecnología',
  'Transporte',
  'Diseño',
  'Oficina',
  'Legal',
  'Contabilidad',
  'Sueldos',
  'Comisiones',
  'Otros',
];

const INVOICE_STATUSES = ['draft', 'issued', 'paid', 'cancelled'];
const EXPENSE_STATUSES = ['pending', 'paid', 'cancelled'];

const ADMIN_EXPENSES_TABLE = 'admin_expenses';
const ADMIN_INVOICES_TABLE = 'admin_invoices';

/* =========================
   HELPERS
========================= */
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

function groupCountByDay(rows, dateKey = 'created_at') {
  const map = {};
  (rows || []).forEach((r) => {
    const raw = r?.[dateKey] || r?.createdAt || r?.inserted_at || r?.updated_at;
    if (!raw) return;
    const key = fmtD(raw);
    map[key] = (map[key] || 0) + 1;
  });
  return map;
}

function groupAmountByDay(rows, dateKey = 'issued_at', amountKey = 'amount') {
  const map = {};
  (rows || []).forEach((r) => {
    const raw = r?.[dateKey] || r?.created_at;
    if (!raw) return;
    const key = fmtD(raw);
    map[key] = (map[key] || 0) + Number(r?.[amountKey] || 0);
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
  const ys = series.map((p) => p[key] ?? 0);
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
  return Math.max(0, Math.min(1, (120 - daysNeeded) / 120));
}

function gs(n) {
  return `Gs. ${Number(n || 0).toLocaleString('es-PY')}`;
}

function pct(n, total) {
  if (!total) return 0;
  return (Number(n || 0) / Number(total || 0)) * 100;
}

function join2(a, b, keyA, keyB) {
  const map = {};
  (a || []).forEach((p) => {
    map[p.day] = { day: p.day, [keyA]: p.value };
  });
  (b || []).forEach((p) => {
    map[p.day] = { ...(map[p.day] || { day: p.day }), [keyB]: p.value };
  });
  return Object.values(map).sort((x, y) => x.day.localeCompare(y.day));
}

function joinMany(seriesMap) {
  const map = {};
  Object.entries(seriesMap || {}).forEach(([seriesKey, arr]) => {
    (arr || []).forEach((p) => {
      map[p.day] = { ...(map[p.day] || { day: p.day }), [seriesKey]: p.value };
    });
  });
  return Object.values(map).sort((a, b) => a.day.localeCompare(b.day));
}

function safeAvg(arr) {
  if (!arr?.length) return 0;
  return arr.reduce((a, b) => a + Number(b || 0), 0) / arr.length;
}

function getBusinessHealthScore({
  users,
  workers,
  activeWorkers,
  jobs,
  revenue,
  expenses,
  paidInvoices,
}) {
  let score = 0;

  if (users > 0) score += 12;
  if (workers > 0) score += 12;
  if (activeWorkers > 0) score += 14;
  if (jobs > 0) score += 16;
  if (revenue > 0) score += 18;
  if (paidInvoices > 0) score += 12;
  if (revenue > expenses) score += 16;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function getHealthLabel(score) {
  if (score >= 85) return { label: 'Excelente', badge: 'bg-emerald-500/15 text-emerald-200' };
  if (score >= 65) return { label: 'Sólido', badge: 'bg-cyan-500/15 text-cyan-200' };
  if (score >= 45) return { label: 'Vigilancia', badge: 'bg-amber-500/15 text-amber-200' };
  return { label: 'Crítico', badge: 'bg-red-500/15 text-red-200' };
}

/* =========================
   PAGE
========================= */
export default function AdminAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState(30);
  const [activeTab, setActiveTab] = useState('overview');

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalWorkers: 0,
    activeWorkers: 0,
    totalJobs: 0,
    verifiedWorkers: 0,
  });

  const [yearCompare, setYearCompare] = useState({
    usersThis: 0,
    usersPrev: 0,
    workersThis: 0,
    workersPrev: 0,
    jobsThis: 0,
    jobsPrev: 0,
    revenueThis: 0,
    revenuePrev: 0,
  });

  const [series, setSeries] = useState({
    users: [],
    workers: [],
    jobs: [],
    revenue: [],
    expenses: [],
    profit: [],
  });

  const [finance, setFinance] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    paidInvoices: 0,
    pendingInvoices: 0,
    paidExpenses: 0,
    pendingExpenses: 0,
    avgTicket: 0,
  });

  const [financialLists, setFinancialLists] = useState({
    expenses: [],
    invoices: [],
  });

  const [ops, setOps] = useState({
    jobsCompleted: 0,
    jobsCancelled: 0,
    jobsOpen: 0,
    jobsAccepted: 0,
    workersWithDocs: 0,
    workersWithoutDocs: 0,
    avgRating: 0,
  });

  const [modal, setModal] = useState(null);

  const [expenseForm, setExpenseForm] = useState({
    concept: '',
    category: 'Operación',
    vendor: '',
    amount: '',
    invoice_number: '',
    issued_at: fmtD(new Date()),
    status: 'paid',
    notes: '',
  });

  const [invoiceForm, setInvoiceForm] = useState({
    customer_name: '',
    description: '',
    amount: '',
    invoice_number: '',
    issued_at: fmtD(new Date()),
    due_at: fmtD(new Date()),
    status: 'issued',
    notes: '',
  });

  useEffect(() => {
    fetchAll();
    const channel = supabase
      .channel('manosya-admin-analytics-jarvis')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'worker_profiles' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'documents' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: ADMIN_EXPENSES_TABLE }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: ADMIN_INVOICES_TABLE }, fetchAll)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchRange(range);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  async function fetchAll() {
    try {
      setLoading(true);

      const [
        usersCountRes,
        workersCountRes,
        activeWorkersCountRes,
        verifiedWorkersCountRes,
        jobsRes,
        docsRes,
        reviewsRes,
        expensesRes,
        invoicesRes,
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('worker_profiles').select('*', { count: 'exact', head: true }),
        supabase
          .from('admin_workers_view')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true)
          .eq('worker_verified', true),
        supabase
          .from('admin_workers_view')
          .select('*', { count: 'exact', head: true })
          .eq('worker_verified', true),
        supabase.from('jobs').select('status, created_at'),
        supabase.from('documents').select('user_id, doc_type, created_at'),
        supabase.from('reviews').select('rating, created_at'),
        supabase.from(ADMIN_EXPENSES_TABLE).select('*').order('issued_at', { ascending: false }),
        supabase.from(ADMIN_INVOICES_TABLE).select('*').order('issued_at', { ascending: false }),
      ]);

      const jobs = jobsRes.data || [];
      const docs = docsRes.data || [];
      const reviews = reviewsRes.data || [];
      const expenses = expensesRes.data || [];
      const invoices = invoicesRes.data || [];

      const jobsCompleted = jobs.filter((j) => j.status === 'completed').length;
      const jobsCancelled = jobs.filter((j) => j.status === 'cancelled').length;
      const jobsOpen = jobs.filter((j) => j.status === 'open').length;
      const jobsAccepted = jobs.filter((j) => j.status === 'accepted' || j.status === 'assigned').length;

      const usersWithDocs = new Set(docs.map((d) => d.user_id));
      const totalWorkers = workersCountRes.count || 0;
      const workersWithDocs = usersWithDocs.size;
      const workersWithoutDocs = Math.max(totalWorkers - workersWithDocs, 0);

      const totalRevenue = invoices
        .filter((i) => i.status === 'paid' || i.status === 'issued')
        .reduce((acc, i) => acc + Number(i.amount || 0), 0);

      const paidInvoices = invoices
        .filter((i) => i.status === 'paid')
        .reduce((acc, i) => acc + Number(i.amount || 0), 0);

      const pendingInvoices = invoices
        .filter((i) => i.status === 'issued' || i.status === 'draft')
        .reduce((acc, i) => acc + Number(i.amount || 0), 0);

      const totalExpenses = expenses
        .filter((e) => e.status !== 'cancelled')
        .reduce((acc, e) => acc + Number(e.amount || 0), 0);

      const paidExpenses = expenses
        .filter((e) => e.status === 'paid')
        .reduce((acc, e) => acc + Number(e.amount || 0), 0);

      const pendingExpenses = expenses
        .filter((e) => e.status === 'pending')
        .reduce((acc, e) => acc + Number(e.amount || 0), 0);

      setStats({
        totalUsers: usersCountRes.count || 0,
        totalWorkers: workersCountRes.count || 0,
        activeWorkers: activeWorkersCountRes.count || 0,
        totalJobs: jobs.length || 0,
        verifiedWorkers: verifiedWorkersCountRes.count || 0,
      });

      setOps({
        jobsCompleted,
        jobsCancelled,
        jobsOpen,
        jobsAccepted,
        workersWithDocs,
        workersWithoutDocs,
        avgRating: Number(safeAvg(reviews.map((r) => r.rating)).toFixed(2)),
      });

      setFinance({
        totalRevenue,
        totalExpenses,
        netProfit: totalRevenue - totalExpenses,
        paidInvoices,
        pendingInvoices,
        paidExpenses,
        pendingExpenses,
        avgTicket: jobs.length ? Math.round(totalRevenue / jobs.length) : 0,
      });

      setFinancialLists({
        expenses: expenses.slice(0, 12),
        invoices: invoices.slice(0, 12),
      });

      const sinceThisYear = new Date();
      sinceThisYear.setFullYear(sinceThisYear.getFullYear() - 1);

      const sincePrevYear = new Date();
      sincePrevYear.setFullYear(sincePrevYear.getFullYear() - 2);

      const [
        usersThis,
        usersPrev,
        workersThis,
        workersPrev,
        jobsThis,
        jobsPrev,
        revenueThisRes,
        revenuePrevRes,
      ] = await Promise.all([
        supabase.from('profiles').select('created_at', { count: 'exact' }).gte('created_at', sinceThisYear.toISOString()),
        supabase.from('profiles').select('created_at', { count: 'exact' }).gte('created_at', sincePrevYear.toISOString()).lt('created_at', sinceThisYear.toISOString()),
        supabase.from('worker_profiles').select('created_at', { count: 'exact' }).gte('created_at', sinceThisYear.toISOString()),
        supabase.from('worker_profiles').select('created_at', { count: 'exact' }).gte('created_at', sincePrevYear.toISOString()).lt('created_at', sinceThisYear.toISOString()),
        supabase.from('jobs').select('created_at', { count: 'exact' }).gte('created_at', sinceThisYear.toISOString()),
        supabase.from('jobs').select('created_at', { count: 'exact' }).gte('created_at', sincePrevYear.toISOString()).lt('created_at', sinceThisYear.toISOString()),
        supabase.from(ADMIN_INVOICES_TABLE).select('amount, issued_at').gte('issued_at', sinceThisYear.toISOString()),
        supabase.from(ADMIN_INVOICES_TABLE).select('amount, issued_at').gte('issued_at', sincePrevYear.toISOString()).lt('issued_at', sinceThisYear.toISOString()),
      ]);

      const revenueThis = (revenueThisRes.data || []).reduce((acc, row) => acc + Number(row.amount || 0), 0);
      const revenuePrev = (revenuePrevRes.data || []).reduce((acc, row) => acc + Number(row.amount || 0), 0);

      setYearCompare({
        usersThis: usersThis.count || 0,
        usersPrev: usersPrev.count || 0,
        workersThis: workersThis.count || 0,
        workersPrev: workersPrev.count || 0,
        jobsThis: jobsThis.count || 0,
        jobsPrev: jobsPrev.count || 0,
        revenueThis,
        revenuePrev,
      });
    } catch (err) {
      console.error(err);
      toast.error('Error cargando analítica avanzada');
    } finally {
      setLoading(false);
    }
  }

  async function fetchRange(daysWindow) {
    try {
      const from = daysAgo(daysWindow).toISOString();

      const [u, w, j, inv, exp] = await Promise.all([
        supabase.from('profiles').select('created_at').gte('created_at', from),
        supabase.from('worker_profiles').select('created_at').gte('created_at', from),
        supabase.from('jobs').select('created_at').gte('created_at', from),
        supabase.from(ADMIN_INVOICES_TABLE).select('issued_at, amount').gte('issued_at', from),
        supabase.from(ADMIN_EXPENSES_TABLE).select('issued_at, amount').gte('issued_at', from),
      ]);

      const now = new Date();
      const days = seqDays(daysAgo(daysWindow), now);

      const uMap = groupCountByDay(u.data || []);
      const wMap = groupCountByDay(w.data || []);
      const jMap = groupCountByDay(j.data || []);
      const invMap = groupAmountByDay(inv.data || []);
      const expMap = groupAmountByDay(exp.data || []);

      let cu = 0;
      let cw = 0;
      let cj = 0;
      let cr = 0;
      let ce = 0;

      const cumulative = days.map((d) => {
        cu += uMap[d] || 0;
        cw += wMap[d] || 0;
        cj += jMap[d] || 0;
        cr += invMap[d] || 0;
        ce += expMap[d] || 0;

        return {
          day: d,
          users: cu,
          workers: cw,
          jobs: cj,
          revenue: cr,
          expenses: ce,
          profit: cr - ce,
        };
      });

      setSeries({
        users: cumulative.map((p) => ({ day: p.day, value: p.users })),
        workers: cumulative.map((p) => ({ day: p.day, value: p.workers })),
        jobs: cumulative.map((p) => ({ day: p.day, value: p.jobs })),
        revenue: cumulative.map((p) => ({ day: p.day, value: p.revenue })),
        expenses: cumulative.map((p) => ({ day: p.day, value: p.expenses })),
        profit: cumulative.map((p) => ({ day: p.day, value: p.profit })),
      });
    } catch (err) {
      console.error(err);
    }
  }

  async function createExpense() {
    try {
      if (!expenseForm.concept.trim() || !expenseForm.amount) {
        toast.warning('Cargá concepto y monto del gasto');
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase.from(ADMIN_EXPENSES_TABLE).insert({
        concept: expenseForm.concept.trim(),
        category: expenseForm.category,
        vendor: expenseForm.vendor?.trim() || null,
        amount: Number(expenseForm.amount),
        invoice_number: expenseForm.invoice_number?.trim() || null,
        issued_at: expenseForm.issued_at || null,
        status: expenseForm.status,
        notes: expenseForm.notes?.trim() || null,
        created_by: user?.id || null,
      });

      if (error) throw error;

      toast.success('Gasto cargado correctamente');
      setExpenseForm({
        concept: '',
        category: 'Operación',
        vendor: '',
        amount: '',
        invoice_number: '',
        issued_at: fmtD(new Date()),
        status: 'paid',
        notes: '',
      });
      fetchAll();
      fetchRange(range);
    } catch (err) {
      console.error(err);
      toast.error('No se pudo guardar el gasto');
    }
  }

  async function createInvoice() {
    try {
      if (!invoiceForm.customer_name.trim() || !invoiceForm.amount) {
        toast.warning('Cargá cliente y monto de factura');
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase.from(ADMIN_INVOICES_TABLE).insert({
        customer_name: invoiceForm.customer_name.trim(),
        description: invoiceForm.description?.trim() || null,
        amount: Number(invoiceForm.amount),
        invoice_number: invoiceForm.invoice_number?.trim() || null,
        issued_at: invoiceForm.issued_at || null,
        due_at: invoiceForm.due_at || null,
        status: invoiceForm.status,
        notes: invoiceForm.notes?.trim() || null,
        created_by: user?.id || null,
      });

      if (error) throw error;

      toast.success('Factura emitida guardada');
      setInvoiceForm({
        customer_name: '',
        description: '',
        amount: '',
        invoice_number: '',
        issued_at: fmtD(new Date()),
        due_at: fmtD(new Date()),
        status: 'issued',
        notes: '',
      });
      fetchAll();
      fetchRange(range);
    } catch (err) {
      console.error(err);
      toast.error('No se pudo guardar la factura');
    }
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
      const trend = linearTrendProjection(
        s.map((p, i) => ({ i, value: p.value })),
        'value',
        30
      );
      const slope = trend?.slope ?? 0;
      const prob = probabilityToHitGoal(curVal, goal, slope);

      return {
        current: curVal,
        previous: prevVal,
        cagr,
        slopePerDay: slope,
        probToGoal: prob,
        forecast30: trend?.forecast ?? null,
      };
    }

    return {
      users: buildInsight('users', GOALS.users),
      workers: buildInsight('workers', GOALS.workers),
      jobs: buildInsight('jobs', GOALS.jobs),
      revenue: buildInsight('revenue', GOALS.revenue),
    };
  }, [series, range]);

  const healthScore = useMemo(() => {
    return getBusinessHealthScore({
      users: stats.totalUsers,
      workers: stats.totalWorkers,
      activeWorkers: stats.activeWorkers,
      jobs: stats.totalJobs,
      revenue: finance.totalRevenue,
      expenses: finance.totalExpenses,
      paidInvoices: finance.paidInvoices,
    });
  }, [stats, finance]);

  const healthUI = getHealthLabel(healthScore);

  const radarData = useMemo(() => {
    return [
      { subject: 'Usuarios', value: Math.min(100, pct(stats.totalUsers, GOALS.users)) },
      { subject: 'Trabajadores', value: Math.min(100, pct(stats.totalWorkers, GOALS.workers)) },
      { subject: 'Activos', value: Math.min(100, pct(stats.activeWorkers, GOALS.activeWorkers)) },
      { subject: 'Trabajos', value: Math.min(100, pct(stats.totalJobs, GOALS.jobs)) },
      {
        subject: 'Rentabilidad',
        value:
          finance.totalRevenue > 0
            ? Math.max(
                0,
                Math.min(100, ((finance.netProfit || 0) / Math.max(finance.totalRevenue, 1)) * 100 + 50)
              )
            : 0,
      },
      {
        subject: 'Documentación',
        value:
          stats.totalWorkers > 0
            ? Math.min(100, pct(ops.workersWithDocs, stats.totalWorkers))
            : 0,
      },
    ];
  }, [stats, finance, ops]);

  const expenseCategoryData = useMemo(() => {
    const map = {};
    for (const e of financialLists.expenses || []) {
      const cat = e.category || 'Otros';
      map[cat] = (map[cat] || 0) + Number(e.amount || 0);
    }
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [financialLists.expenses]);

  const invoiceStatusData = useMemo(() => {
    const map = {};
    for (const i of financialLists.invoices || []) {
      const key = i.status || 'issued';
      map[key] = (map[key] || 0) + Number(i.amount || 0);
    }
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [financialLists.invoices]);

  const executiveAlerts = useMemo(() => {
    const out = [];

    if (finance.netProfit < 0) {
      out.push({
        level: 'high',
        title: 'Rentabilidad negativa',
        detail: 'Los gastos superan los ingresos registrados.',
      });
    }

    if (stats.totalWorkers > 0 && ops.workersWithoutDocs / stats.totalWorkers > 0.3) {
      out.push({
        level: 'medium',
        title: 'Muchos trabajadores sin documentos',
        detail: `${ops.workersWithoutDocs} perfiles todavía no están correctamente documentados.`,
      });
    }

    const jobWorkerRatio =
      stats.totalWorkers > 0 ? stats.totalJobs / Math.max(stats.totalWorkers, 1) : 0;

    if (jobWorkerRatio < 0.3) {
      out.push({
        level: 'medium',
        title: 'Baja actividad por trabajador',
        detail: 'La demanda todavía es baja comparada con la cantidad de trabajadores.',
      });
    }

    if (finance.pendingInvoices > finance.paidInvoices) {
      out.push({
        level: 'medium',
        title: 'Demasiadas facturas pendientes',
        detail: 'Conviene fortalecer el seguimiento de cobros.',
      });
    }

    if (healthScore >= 80) {
      out.push({
        level: 'positive',
        title: 'Salud del negocio sólida',
        detail: 'La radiografía general muestra una base operativa fuerte.',
      });
    }

    return out;
  }, [finance, stats, ops, healthScore]);

  return (
    <div className="min-h-screen bg-[#06111A] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-20 left-[-8%] h-80 w-80 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="absolute top-[10%] right-[-6%] h-[28rem] w-[28rem] rounded-full bg-cyan-500/15 blur-3xl" />
        <div className="absolute bottom-[-10%] left-[20%] h-[24rem] w-[24rem] rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      <main className="relative z-10 mx-auto max-w-7xl px-4 py-6 md:px-6 lg:px-8">
        <TopHeader range={range} setRange={setRange} />

        <ExecutiveHero
          healthScore={healthScore}
          healthUI={healthUI}
          stats={stats}
          finance={finance}
          loading={loading}
        />

        <TabsBar activeTab={activeTab} setActiveTab={setActiveTab} alerts={executiveAlerts.length} />

        {loading ? (
          <LoadingState />
        ) : (
          <>
            {activeTab === 'overview' && (
              <>
                <KpiGrid stats={stats} finance={finance} ops={ops} />
                <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_0.9fr]">
                  <ChartCard title="Radiografía del negocio" icon={<Radar />}>
                    <ResponsiveContainer width="100%" height={320}>
                      <RadarChart data={radarData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="subject" />
                        <PolarRadiusAxis domain={[0, 100]} />
                        <RadarShape
                          name="ManosYA"
                          dataKey="value"
                          stroke="#10B981"
                          fill="#10B981"
                          fillOpacity={0.35}
                        />
                        <Tooltip />
                      </RadarChart>
                    </ResponsiveContainer>
                  </ChartCard>

                  <ExecutiveAlerts alerts={executiveAlerts} />
                </div>
              </>
            )}

            {activeTab === 'growth' && (
              <>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <ChartCard title="Crecimiento acumulado — Usuarios vs Trabajadores" icon={<TrendingUp />}>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={join2(series.users, series.workers, 'users', 'workers')}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                        <XAxis dataKey="day" stroke="#94A3B8" />
                        <YAxis stroke="#94A3B8" />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="users" name="Usuarios" stroke="#06B6D4" dot={false} />
                        <Line type="monotone" dataKey="workers" name="Trabajadores" stroke="#10B981" dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartCard>

                  <ChartCard title="Trabajos acumulados" icon={<Activity />}>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={series.jobs}>
                        <defs>
                          <linearGradient id="jobsGradientJarvis" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.08} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                        <XAxis dataKey="day" stroke="#94A3B8" />
                        <YAxis stroke="#94A3B8" />
                        <Tooltip />
                        <Area type="monotone" dataKey="value" name="Trabajos" stroke="#8B5CF6" fill="url(#jobsGradientJarvis)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </ChartCard>

                  <ChartCard title="Comparativo interanual" icon={<BarChart3 />}>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={[
                          { k: 'Usuarios', actual: yearCompare.usersThis, previo: yearCompare.usersPrev },
                          { k: 'Trabajadores', actual: yearCompare.workersThis, previo: yearCompare.workersPrev },
                          { k: 'Trabajos', actual: yearCompare.jobsThis, previo: yearCompare.jobsPrev },
                          { k: 'Ingresos', actual: yearCompare.revenueThis, previo: yearCompare.revenuePrev },
                        ]}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                        <XAxis dataKey="k" stroke="#94A3B8" />
                        <YAxis stroke="#94A3B8" />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="actual" name="Últimos 12m" fill="#14B8A6" />
                        <Bar dataKey="previo" name="12m previos" fill="#CBD5E1" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>

                  <ChartCard title="Insights y proyecciones" icon={<Brain />}>
                    <div className="grid gap-4 md:grid-cols-2">
                      <InsightCard title="Usuarios" color="#06B6D4" goal={GOALS.users} data={insights.users} />
                      <InsightCard title="Trabajadores" color="#10B981" goal={GOALS.workers} data={insights.workers} />
                      <InsightCard title="Trabajos" color="#8B5CF6" goal={GOALS.jobs} data={insights.jobs} />
                      <InsightCard title="Ingresos" color="#F59E0B" goal={GOALS.revenue} data={insights.revenue} money />
                    </div>
                  </ChartCard>
                </div>
              </>
            )}

            {activeTab === 'finance' && (
              <>
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
                  <div className="space-y-6">
                    <KpiFinance finance={finance} />

                    <ChartCard title="Ingresos vs Gastos vs Resultado" icon={<Wallet />}>
                      <ResponsiveContainer width="100%" height={320}>
                        <LineChart
                          data={joinMany({
                            ingresos: series.revenue,
                            gastos: series.expenses,
                            resultado: series.profit,
                          })}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                          <XAxis dataKey="day" stroke="#94A3B8" />
                          <YAxis stroke="#94A3B8" />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="ingresos" stroke="#10B981" dot={false} />
                          <Line type="monotone" dataKey="gastos" stroke="#EF4444" dot={false} />
                          <Line type="monotone" dataKey="resultado" stroke="#06B6D4" dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartCard>

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                      <ChartCard title="Gastos por categoría" icon={<PieChartIcon />}>
                        <ResponsiveContainer width="100%" height={280}>
                          <PieChart>
                            <Pie data={expenseCategoryData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90}>
                              {expenseCategoryData.map((_, idx) => (
                                <Cell key={idx} fill={['#10B981', '#06B6D4', '#8B5CF6', '#F59E0B', '#EF4444', '#14B8A6'][idx % 6]} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </ChartCard>

                      <ChartCard title="Facturas por estado" icon={<Receipt />}>
                        <ResponsiveContainer width="100%" height={280}>
                          <BarChart data={invoiceStatusData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                            <XAxis dataKey="name" stroke="#94A3B8" />
                            <YAxis stroke="#94A3B8" />
                            <Tooltip />
                            <Bar dataKey="value" fill="#14B8A6" />
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartCard>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <FinanceForms
                      expenseForm={expenseForm}
                      setExpenseForm={setExpenseForm}
                      invoiceForm={invoiceForm}
                      setInvoiceForm={setInvoiceForm}
                      onCreateExpense={createExpense}
                      onCreateInvoice={createInvoice}
                    />

                    <FinancialList
                      title="Últimos gastos registrados"
                      icon={<FileSpreadsheet />}
                      rows={financialLists.expenses}
                      empty="No hay gastos cargados todavía."
                      renderRow={(row) => (
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="font-semibold text-white">{row.concept || 'Sin concepto'}</div>
                            <div className="text-xs text-white/45">
                              {row.category || 'Sin categoría'} · {row.vendor || 'Sin proveedor'}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-red-300">{gs(row.amount)}</div>
                            <div className="text-xs text-white/45">{row.status || 'pending'}</div>
                          </div>
                        </div>
                      )}
                    />

                    <FinancialList
                      title="Últimas facturas emitidas"
                      icon={<Receipt />}
                      rows={financialLists.invoices}
                      empty="No hay facturas emitidas todavía."
                      renderRow={(row) => (
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="font-semibold text-white">{row.customer_name || 'Sin cliente'}</div>
                            <div className="text-xs text-white/45">
                              {row.invoice_number || 'Sin número'} · {row.status || 'issued'}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-emerald-300">{gs(row.amount)}</div>
                            <div className="text-xs text-white/45">
                              {row.issued_at ? new Date(row.issued_at).toLocaleDateString('es-PY') : 'Sin fecha'}
                            </div>
                          </div>
                        </div>
                      )}
                    />
                  </div>
                </div>
              </>
            )}

            {activeTab === 'operations' && (
              <>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-4">
                  <OpsCard icon={<CheckCircle2 />} label="Trabajos completados" value={ops.jobsCompleted} />
                  <OpsCard icon={<Clock3 />} label="Trabajos abiertos" value={ops.jobsOpen} />
                  <OpsCard icon={<TriangleAlert />} label="Trabajos cancelados" value={ops.jobsCancelled} />
                  <OpsCard icon={<ShieldCheck />} label="Rating promedio" value={ops.avgRating} />
                </div>

                <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                  <ChartCard title="Pipeline operativo" icon={<ClipboardList />}>
                    <ResponsiveContainer width="100%" height={320}>
                      <BarChart
                        data={[
                          { name: 'Abiertos', value: ops.jobsOpen },
                          { name: 'Aceptados', value: ops.jobsAccepted },
                          { name: 'Completados', value: ops.jobsCompleted },
                          { name: 'Cancelados', value: ops.jobsCancelled },
                        ]}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                        <XAxis dataKey="name" stroke="#94A3B8" />
                        <YAxis stroke="#94A3B8" />
                        <Tooltip />
                        <Bar dataKey="value" fill="#10B981" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>

                  <ChartCard title="Documentación de trabajadores" icon={<ScanSearch />}>
                    <div className="space-y-4">
                      <MiniProgress
                        label="Con documentos"
                        value={ops.workersWithDocs}
                        total={Math.max(stats.totalWorkers, 1)}
                        colorClass="bg-emerald-400"
                      />
                      <MiniProgress
                        label="Sin documentos"
                        value={ops.workersWithoutDocs}
                        total={Math.max(stats.totalWorkers, 1)}
                        colorClass="bg-red-400"
                      />
                      <MiniProgress
                        label="Verificados"
                        value={stats.verifiedWorkers}
                        total={Math.max(stats.totalWorkers, 1)}
                        colorClass="bg-cyan-400"
                      />
                      <MiniProgress
                        label="Activos"
                        value={stats.activeWorkers}
                        total={Math.max(stats.totalWorkers, 1)}
                        colorClass="bg-violet-400"
                      />
                    </div>
                  </ChartCard>
                </div>
              </>
            )}

            {activeTab === 'jarvis' && (
              <JarvisCopilot
                stats={stats}
                finance={finance}
                ops={ops}
                insights={insights}
                healthScore={healthScore}
                alerts={executiveAlerts}
              />
            )}
          </>
        )}
      </main>

      <AnimatePresence>
        {modal && (
          <Modal onClose={() => setModal(null)}>
            <div className="text-white">Modal reservado para drilldown futuro</div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

/* =========================
   UI PARTS
========================= */
function TopHeader({ range, setRange }) {
  return (
    <div className="mb-6 rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur-xl shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">
            <Cpu className="h-3.5 w-3.5" />
            ManosYA Command Center
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white md:text-4xl">
            Panel Administrativo Inteligente
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-white/65 md:text-base">
            Control ejecutivo, operación, finanzas, proyecciones y radiografía del futuro de ManosYA.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/20 p-2">
          <CalendarClock className="ml-2 h-4 w-4 text-white/45" />
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                range === r.key
                  ? 'bg-emerald-500 text-white'
                  : 'text-white/70 hover:bg-white/10'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ExecutiveHero({ healthScore, healthUI, stats, finance, loading }) {
  return (
    <div className="mb-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-[30px] border border-white/10 bg-gradient-to-br from-emerald-500/15 via-cyan-500/10 to-slate-900 p-6 shadow-[0_30px_100px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
            <Sparkles className="h-5 w-5 text-emerald-300" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.24em] text-emerald-300/80">Executive AI Layer</div>
            <h2 className="text-2xl font-black text-white">Radiografía general del sistema</h2>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <GlassStat label="Usuarios" value={stats.totalUsers} />
          <GlassStat label="Trabajadores" value={stats.totalWorkers} />
          <GlassStat label="Trabajos" value={stats.totalJobs} />
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
            <div className="text-sm text-white/55">Ingresos registrados</div>
            <div className="mt-2 text-3xl font-black text-emerald-300">{gs(finance.totalRevenue)}</div>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
            <div className="text-sm text-white/55">Resultado neto</div>
            <div className={`mt-2 text-3xl font-black ${finance.netProfit >= 0 ? 'text-cyan-300' : 'text-red-300'}`}>
              {gs(finance.netProfit)}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[30px] border border-white/10 bg-white/5 p-6 shadow-[0_30px_100px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.24em] text-cyan-300/80">Business Core Health</div>
            <h3 className="mt-1 text-xl font-black text-white">Salud del negocio</h3>
          </div>
          <div className={`rounded-full px-3 py-1 text-xs font-bold ${healthUI.badge}`}>
            {healthUI.label}
          </div>
        </div>

        <div className="mb-3 text-5xl font-black text-white">{loading ? '...' : healthScore}</div>

        <div className="h-3 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-sky-400"
            style={{ width: `${Math.max(0, Math.min(100, healthScore))}%` }}
          />
        </div>

        <div className="mt-4 grid gap-3">
          <MiniKeyLine icon={<Users className="h-4 w-4" />} label="Base de usuarios viva" />
          <MiniKeyLine icon={<Wallet className="h-4 w-4" />} label="Pulso financiero integrado" />
          <MiniKeyLine icon={<ShieldCheck className="h-4 w-4" />} label="Control operativo centralizado" />
          <MiniKeyLine icon={<Brain className="h-4 w-4" />} label="Proyección de crecimiento" />
        </div>
      </div>
    </div>
  );
}

function TabsBar({ activeTab, setActiveTab, alerts }) {
  const tabs = [
    { key: 'overview', label: 'Resumen', icon: Radar },
    { key: 'growth', label: 'Crecimiento', icon: TrendingUp },
    { key: 'finance', label: 'Finanzas', icon: Wallet },
    { key: 'operations', label: 'Operación', icon: Activity },
    { key: 'jarvis', label: 'JARVIS', icon: Bot, badge: alerts },
  ];

  return (
    <div className="mb-6 rounded-[28px] border border-white/10 bg-white/5 p-3 backdrop-blur-xl shadow-[0_20px_80px_rgba(0,0,0,0.28)]">
      <div className="grid gap-3 md:grid-cols-5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center justify-between rounded-2xl px-4 py-4 text-left transition ${
                active
                  ? 'border border-emerald-400/20 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20'
                  : 'border border-white/10 bg-black/20 hover:bg-white/[0.06]'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-white/10 p-2">
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <div className="text-sm font-bold text-white">{tab.label}</div>
              </div>

              {tab.badge ? (
                <div className="rounded-full bg-red-500/15 px-2.5 py-1 text-xs font-bold text-red-200">
                  {tab.badge}
                </div>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function KpiGrid({ stats, finance, ops }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard icon={<Users className="h-5 w-5" />} label="Usuarios registrados" value={stats.totalUsers} sub={`${pct(stats.totalUsers, GOALS.users).toFixed(1)}% de meta`} />
      <KpiCard icon={<Wrench className="h-5 w-5" />} label="Trabajadores totales" value={stats.totalWorkers} sub={`${pct(stats.totalWorkers, GOALS.workers).toFixed(1)}% de meta`} />
      <KpiCard icon={<UserCheck className="h-5 w-5" />} label="Activos verificados" value={stats.activeWorkers} sub={`${pct(stats.activeWorkers, GOALS.activeWorkers).toFixed(1)}% de meta`} />
      <KpiCard icon={<Briefcase className="h-5 w-5" />} label="Trabajos totales" value={stats.totalJobs} sub={`${pct(stats.totalJobs, GOALS.jobs).toFixed(1)}% de meta`} />
      <KpiCard icon={<CircleDollarSign className="h-5 w-5" />} label="Ingresos" value={gs(finance.totalRevenue)} sub="Facturación acumulada" />
      <KpiCard icon={<TrendingDown className="h-5 w-5" />} label="Gastos" value={gs(finance.totalExpenses)} sub="Gasto administrativo total" />
      <KpiCard icon={<BadgeDollarSign className="h-5 w-5" />} label="Resultado neto" value={gs(finance.netProfit)} sub={finance.netProfit >= 0 ? 'Rentabilidad positiva' : 'Rentabilidad negativa'} />
      <KpiCard icon={<ShieldCheck className="h-5 w-5" />} label="Rating promedio" value={ops.avgRating} sub="Señal de experiencia del usuario" />
    </div>
  );
}

function KpiFinance({ finance }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard icon={<DollarSign className="h-5 w-5" />} label="Facturas pagadas" value={gs(finance.paidInvoices)} sub="Cobrado" />
      <KpiCard icon={<Receipt className="h-5 w-5" />} label="Facturas pendientes" value={gs(finance.pendingInvoices)} sub="Por cobrar" />
      <KpiCard icon={<Wallet className="h-5 w-5" />} label="Gastos pagos" value={gs(finance.paidExpenses)} sub="Ya ejecutados" />
      <KpiCard icon={<Clock3 className="h-5 w-5" />} label="Gastos pendientes" value={gs(finance.pendingExpenses)} sub="Compromisos abiertos" />
    </div>
  );
}

function KpiCard({ icon, label, value, sub }) {
  return (
    <div className="rounded-[26px] border border-white/10 bg-white/[0.05] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between">
        <div className="rounded-2xl border border-white/10 bg-white/10 p-3">{icon}</div>
        <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(16,185,129,0.8)]" />
      </div>
      <div className="text-sm text-white/55">{label}</div>
      <div className="mt-2 text-3xl font-black tracking-tight text-white">{value}</div>
      <div className="mt-1 text-xs text-white/40">{sub}</div>
    </div>
  );
}

function ChartCard({ title, icon, children }) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl">
      <div className="mb-4 flex items-center gap-2 text-sm font-bold text-white/85">
        {icon}
        <span>{title}</span>
      </div>
      {children}
    </div>
  );
}

function ExecutiveAlerts({ alerts }) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl">
      <div className="mb-4 flex items-center gap-2 text-sm font-bold text-white/85">
        <Siren className="h-4 w-4" />
        Centro de alertas estratégicas
      </div>

      <div className="space-y-3">
        {alerts.length ? (
          alerts.map((a, idx) => (
            <div
              key={`${a.title}-${idx}`}
              className={`rounded-2xl border p-4 ${
                a.level === 'high'
                  ? 'border-red-400/20 bg-red-500/10'
                  : a.level === 'medium'
                  ? 'border-amber-400/20 bg-amber-500/10'
                  : 'border-emerald-400/20 bg-emerald-500/10'
              }`}
            >
              <div className="font-bold text-white">{a.title}</div>
              <div className="mt-1 text-sm text-white/70">{a.detail}</div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/45">
            No hay alertas críticas por ahora.
          </div>
        )}
      </div>
    </div>
  );
}

function FinanceForms({
  expenseForm,
  setExpenseForm,
  invoiceForm,
  setInvoiceForm,
  onCreateExpense,
  onCreateInvoice,
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl">
        <div className="mb-4 flex items-center gap-2 text-sm font-bold text-white/85">
          <FilePlus2 className="h-4 w-4" />
          Registrar gasto
        </div>

        <div className="grid gap-3">
          <InputDark
            placeholder="Concepto del gasto"
            value={expenseForm.concept}
            onChange={(v) => setExpenseForm((s) => ({ ...s, concept: v }))}
          />
          <div className="grid gap-3 md:grid-cols-2">
            <SelectDark
              value={expenseForm.category}
              onChange={(v) => setExpenseForm((s) => ({ ...s, category: v }))}
              options={EXPENSE_CATEGORIES}
            />
            <InputDark
              placeholder="Proveedor"
              value={expenseForm.vendor}
              onChange={(v) => setExpenseForm((s) => ({ ...s, vendor: v }))}
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <InputDark
              type="number"
              placeholder="Monto"
              value={expenseForm.amount}
              onChange={(v) => setExpenseForm((s) => ({ ...s, amount: v }))}
            />
            <InputDark
              placeholder="Número de factura"
              value={expenseForm.invoice_number}
              onChange={(v) => setExpenseForm((s) => ({ ...s, invoice_number: v }))}
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <InputDark
              type="date"
              value={expenseForm.issued_at}
              onChange={(v) => setExpenseForm((s) => ({ ...s, issued_at: v }))}
            />
            <SelectDark
              value={expenseForm.status}
              onChange={(v) => setExpenseForm((s) => ({ ...s, status: v }))}
              options={EXPENSE_STATUSES}
            />
          </div>
          <TextareaDark
            placeholder="Notas"
            value={expenseForm.notes}
            onChange={(v) => setExpenseForm((s) => ({ ...s, notes: v }))}
          />

          <button
            onClick={onCreateExpense}
            className="rounded-2xl bg-red-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-600"
          >
            Guardar gasto
          </button>
        </div>
      </div>

      <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl">
        <div className="mb-4 flex items-center gap-2 text-sm font-bold text-white/85">
          <Receipt className="h-4 w-4" />
          Registrar factura emitida
        </div>

        <div className="grid gap-3">
          <InputDark
            placeholder="Cliente"
            value={invoiceForm.customer_name}
            onChange={(v) => setInvoiceForm((s) => ({ ...s, customer_name: v }))}
          />
          <InputDark
            placeholder="Descripción"
            value={invoiceForm.description}
            onChange={(v) => setInvoiceForm((s) => ({ ...s, description: v }))}
          />
          <div className="grid gap-3 md:grid-cols-2">
            <InputDark
              type="number"
              placeholder="Monto"
              value={invoiceForm.amount}
              onChange={(v) => setInvoiceForm((s) => ({ ...s, amount: v }))}
            />
            <InputDark
              placeholder="Número de factura"
              value={invoiceForm.invoice_number}
              onChange={(v) => setInvoiceForm((s) => ({ ...s, invoice_number: v }))}
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <InputDark
              type="date"
              value={invoiceForm.issued_at}
              onChange={(v) => setInvoiceForm((s) => ({ ...s, issued_at: v }))}
            />
            <InputDark
              type="date"
              value={invoiceForm.due_at}
              onChange={(v) => setInvoiceForm((s) => ({ ...s, due_at: v }))}
            />
          </div>
          <SelectDark
            value={invoiceForm.status}
            onChange={(v) => setInvoiceForm((s) => ({ ...s, status: v }))}
            options={INVOICE_STATUSES}
          />
          <TextareaDark
            placeholder="Notas"
            value={invoiceForm.notes}
            onChange={(v) => setInvoiceForm((s) => ({ ...s, notes: v }))}
          />

          <button
            onClick={onCreateInvoice}
            className="rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-600"
          >
            Guardar factura emitida
          </button>
        </div>
      </div>
    </div>
  );
}

function FinancialList({ title, icon, rows, renderRow, empty }) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl">
      <div className="mb-4 flex items-center gap-2 text-sm font-bold text-white/85">
        {icon}
        <span>{title}</span>
      </div>

      <div className="space-y-3">
        {rows?.length ? (
          rows.map((row) => (
            <div key={row.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
              {renderRow(row)}
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-white/45">
            {empty}
          </div>
        )}
      </div>
    </div>
  );
}

function InsightCard({ title, color, goal, data, money = false }) {
  if (!data) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/45">
        {title}: esperando datos...
      </div>
    );
  }

  const cagrPct = data.cagr != null ? `${(data.cagr * 100).toFixed(1)}%` : '—';
  const probPct = `${Math.round((data.probToGoal ?? 0) * 100)}%`;

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
        <div className="font-bold text-white">{title}</div>
      </div>
      <div className="space-y-1 text-sm text-white/65">
        <div>
          Actual: <b className="text-white">{money ? gs(data.current) : Number(data.current || 0).toLocaleString()}</b>
        </div>
        <div>
          Mitad del rango: <b className="text-white">{money ? gs(data.previous) : Number(data.previous || 0).toLocaleString()}</b>
        </div>
        <div>
          CAGR anualizado: <b className="text-white">{cagrPct}</b>
        </div>
        <div>
          Tendencia diaria: <b className="text-white">{(data.slopePerDay ?? 0).toFixed(2)}</b>
        </div>
        <div>
          Probabilidad de meta: <b className="text-white">{probPct}</b>
        </div>
        {data.forecast30 != null ? (
          <div className="pt-1 text-xs text-white/40">
            Proyección a 30 días: <b className="text-white/70">{money ? gs(Math.round(data.forecast30)) : Math.round(data.forecast30).toLocaleString()}</b> · Meta {money ? gs(goal) : goal.toLocaleString()}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function OpsCard({ icon, label, value }) {
  return (
    <div className="rounded-[26px] border border-white/10 bg-white/[0.05] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl">
      <div className="mb-4 rounded-2xl border border-white/10 bg-white/10 p-3 w-fit">{icon}</div>
      <div className="text-sm text-white/55">{label}</div>
      <div className="mt-2 text-3xl font-black text-white">{value}</div>
    </div>
  );
}

function MiniProgress({ label, value, total, colorClass }) {
  const width = Math.max(0, Math.min(100, pct(value, total)));
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm text-white/65">
        <span>{label}</span>
        <span>{Number(value || 0).toLocaleString()}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function GlassStat({ label, value }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
      <div className="text-sm text-white/55">{label}</div>
      <div className="mt-2 text-3xl font-black text-white">{Number(value || 0).toLocaleString()}</div>
    </div>
  );
}

function MiniKeyLine({ icon, label }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/75">
      <div className="text-emerald-300">{icon}</div>
      <span>{label}</span>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/5 py-20 text-center backdrop-blur-xl">
      <Loader2 className="mx-auto mb-3 h-7 w-7 animate-spin text-emerald-300" />
      <p className="text-sm text-white/60">Construyendo radiografía administrativa...</p>
    </div>
  );
}

function InputDark({ value, onChange, placeholder, type = 'text' }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none placeholder:text-white/30 focus:border-emerald-400/40"
    />
  );
}

function TextareaDark({ value, onChange, placeholder }) {
  return (
    <textarea
      rows={3}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-emerald-400/40"
    />
  );
}

function SelectDark({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none focus:border-emerald-400/40"
    >
      {options.map((opt) => (
        <option key={opt} value={opt} className="bg-slate-900 text-white">
          {opt}
        </option>
      ))}
    </select>
  );
}

function Modal({ children, onClose }) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="relative w-[92%] max-w-lg rounded-[30px] border border-white/10 bg-[#07131D] p-8 shadow-2xl"
        initial={{ scale: 0.94, y: 18 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.94, y: 18 }}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-white/60 transition hover:text-white"
        >
          <XCircle size={24} />
        </button>
        {children}
      </motion.div>
    </motion.div>
  );
}

/* =========================
   JARVIS COPILOT
========================= */
function JarvisCopilot({ stats, finance, ops, insights, healthScore, alerts }) {
  const [open, setOpen] = useState(true);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    const intro = buildExecutiveBrief({ stats, finance, ops, insights, healthScore, alerts });
    setMessages([
      {
        from: 'jarvis',
        text: `JARVIS MANOSYA ONLINE.\n\n${intro}\n\nPodés preguntarme por:\n- finanzas\n- salud del negocio\n- riesgos\n- proyección\n- usuarios\n- trabajadores\n- trabajos\n- rentabilidad`,
      },
    ]);
  }, [stats, finance, ops, insights, healthScore, alerts]);

  function pushJarvis(text, delay = 900) {
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMessages((m) => [...m, { from: 'jarvis', text }]);
    }, delay);
  }

  function ask() {
    const q = input.trim().toLowerCase();
    if (!q) return;

    setMessages((m) => [...m, { from: 'user', text: input }]);
    setInput('');

    if (q.includes('finanza') || q.includes('gasto') || q.includes('ingreso')) {
      pushJarvis(
        `MÓDULO FINANCIERO:\n\nIngresos registrados: ${gs(finance.totalRevenue)}\nGastos registrados: ${gs(finance.totalExpenses)}\nResultado neto: ${gs(finance.netProfit)}\nFacturas pagadas: ${gs(finance.paidInvoices)}\nFacturas pendientes: ${gs(finance.pendingInvoices)}\n\nLectura: ${
          finance.netProfit >= 0
            ? 'la operación mantiene rentabilidad positiva.'
            : 'la operación está consumiendo más de lo que factura.'
        }`
      );
      return;
    }

    if (q.includes('salud') || q.includes('negocio')) {
      pushJarvis(
        `SALUD DEL NEGOCIO:\n\nScore global: ${healthScore}/100.\nUsuarios: ${stats.totalUsers}\nTrabajadores: ${stats.totalWorkers}\nActivos: ${stats.activeWorkers}\nTrabajos: ${stats.totalJobs}\n\nDiagnóstico: ${
          healthScore >= 80
            ? 'núcleo fuerte y escalable.'
            : healthScore >= 60
            ? 'base sólida con áreas a optimizar.'
            : 'estructura todavía frágil; conviene reforzar control y demanda.'
        }`
      );
      return;
    }

    if (q.includes('riesgo') || q.includes('alerta')) {
      if (!alerts.length) {
        pushJarvis('No detecto alertas críticas en este momento.');
        return;
      }

      pushJarvis(
        `CENTRO DE ALERTAS:\n\n${alerts
          .map((a, i) => `${i + 1}. ${a.title} — ${a.detail}`)
          .join('\n\n')}`
      );
      return;
    }

    if (q.includes('proye') || q.includes('futuro')) {
      pushJarvis(
        `PROYECCIÓN:\n\nUsuarios → ${insights.users?.forecast30 ? Math.round(insights.users.forecast30).toLocaleString() : 'sin datos'} en 30 días.\nTrabajadores → ${insights.workers?.forecast30 ? Math.round(insights.workers.forecast30).toLocaleString() : 'sin datos'}.\nTrabajos → ${insights.jobs?.forecast30 ? Math.round(insights.jobs.forecast30).toLocaleString() : 'sin datos'}.\nIngresos → ${insights.revenue?.forecast30 ? gs(Math.round(insights.revenue.forecast30)) : 'sin datos'}.\n\nLectura: la tendencia actual sirve como brújula, no como promesa absoluta.`
      );
      return;
    }

    if (q.includes('usuario')) {
      pushJarvis(
        `USUARIOS:\n\nTotal registrados: ${stats.totalUsers}\nMeta: ${GOALS.users.toLocaleString()}\nAvance: ${pct(stats.totalUsers, GOALS.users).toFixed(1)}%`
      );
      return;
    }

    if (q.includes('trabajador')) {
      pushJarvis(
        `TRABAJADORES:\n\nTotales: ${stats.totalWorkers}\nVerificados: ${stats.verifiedWorkers}\nActivos: ${stats.activeWorkers}\nCon documentos: ${ops.workersWithDocs}\nSin documentos: ${ops.workersWithoutDocs}`
      );
      return;
    }

    if (q.includes('trabajo')) {
      pushJarvis(
        `TRABAJOS:\n\nTotales: ${stats.totalJobs}\nCompletados: ${ops.jobsCompleted}\nAbiertos: ${ops.jobsOpen}\nAceptados: ${ops.jobsAccepted}\nCancelados: ${ops.jobsCancelled}`
      );
      return;
    }

    if (q.includes('rentabilidad') || q.includes('ganancia')) {
      pushJarvis(
        `RENTABILIDAD:\n\nIngresos: ${gs(finance.totalRevenue)}\nGastos: ${gs(finance.totalExpenses)}\nGanancia neta: ${gs(finance.netProfit)}\nTicket promedio: ${gs(finance.avgTicket)}\n\nConclusión: ${
          finance.netProfit > 0
            ? 'hay margen positivo registrado.'
            : 'todavía no se consolidó una rentabilidad sana.'
        }`
      );
      return;
    }

    pushJarvis(
      'Comando no reconocido con precisión. Probá con: finanzas, salud, riesgos, proyección, usuarios, trabajadores, trabajos o rentabilidad.'
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.8fr_1.2fr]">
      <div className="rounded-[28px] border border-white/10 bg-gradient-to-br from-cyan-500/15 via-emerald-500/10 to-slate-900 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
            <Bot className="h-5 w-5 text-cyan-300" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.24em] text-cyan-300/80">AI Copilot</div>
            <h3 className="text-2xl font-black text-white">JARVIS · ManosYA</h3>
          </div>
        </div>

        <div className="space-y-3">
          <FeatureLine icon={<Target className="h-4 w-4" />} text="Resumen ejecutivo automático" />
          <FeatureLine icon={<Wallet className="h-4 w-4" />} text="Lectura financiera en tiempo real" />
          <FeatureLine icon={<TriangleAlert className="h-4 w-4" />} text="Alertas de riesgos y cuellos de botella" />
          <FeatureLine icon={<TrendingUp className="h-4 w-4" />} text="Proyecciones de crecimiento y negocio" />
        </div>
      </div>

      <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-0 shadow-[0_18px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-cyan-500/20 to-emerald-500/10 px-5 py-4">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: [0, 6, 0, -6, 0] }}
              transition={{ repeat: Infinity, duration: 4 }}
              className="text-2xl"
            >
              🤖
            </motion.div>
            <div>
              <div className="text-xs uppercase tracking-[0.24em] text-cyan-300/80">System Intelligence</div>
              <div className="text-lg font-black text-white">JARVIS Console</div>
            </div>
          </div>

          <button
            onClick={() => setOpen((v) => !v)}
            className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-bold text-white"
          >
            {open ? 'Minimizar' : 'Expandir'}
          </button>
        </div>

        {open && (
          <>
            <div className="h-[420px] overflow-y-auto bg-black/20 p-4">
              <div className="space-y-3">
                {messages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`max-w-[88%] whitespace-pre-line rounded-2xl px-4 py-3 text-sm ${
                      m.from === 'jarvis'
                        ? 'bg-cyan-500/10 text-white border border-cyan-400/10'
                        : 'ml-auto bg-emerald-500 text-white'
                    }`}
                  >
                    {m.text}
                  </div>
                ))}

                {typing && (
                  <div className="rounded-2xl border border-cyan-400/10 bg-cyan-500/10 px-4 py-3 text-sm text-white/70">
                    JARVIS procesando...
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 border-t border-white/10 bg-black/20 p-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && ask()}
                placeholder="Preguntá por finanzas, salud, riesgos, proyección..."
                className="h-12 flex-1 rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none placeholder:text-white/30 focus:border-cyan-400/40"
              />
              <button
                onClick={ask}
                className="rounded-2xl bg-cyan-500 p-3 text-white transition hover:bg-cyan-600"
              >
                <SendHorizontal size={18} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function FeatureLine({ icon, text }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/75">
      <div className="text-cyan-300">{icon}</div>
      <span>{text}</span>
    </div>
  );
}

function buildExecutiveBrief({ stats, finance, ops, insights, healthScore, alerts }) {
  const growth = insights.users?.cagr ? `${(insights.users.cagr * 100).toFixed(1)}%` : 'sin datos';
  return `Estado general ${healthScore}/100.
Usuarios: ${stats.totalUsers}.
Trabajadores: ${stats.totalWorkers}.
Activos: ${stats.activeWorkers}.
Trabajos: ${stats.totalJobs}.
Ingresos: ${gs(finance.totalRevenue)}.
Resultado neto: ${gs(finance.netProfit)}.
Documentación incompleta: ${ops.workersWithoutDocs}.
Crecimiento anualizado de usuarios: ${growth}.
Alertas activas: ${alerts.length}.`;
}