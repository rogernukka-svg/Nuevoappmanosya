'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
  Eye,
  MessageCircle,
  Video,
  Image as ImageIcon,
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
const OPERATIONS_LIMIT = 1000;

const EXPENSE_SELECT =
  'id, concept, category, vendor, amount, invoice_number, issued_at, status, notes, created_by, created_at';
const INVOICE_SELECT =
  'id, customer_name, description, amount, invoice_number, issued_at, due_at, status, notes, created_by, created_at';
const JOB_OPERATIONAL_SELECTS = [
  'id, client_id, worker_id, assigned_worker, service_type, title, description, skill_id, status, created_at, accepted_at, completed_at, updated_at',
  'id, client_id, worker_id, assigned_worker, service_type, title, description, skill_id, status, created_at, updated_at',
  'id, client_id, assigned_worker, title, description, skill_id, status, created_at, updated_at',
  'id, client_id, worker_id, status, created_at, updated_at',
  'id, client_id, assigned_worker, status, created_at, updated_at',
];
const PROFILE_SELECT = 'id, full_name, email, avatar_url, role, phone, created_at, updated_at';
const CHAT_SELECTS = [
  'id, job_id, client_id, worker_id, created_at, updated_at',
  'id, job_id, client_id, worker_id, created_at',
  'id, client_id, worker_id, created_at',
];
const MESSAGE_SELECTS = [
  'id, chat_id, sender_id, text, content, created_at',
  'id, chat_id, sender_id, text, created_at',
  'id, chat_id, sender_id, content, created_at',
  'id, chat_id, sender_id, body, created_at',
];
const REVIEW_SELECTS = [
  'id, job_id, worker_id, client_id, rating, comment, created_at',
  'id, worker_id, client_id, rating, comment, created_at',
  'id, worker_id, rating, comment, created_at',
  'id, worker_id, rating, created_at',
];

async function safeRead(table, select = 'id') {
  try {
    const { data, error } = await supabase.from(table).select(select);
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn(`Analytics opcional no disponible (${table}):`, err?.message || err);
    return [];
  }
}

async function safeQuery(table, select, buildQuery) {
  const { data } = await safeQueryResult(table, select, buildQuery);
  return data;
}

async function safeQueryResult(table, select, buildQuery) {
  try {
    const base = supabase.from(table).select(select);
    const query = typeof buildQuery === 'function' ? buildQuery(base) : base;
    const { data, error } = await query;
    if (error) throw error;
    return { data: data || [], error: null };
  } catch (err) {
    console.warn(`Analytics opcional no disponible (${table}):`, err?.message || err);
    return { data: [], error: err };
  }
}

async function readOperationalJobs() {
  for (const select of JOB_OPERATIONAL_SELECTS) {
    const { data, error } = await safeQueryResult('jobs', select, (query) =>
      query.order('created_at', { ascending: false }).limit(OPERATIONS_LIMIT)
    );

    if (!error) return data;
  }

  return [];
}

async function readOperationalReviews() {
  for (const select of REVIEW_SELECTS) {
    const { data, error } = await safeQueryResult('reviews', select, (query) =>
      query.order('created_at', { ascending: false }).limit(1000)
    );

    if (!error) return data;
  }

  return [];
}

async function readOperationalChats() {
  for (const select of CHAT_SELECTS) {
    const { data, error } = await safeQueryResult('chats', select, (query) =>
      query.order('created_at', { ascending: false }).limit(1000)
    );

    if (!error) return data;
  }

  return [];
}

async function readOperationalMessages(chatIds) {
  if (!chatIds?.length) return [];

  for (const select of MESSAGE_SELECTS) {
    const { data, error } = await safeQueryResult('messages', select, (query) =>
      query.in('chat_id', chatIds).order('created_at', { ascending: false }).limit(2500)
    );

    if (!error) return data;
  }

  return [];
}

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

function formatShortId(id) {
  return String(id || '').slice(0, 8) || 'sin-id';
}

function formatDateTime(value) {
  if (!value) return 'Sin dato';
  try {
    return new Date(value).toLocaleString('es-PY', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Sin dato';
  }
}

function minutesBetween(start, end) {
  if (!start || !end) return null;
  const a = new Date(start).getTime();
  const b = new Date(end).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return null;
  return Math.round((b - a) / 60000);
}

function ageMinutes(value) {
  if (!value) return 0;
  return Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000));
}

function formatDuration(minutes) {
  if (minutes == null) return 'Sin dato';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

function isToday(value) {
  if (!value) return false;
  return fmtD(value) === fmtD(new Date());
}

function statusMeta(status) {
  const value = String(status || 'open').toLowerCase();
  if (['completed', 'done'].includes(value)) return { label: 'Completado', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  if (['accepted', 'assigned', 'in_progress', 'scheduled', 'arrived'].includes(value)) return { label: value === 'scheduled' ? 'Agendado' : 'En curso', className: 'bg-cyan-50 text-cyan-700 border-cyan-200' };
  if (['cancelled', 'canceled', 'rejected'].includes(value)) return { label: 'Cancelado', className: 'bg-red-50 text-red-700 border-red-200' };
  return { label: 'Abierto', className: 'bg-amber-50 text-amber-700 border-amber-200' };
}

function profileName(profile, fallback = 'Sin nombre') {
  return profile?.full_name || profile?.email || fallback;
}

function profileMap(rows = []) {
  return (rows || []).reduce((acc, profile) => {
    if (profile?.id) acc[String(profile.id)] = profile;
    return acc;
  }, {});
}

function uniqueValues(values = []) {
  return [...new Set((values || []).filter(Boolean).map((item) => String(item)))];
}

function average(values = []) {
  const clean = (values || []).map(Number).filter((n) => Number.isFinite(n));
  if (!clean.length) return null;
  return clean.reduce((sum, n) => sum + n, 0) / clean.length;
}

function firstByCreated(rows = []) {
  return [...rows].sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0))[0] || null;
}

function lastByCreated(rows = []) {
  return [...rows].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))[0] || null;
}

function buildOperationalSnapshot({
  jobs = [],
  profiles = [],
  chats = [],
  messages = [],
  reviews = [],
  workerPosts = [],
  workerComments = [],
  workerLikes = [],
  friendships = [],
  supplierProfiles = [],
  supplierProducts = [],
  supplierContacts = [],
  pageViews = [],
  docs = [],
}) {
  const profilesById = profileMap(profiles);
  const chatsByJob = {};
  const chatsById = {};
  const messagesByChat = {};
  const reviewsByJob = {};
  const reviewsByWorkerClient = {};

  for (const chat of chats || []) {
    if (chat?.id) chatsById[String(chat.id)] = chat;
    if (chat?.job_id) {
      if (!chatsByJob[String(chat.job_id)]) chatsByJob[String(chat.job_id)] = [];
      chatsByJob[String(chat.job_id)].push(chat);
    }
  }

  for (const message of messages || []) {
    if (!message?.chat_id) continue;
    const key = String(message.chat_id);
    if (!messagesByChat[key]) messagesByChat[key] = [];
    messagesByChat[key].push(message);
  }

  for (const review of reviews || []) {
    if (review?.job_id) reviewsByJob[String(review.job_id)] = review;
    if (review?.worker_id || review?.client_id) {
      reviewsByWorkerClient[`${review.worker_id || ''}:${review.client_id || ''}`] = review;
    }
  }

  const rows = (jobs || []).map((job) => {
    const clientId = job.client_id || job.clientId || null;
    const workerId = job.worker_id || job.assigned_worker || job.assignedWorker || null;
    const jobChats = chatsByJob[String(job.id)] || chats.filter((chat) => {
      return String(chat.client_id || '') === String(clientId || '') &&
        String(chat.worker_id || '') === String(workerId || '');
    });
    const chat = lastByCreated(jobChats);
    const chatMessages = chat?.id ? messagesByChat[String(chat.id)] || [] : [];
    const workerMessages = chatMessages.filter((message) => String(message.sender_id || '') === String(workerId || ''));
    const clientMessages = chatMessages.filter((message) => String(message.sender_id || '') === String(clientId || ''));
    const firstWorkerMessage = firstByCreated(workerMessages);
    const lastMessage = lastByCreated(chatMessages);
    const review =
      reviewsByJob[String(job.id)] ||
      reviewsByWorkerClient[`${workerId || ''}:${clientId || ''}`] ||
      null;
    const acceptedAt =
      job.accepted_at ||
      (['accepted', 'assigned', 'scheduled', 'in_progress', 'completed'].includes(String(job.status || '').toLowerCase())
        ? job.updated_at
        : null);
    const completedAt =
      job.completed_at ||
      (['completed', 'done'].includes(String(job.status || '').toLowerCase()) ? job.updated_at : null);
    const responseMinutes =
      minutesBetween(job.created_at, acceptedAt) ??
      minutesBetween(job.created_at, firstWorkerMessage?.created_at);

    return {
      ...job,
      client_id: clientId,
      worker_id: workerId,
      shortId: formatShortId(job.id),
      service: job.service_type || job.title || job.skill_id || job.description || 'Servicio general',
      client: profilesById[String(clientId || '')] || null,
      worker: profilesById[String(workerId || '')] || null,
      clientName: profileName(profilesById[String(clientId || '')], 'Cliente sin nombre'),
      workerName: workerId ? profileName(profilesById[String(workerId || '')], 'Trabajador sin nombre') : 'Sin trabajador',
      accepted_at: acceptedAt,
      completed_at: completedAt,
      chatId: chat?.id || null,
      hasChat: !!chat,
      messagesCount: chatMessages.length,
      clientMessagesCount: clientMessages.length,
      workerMessagesCount: workerMessages.length,
      lastMessageAt: lastMessage?.created_at || null,
      lastMessageSenderId: lastMessage?.sender_id || null,
      rating: review?.rating ?? null,
      reviewComment: review?.comment || '',
      reviewAt: review?.created_at || null,
      responseMinutes,
      completionMinutes: minutesBetween(job.created_at, completedAt),
      ageMinutes: ageMinutes(job.created_at),
    };
  });

  const totalJobs = Math.max(rows.length, 1);
  const acceptedRows = rows.filter((job) =>
    ['accepted', 'assigned', 'scheduled', 'in_progress', 'completed', 'done'].includes(String(job.status || '').toLowerCase())
  );
  const cancelledRows = rows.filter((job) =>
    ['cancelled', 'canceled', 'rejected'].includes(String(job.status || '').toLowerCase())
  );
  const completedRows = rows.filter((job) =>
    ['completed', 'done'].includes(String(job.status || '').toLowerCase())
  );
  const openRows = rows.filter((job) => String(job.status || '').toLowerCase() === 'open');
  const chatsWithoutResponse = rows.filter((job) => {
    if (!job.hasChat || !job.worker_id || !job.messagesCount) return false;
    return job.clientMessagesCount > 0 && job.workerMessagesCount === 0;
  });

  const workers = {};
  const clients = {};
  const providers = {};

  for (const row of rows) {
    if (row.worker_id) {
      const key = String(row.worker_id);
      workers[key] ||= {
        id: key,
        name: row.workerName,
        jobs: 0,
        completed: 0,
        cancelled: 0,
        messages: 0,
        ratings: [],
        responseTimes: [],
        posts: 0,
        videos: 0,
        photos: 0,
        lastActivity: row.created_at,
      };
      workers[key].jobs += 1;
      if (['completed', 'done'].includes(String(row.status || '').toLowerCase())) workers[key].completed += 1;
      if (['cancelled', 'canceled', 'rejected'].includes(String(row.status || '').toLowerCase())) workers[key].cancelled += 1;
      workers[key].messages += row.workerMessagesCount;
      if (row.rating != null) workers[key].ratings.push(Number(row.rating));
      if (row.responseMinutes != null) workers[key].responseTimes.push(row.responseMinutes);
      if (new Date(row.updated_at || row.created_at || 0) > new Date(workers[key].lastActivity || 0)) {
        workers[key].lastActivity = row.updated_at || row.created_at;
      }
    }

    if (row.client_id) {
      const key = String(row.client_id);
      clients[key] ||= {
        id: key,
        name: row.clientName,
        requests: 0,
        completed: 0,
        cancelled: 0,
        chats: 0,
        messages: 0,
        reviews: 0,
        lastActivity: row.created_at,
      };
      clients[key].requests += 1;
      if (['completed', 'done'].includes(String(row.status || '').toLowerCase())) clients[key].completed += 1;
      if (['cancelled', 'canceled', 'rejected'].includes(String(row.status || '').toLowerCase())) clients[key].cancelled += 1;
      if (row.hasChat) clients[key].chats += 1;
      clients[key].messages += row.clientMessagesCount;
      if (row.rating != null) clients[key].reviews += 1;
      if (new Date(row.updated_at || row.created_at || 0) > new Date(clients[key].lastActivity || 0)) {
        clients[key].lastActivity = row.updated_at || row.created_at;
      }
    }
  }

  for (const post of workerPosts || []) {
    const key = String(post.worker_id || '');
    if (!key) continue;
    workers[key] ||= {
      id: key,
      name: profileName(profilesById[key], 'Trabajador'),
      jobs: 0,
      completed: 0,
      cancelled: 0,
      messages: 0,
      ratings: [],
      responseTimes: [],
      posts: 0,
      videos: 0,
      photos: 0,
      lastActivity: post.created_at,
    };
    workers[key].posts += 1;
    if (post.media_type === 'video') workers[key].videos += 1;
    else workers[key].photos += 1;
  }

  for (const message of messages || []) {
    const profile = profilesById[String(message.sender_id || '')];
    if (profile?.role === 'client') {
      clients[profile.id] ||= {
        id: profile.id,
        name: profileName(profile, 'Cliente'),
        requests: 0,
        completed: 0,
        cancelled: 0,
        chats: 0,
        messages: 0,
        reviews: 0,
        lastActivity: message.created_at,
      };
      clients[profile.id].messages += 1;
    }
  }

  for (const contact of supplierContacts || []) {
    const key = String(contact.supplier_id || '');
    if (!key) continue;
    providers[key] ||= {
      id: key,
      name: profileName(profilesById[key], 'Proveedor'),
      contacts: 0,
      products: 0,
      visits: 0,
      ctaClicks: 0,
      lastActivity: contact.created_at,
    };
    providers[key].contacts += 1;
    providers[key].ctaClicks += 1;
    if (new Date(contact.created_at || 0) > new Date(providers[key].lastActivity || 0)) {
      providers[key].lastActivity = contact.created_at;
    }
  }

  for (const product of supplierProducts || []) {
    const key = String(product.supplier_id || '');
    if (!key) continue;
    providers[key] ||= {
      id: key,
      name: profileName(profilesById[key], product.supplier_name || 'Proveedor'),
      contacts: 0,
      products: 0,
      visits: 0,
      ctaClicks: 0,
      lastActivity: product.created_at,
    };
    providers[key].products += 1;
  }

  for (const supplier of supplierProfiles || []) {
    const key = String(supplier.user_id || '');
    if (!key) continue;
    providers[key] ||= {
      id: key,
      name: supplier.store_name || profileName(profilesById[key], 'Proveedor'),
      contacts: 0,
      products: 0,
      visits: 0,
      ctaClicks: 0,
      lastActivity: supplier.updated_at,
    };
    providers[key].name = supplier.store_name || providers[key].name;
  }

  for (const view of pageViews || []) {
    const path = String(view.path || view.pathname || view.route || view.page || '').toLowerCase();
    const match = path.match(/supplier\/([^/?#]+)/) || path.match(/provider\/([^/?#]+)/);
    if (!match?.[1]) continue;
    const key = match[1];
    providers[key] ||= {
      id: key,
      name: profileName(profilesById[key], 'Proveedor'),
      contacts: 0,
      products: 0,
      visits: 0,
      ctaClicks: 0,
      lastActivity: view.created_at,
    };
    providers[key].visits += 1;
  }

  const docsByUser = new Set((docs || []).map((item) => String(item.user_id || '')).filter(Boolean));
  const incompleteProfiles = (profiles || []).filter((profile) => {
    if (!['client', 'worker', 'supplier'].includes(profile?.role)) return false;
    return !profile.full_name || !profile.avatar_url || (profile.role === 'worker' && !docsByUser.has(String(profile.id)));
  });

  const topWorkers = Object.values(workers)
    .map((worker) => {
      const avgRating = average(worker.ratings);
      const avgResponse = average(worker.responseTimes);
      const cancelRate = worker.jobs ? worker.cancelled / worker.jobs : 0;
      return {
        ...worker,
        avgRating,
        avgResponse,
        cancelRate,
        score:
          worker.completed * 5 +
          worker.messages * 0.4 +
          worker.posts * 1.5 +
          (avgRating || 0) * 8 -
          worker.cancelled * 4,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  const topClients = Object.values(clients)
    .map((client) => ({
      ...client,
      score: client.requests * 4 + client.chats * 2 + client.reviews * 3 + client.messages * 0.2 - client.cancelled * 3,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  const topProviders = Object.values(providers)
    .map((provider) => ({
      ...provider,
      score: provider.contacts * 5 + provider.products * 2 + provider.visits + provider.ctaClicks * 3,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  const activeWorkersToday = uniqueValues([
    ...rows.filter((row) => row.worker_id && (isToday(row.updated_at) || isToday(row.accepted_at) || isToday(row.completed_at))).map((row) => row.worker_id),
    ...messages.filter((message) => profilesById[String(message.sender_id || '')]?.role === 'worker' && isToday(message.created_at)).map((message) => message.sender_id),
    ...workerPosts.filter((post) => isToday(post.created_at)).map((post) => post.worker_id),
  ]).length;

  const activeClientsToday = uniqueValues([
    ...rows.filter((row) => row.client_id && isToday(row.created_at)).map((row) => row.client_id),
    ...messages.filter((message) => profilesById[String(message.sender_id || '')]?.role === 'client' && isToday(message.created_at)).map((message) => message.sender_id),
    ...workerComments.filter((comment) => isToday(comment.created_at)).map((comment) => comment.client_id),
    ...supplierContacts.filter((contact) => isToday(contact.created_at)).map((contact) => contact.requester_id),
  ]).length;

  const alerts = [];
  const oldOpenJobs = openRows.filter((job) => job.ageMinutes > 120);
  if (oldOpenJobs.length) {
    alerts.push({
      level: 'high',
      title: 'Trabajos abiertos sin respuesta',
      detail: `${oldOpenJobs.length} solicitudes llevan más de 2 horas abiertas.`,
    });
  }
  const riskyWorkers = topWorkers.filter((worker) => worker.cancelled >= 2 && worker.cancelRate >= 0.3);
  if (riskyWorkers.length) {
    alerts.push({
      level: 'medium',
      title: 'Trabajadores con cancelaciones altas',
      detail: `${riskyWorkers.length} perfiles necesitan revisión operativa.`,
    });
  }
  if (chatsWithoutResponse.length) {
    alerts.push({
      level: 'medium',
      title: 'Chats sin respuesta del trabajador',
      detail: `${chatsWithoutResponse.length} conversaciones tienen mensajes de cliente sin respuesta.`,
    });
  }
  const riskyClients = topClients.filter((client) => client.cancelled >= 2);
  if (riskyClients.length) {
    alerts.push({
      level: 'medium',
      title: 'Clientes con cancelaciones repetidas',
      detail: `${riskyClients.length} clientes cancelaron varias solicitudes recientes.`,
    });
  }
  const inactiveProviders = topProviders.filter((provider) => provider.products === 0 && provider.contacts === 0);
  if (inactiveProviders.length) {
    alerts.push({
      level: 'low',
      title: 'Proveedores sin actividad visible',
      detail: `${inactiveProviders.length} proveedores necesitan catálogo o contacto activo.`,
    });
  }
  if (incompleteProfiles.length) {
    alerts.push({
      level: 'low',
      title: 'Perfiles incompletos',
      detail: `${incompleteProfiles.length} usuarios tienen datos clave incompletos.`,
    });
  }

  return {
    jobs: rows,
    metrics: {
      acceptanceRate: (acceptedRows.length / totalJobs) * 100,
      cancellationRate: (cancelledRows.length / totalJobs) * 100,
      completionRate: (completedRows.length / totalJobs) * 100,
      avgResponseMinutes: average(rows.map((job) => job.responseMinutes)) || 0,
      avgCompletionMinutes: average(rows.map((job) => job.completionMinutes)) || 0,
      openNoResponse: oldOpenJobs.length,
      chatsNoResponse: chatsWithoutResponse.length,
      activeWorkersToday,
      activeClientsToday,
    },
    topWorkers,
    topClients,
    topProviders,
    alerts,
    social: {
      comments: workerComments.length,
      likes: workerLikes.length,
      followers: friendships.length,
    },
  };
}

/* =========================
   PAGE
========================= */
export default function AdminAnalyticsPage() {
  const fetchingAllRef = useRef(false);
  const queuedFetchAllRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState(30);
  const [activeTab, setActiveTab] = useState('overview');
  const [accessChecked, setAccessChecked] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
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

  const [control, setControl] = useState({
    founderViews: 0,
    totalPageViews: 0,
    appViews: 0,
    posts: 0,
    videos: 0,
    photos: 0,
    chats: 0,
    messages: 0,
    trackerReady: false,
  });

  const [operational, setOperational] = useState({
    jobs: [],
    metrics: {
      acceptanceRate: 0,
      cancellationRate: 0,
      completionRate: 0,
      avgResponseMinutes: 0,
      avgCompletionMinutes: 0,
      openNoResponse: 0,
      chatsNoResponse: 0,
      activeWorkersToday: 0,
      activeClientsToday: 0,
    },
    topWorkers: [],
    topClients: [],
    topProviders: [],
    alerts: [],
    social: {
      comments: 0,
      likes: 0,
      followers: 0,
    },
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
 async function checkAdminAccess() {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error('Tenés que iniciar sesión');
      window.location.href = '/auth/login';
      return false;
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role, admin_role, email, full_name')
      .eq('id', user.id)
      .maybeSingle();

    if (error) throw error;

    if (!profile) {
      toast.error('Perfil no encontrado');
      window.location.href = '/';
      return false;
    }

    const allowed = ['admin', 'superadmin'].includes(profile?.admin_role || '');

    if (!allowed) {
      toast.error('No tenés permiso para entrar a este panel');
      window.location.href = '/';
      return false;
    }

    setHasAccess(true);
    return true;
  } catch (err) {
    console.error(err);
    toast.error('No se pudo validar el acceso');
    window.location.href = '/';
    return false;
  } finally {
    setAccessChecked(true);
  }
}
  useEffect(() => {
    let alive = true;
    let channel = null;
    let refreshTimer = null;

    const scheduleFetchAll = () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        if (alive) fetchAll();
      }, 650);
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) scheduleFetchAll();
    };

    (async () => {
      const allowed = await checkAdminAccess();
      if (!alive || !allowed) return;

      await fetchAll();

      channel = supabase
        .channel('manosya-admin-analytics-jarvis')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, scheduleFetchAll)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'worker_profiles' }, scheduleFetchAll)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, scheduleFetchAll)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'documents' }, scheduleFetchAll)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'worker_posts' }, scheduleFetchAll)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'worker_comments' }, scheduleFetchAll)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'worker_likes' }, scheduleFetchAll)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'user_friendships' }, scheduleFetchAll)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'supplier_contacts' }, scheduleFetchAll)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'supplier_products' }, scheduleFetchAll)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, scheduleFetchAll)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, scheduleFetchAll)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, scheduleFetchAll)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'page_views' }, scheduleFetchAll)
        .on('postgres_changes', { event: '*', schema: 'public', table: ADMIN_EXPENSES_TABLE }, scheduleFetchAll)
        .on('postgres_changes', { event: '*', schema: 'public', table: ADMIN_INVOICES_TABLE }, scheduleFetchAll)
        .subscribe();

      document.addEventListener('visibilitychange', handleVisibilityChange);
    })();

    return () => {
      alive = false;
      if (refreshTimer) clearTimeout(refreshTimer);
      if (channel) supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

    useEffect(() => {
    if (!hasAccess) return;
    fetchRange(range);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, hasAccess]);

  async function fetchAll() {
    if (fetchingAllRef.current) {
      queuedFetchAllRef.current = true;
      return;
    }

    fetchingAllRef.current = true;

    try {
      setLoading(true);

      const [
        usersCountRes,
        workersCountRes,
        activeWorkersCountRes,
        verifiedWorkersCountRes,
        jobsCountRes,
        jobsCompletedCountRes,
        jobsCancelledCountRes,
        jobsOpenCountRes,
        jobsAcceptedCountRes,
        docsRes,
        expensesRes,
        invoicesRes,
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('worker_profiles').select('user_id', { count: 'exact', head: true }),
        supabase
          .from('admin_workers_view')
          .select('user_id', { count: 'exact', head: true })
          .eq('is_active', true)
          .eq('worker_verified', true),
        supabase
          .from('admin_workers_view')
          .select('user_id', { count: 'exact', head: true })
          .eq('worker_verified', true),
        supabase.from('jobs').select('id', { count: 'exact', head: true }),
        supabase.from('jobs').select('id', { count: 'exact', head: true }).in('status', ['completed', 'done']),
        supabase.from('jobs').select('id', { count: 'exact', head: true }).in('status', ['cancelled', 'canceled', 'rejected']),
        supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('jobs').select('id', { count: 'exact', head: true }).in('status', ['accepted', 'assigned', 'scheduled', 'in_progress']),
        supabase.from('documents').select('user_id, doc_type, created_at'),
        supabase.from(ADMIN_EXPENSES_TABLE).select(EXPENSE_SELECT).order('issued_at', { ascending: false }),
        supabase.from(ADMIN_INVOICES_TABLE).select(INVOICE_SELECT).order('issued_at', { ascending: false }),
      ]);

      const docs = docsRes.data || [];
      const expenses = expensesRes.data || [];
      const invoices = invoicesRes.data || [];

      const jobsCompleted = jobsCompletedCountRes.count || 0;
      const jobsCancelled = jobsCancelledCountRes.count || 0;
      const jobsOpen = jobsOpenCountRes.count || 0;
      const jobsAccepted = jobsAcceptedCountRes.count || 0;

      const operationalJobs = await readOperationalJobs();
      const participantIds = uniqueValues([
        ...operationalJobs.map((job) => job.client_id),
        ...operationalJobs.map((job) => job.worker_id),
        ...operationalJobs.map((job) => job.assigned_worker),
      ]);

      const [
        pageViews,
        workerPosts,
        chats,
        supplierProducts,
        supplierContacts,
        supplierProfiles,
        workerComments,
        workerLikes,
        friendships,
        operationalReviews,
      ] = await Promise.all([
        safeQuery('page_views', 'path, pathname, route, page, created_at', (query) =>
          query.order('created_at', { ascending: false }).limit(900)
        ),
        safeQuery('worker_posts', 'id, worker_id, media_type, created_at', (query) =>
          query.order('created_at', { ascending: false }).limit(900)
        ),
        readOperationalChats(),
        safeQuery('supplier_products', 'id, supplier_id, supplier_name, title, service_slug, is_active, created_at', (query) =>
          query.order('created_at', { ascending: false }).limit(600)
        ),
        safeQuery('supplier_contacts', 'id, supplier_id, requester_id, product_id, source_role, status, created_at', (query) =>
          query.order('created_at', { ascending: false }).limit(600)
        ),
        safeQuery('supplier_profiles', 'user_id, store_name, updated_at', (query) =>
          query.order('updated_at', { ascending: false }).limit(400)
        ),
        safeQuery('worker_comments', 'id, worker_id, client_id, created_at', (query) =>
          query.order('created_at', { ascending: false }).limit(700)
        ),
        safeQuery('worker_likes', 'id, worker_id, client_id, created_at', (query) =>
          query.order('created_at', { ascending: false }).limit(700)
        ),
        safeQuery('user_friendships', 'id, requester_id, addressee_id, status, created_at', (query) =>
          query.order('created_at', { ascending: false }).limit(700)
        ),
        readOperationalReviews(),
      ]);

      const supplierIds = uniqueValues([
        ...supplierProducts.map((item) => item.supplier_id),
        ...supplierContacts.map((item) => item.supplier_id),
        ...supplierProfiles.map((item) => item.user_id),
      ]);
      const socialProfileIds = uniqueValues([
        ...workerPosts.map((item) => item.worker_id),
        ...workerComments.map((item) => item.client_id),
        ...workerComments.map((item) => item.worker_id),
        ...workerLikes.map((item) => item.client_id),
        ...workerLikes.map((item) => item.worker_id),
        ...supplierContacts.map((item) => item.requester_id),
      ]);
      const allProfileIds = uniqueValues([...participantIds, ...supplierIds, ...socialProfileIds]);

      const profilesForOps = allProfileIds.length
        ? await safeQuery('profiles', PROFILE_SELECT, (query) => query.in('id', allProfileIds))
        : [];

      const chatIds = uniqueValues(chats.map((chat) => chat.id));
      const messages = await readOperationalMessages(chatIds);

      const operationalSnapshot = buildOperationalSnapshot({
        jobs: operationalJobs,
        profiles: profilesForOps,
        chats,
        messages,
        reviews: operationalReviews,
        workerPosts,
        workerComments,
        workerLikes,
        friendships,
        supplierProfiles,
        supplierProducts,
        supplierContacts,
        pageViews,
        docs,
      });

      setOperational(operationalSnapshot);

      const pathOf = (row) =>
        String(row?.path || row?.pathname || row?.route || row?.page || '').toLowerCase();
      const founderViews = pageViews.filter((row) => {
        const path = pathOf(row);
        return path.includes('/fundador') || path.includes('/founder');
      }).length;
      const appViews = pageViews.filter((row) => {
        const path = pathOf(row);
        return (
          path.includes('/client') ||
          path.includes('/worker') ||
          path.includes('/supplier') ||
          path.includes('/auth')
        );
      }).length;

      setControl({
        founderViews,
        totalPageViews: pageViews.length,
        appViews,
        posts: workerPosts.length,
        videos: workerPosts.filter((post) => post.media_type === 'video').length,
        photos: workerPosts.filter((post) => post.media_type !== 'video').length,
        chats: chats.length,
        messages: messages.length,
        trackerReady: pageViews.length > 0,
      });

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
        totalJobs: jobsCountRes.count || 0,
        verifiedWorkers: verifiedWorkersCountRes.count || 0,
      });

      setOps({
        jobsCompleted,
        jobsCancelled,
        jobsOpen,
        jobsAccepted,
        workersWithDocs,
        workersWithoutDocs,
        avgRating: Number(safeAvg(operationalReviews.map((r) => r.rating)).toFixed(2)),
      });

      setFinance({
        totalRevenue,
        totalExpenses,
        netProfit: totalRevenue - totalExpenses,
        paidInvoices,
        pendingInvoices,
        paidExpenses,
        pendingExpenses,
        avgTicket: jobsCountRes.count ? Math.round(totalRevenue / jobsCountRes.count) : 0,
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
      fetchingAllRef.current = false;
      setLoading(false);

      if (queuedFetchAllRef.current) {
        queuedFetchAllRef.current = false;
        setTimeout(() => fetchAll(), 80);
      }
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

    if (!accessChecked) {
    return (
      <div className="min-h-screen bg-[#06111A] text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto mb-3 h-7 w-7 animate-spin text-emerald-300" />
          <p className="text-sm text-white/60">Validando acceso...</p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#69c4c0] text-[#06182a]">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(255,255,255,0.46),transparent_30%),radial-gradient(circle_at_88%_10%,rgba(255,255,255,0.24),transparent_28%)]" />
        <div className="absolute bottom-[-14%] left-[10%] h-96 w-96 rounded-full bg-[#06182a]/14 blur-3xl" />
        <div className="absolute right-[-8%] top-[28%] h-[460px] w-[460px] rounded-full bg-[#06182a]/16 blur-3xl" />
      </div>

      <main className="relative z-10 mx-auto max-w-7xl px-4 py-6 md:px-6 lg:px-8">
        <TopHeader range={range} setRange={setRange} />

        <ExecutiveHero
          healthScore={healthScore}
          healthUI={healthUI}
          stats={stats}
          finance={finance}
          control={control}
          loading={loading}
        />

        <TabsBar activeTab={activeTab} setActiveTab={setActiveTab} alerts={executiveAlerts.length} />

        {loading ? (
          <LoadingState />
        ) : (
          <>
            {activeTab === 'overview' && (
              <>
                <KpiGrid stats={stats} finance={finance} ops={ops} control={control} />
                <DigitalControlPanel control={control} stats={stats} ops={ops} />
                <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_0.9fr]">
                  <ChartCard title="Radiografía del negocio" icon={<Radar />}>
                    <ResponsiveContainer width="100%" height={320}>
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="#0f766e" strokeOpacity={0.32} />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#06182a', fontWeight: 800, fontSize: 13 }} />
                        <PolarRadiusAxis domain={[0, 100]} tick={{ fill: '#475569', fontWeight: 700 }} axisLine={{ stroke: '#0f766e', strokeOpacity: 0.25 }} />
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
                        <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                        <XAxis dataKey="day" stroke="#334155" />
                        <YAxis stroke="#334155" />
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
                        <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                        <XAxis dataKey="day" stroke="#334155" />
                        <YAxis stroke="#334155" />
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
                        <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                        <XAxis dataKey="k" stroke="#334155" />
                        <YAxis stroke="#334155" />
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
                          <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                          <XAxis dataKey="day" stroke="#334155" />
                          <YAxis stroke="#334155" />
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
                            <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                            <XAxis dataKey="name" stroke="#334155" />
                            <YAxis stroke="#334155" />
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
                        <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                        <XAxis dataKey="name" stroke="#334155" />
                        <YAxis stroke="#334155" />
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

                <OperationalCommandCenter
                  operational={operational}
                  onOpenJob={(job) => setModal({ type: 'job', job })}
                />
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
            {modal.type === 'job' ? (
              <JobDetailPanel job={modal.job} />
            ) : (
              <div className="text-white">Modal reservado para drilldown futuro</div>
            )}
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
    <div className="mb-6 overflow-hidden rounded-[34px] border border-white/55 bg-white/88 p-5 text-[#06182a] shadow-[0_24px_70px_rgba(8,35,52,0.14)] backdrop-blur-xl">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-5 md:flex-row md:items-center">
          <div className="flex h-[86px] w-[160px] shrink-0 items-center justify-center rounded-[28px] bg-[#69c4c0] shadow-[0_18px_38px_rgba(105,196,192,0.25)]">
            <img src="/logo-manosya.png" alt="ManosYA" className="h-12 w-auto object-contain" />
          </div>

          <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#69c4c0]/35 bg-[#69c4c0]/12 px-3 py-1 text-xs font-black text-[#137d78]">
            <Cpu className="h-3.5 w-3.5" />
            Centro de mando ManosYA
          </div>
          <h1 className="text-3xl font-black tracking-[-0.045em] text-[#06182a] md:text-5xl">
            Control absoluto
          </h1>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-relaxed text-slate-600 md:text-base">
            Control ejecutivo, operación, finanzas, proyecciones y radiografía del futuro de ManosYA.
          </p>
        </div>
        </div>

        <div className="flex items-center gap-2 rounded-2xl border border-[#69c4c0]/25 bg-[#69c4c0]/10 p-2">
          <CalendarClock className="ml-2 h-4 w-4 text-[#137d78]" />
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                range === r.key
                  ? 'bg-[#06182a] text-white'
                  : 'text-[#06182a]/65 hover:bg-white/70'
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
    <div className="mb-6 rounded-[28px] border border-white/60 bg-white/86 p-3 text-[#06182a] shadow-[0_18px_46px_rgba(8,35,52,0.13)] backdrop-blur-xl">
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
                  ? 'border border-[#69c4c0]/35 bg-[#69c4c0]/18 shadow-[0_12px_30px_rgba(98,191,185,0.16)]'
                  : 'border border-slate-200/70 bg-white/72 hover:bg-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-[#69c4c0]/15 p-2">
                  <Icon className="h-4 w-4 text-[#137d78]" />
                </div>
                <div className="text-sm font-black text-[#06182a]">{tab.label}</div>
              </div>

              {tab.badge ? (
                <div className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-black text-red-600">
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

function KpiGrid({ stats, finance, ops, control }) {
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
      <KpiCard icon={<Eye className="h-5 w-5" />} label="Vistas fundador" value={control.founderViews} sub={control.trackerReady ? 'Lectura desde page_views' : 'Tracker web pendiente'} />
      <KpiCard icon={<Video className="h-5 w-5" />} label="Videos subidos" value={control.videos} sub="Contenido que empuja confianza" />
      <KpiCard icon={<ImageIcon className="h-5 w-5" />} label="Fotos subidas" value={control.photos} sub="Trabajos publicados por perfiles" />
      <KpiCard icon={<MessageCircle className="h-5 w-5" />} label="Mensajes" value={control.messages} sub={`${control.chats} conversaciones abiertas`} />
    </div>
  );
}

function DigitalControlPanel({ control, stats, ops }) {
  const contentTotal = Math.max(control.posts, 1);
  const verifiedPct = stats.totalWorkers ? pct(stats.verifiedWorkers, stats.totalWorkers) : 0;
  const docPct = stats.totalWorkers ? pct(ops.workersWithDocs, stats.totalWorkers) : 0;

  return (
    <div className="mt-6 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-[32px] border border-white/55 bg-white/86 p-5 text-[#06182a] shadow-[0_22px_60px_rgba(8,35,52,0.13)] backdrop-blur-xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#69c4c0]/35 bg-[#69c4c0]/12 px-3 py-1 text-xs font-black text-[#137d78]">
              <ScanSearch className="h-3.5 w-3.5" />
              Web y app intelligence
            </div>
            <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-[#06182a]">
              Todo lo que se mueve en ManosYA
            </h2>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-slate-600">
              Vistas del fundador, contenido de trabajadores, conversaciones y actividad operativa conectadas al mismo tablero.
            </p>
          </div>

          <div className="rounded-[26px] bg-[#06182a] px-5 py-4 text-white">
            <div className="text-xs font-black uppercase tracking-[0.16em] text-[#94fff5]">
              Estado tracker
            </div>
            <div className="mt-1 text-2xl font-black">
              {control.trackerReady ? 'Conectado' : 'Pendiente'}
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <ControlSignal icon={<Eye />} label="Founder views" value={control.founderViews} />
          <ControlSignal icon={<Activity />} label="Page views" value={control.totalPageViews} />
          <ControlSignal icon={<MessageCircle />} label="Chats" value={control.chats} />
          <ControlSignal icon={<ClipboardList />} label="Posts" value={control.posts} />
        </div>
      </div>

      <div className="rounded-[32px] border border-white/55 bg-[#06182a] p-5 text-white shadow-[0_22px_60px_rgba(8,35,52,0.18)]">
        <div className="mb-4 flex items-center gap-2 text-sm font-black text-[#94fff5]">
          <Brain className="h-4 w-4" />
          Lectura rapida
        </div>
        <div className="space-y-4">
          <MiniProgress label="Videos dentro del contenido" value={control.videos} total={contentTotal} colorClass="bg-[#62bfb9]" />
          <MiniProgress label="Fotos dentro del contenido" value={control.photos} total={contentTotal} colorClass="bg-cyan-300" />
          <MiniProgress label="Trabajadores verificados" value={stats.verifiedWorkers} total={Math.max(stats.totalWorkers, 1)} colorClass="bg-emerald-300" />
          <MiniProgress label="Documentacion cargada" value={ops.workersWithDocs} total={Math.max(stats.totalWorkers, 1)} colorClass="bg-sky-300" />
        </div>
        <p className="mt-5 text-sm font-semibold leading-relaxed text-white/68">
          Verificados {verifiedPct.toFixed(1)}% - documentos {docPct.toFixed(1)}%. La prioridad es subir mas videos y conectar page views reales para medir fundador, app y conversion.
        </p>
      </div>
    </div>
  );
}

function ControlSignal({ icon, label, value }) {
  return (
    <div className="rounded-[24px] border border-slate-200/80 bg-white/72 p-4">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#69c4c0]/16 text-[#137d78]">
        {icon}
      </div>
      <div className="text-2xl font-black text-[#06182a]">{Number(value || 0).toLocaleString('es-PY')}</div>
      <div className="mt-1 text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}</div>
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
    <div className="rounded-[26px] border border-white/60 bg-white/88 p-5 text-[#06182a] shadow-[0_18px_46px_rgba(8,35,52,0.13)] backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between">
        <div className="rounded-2xl border border-[#69c4c0]/25 bg-[#69c4c0]/15 p-3 text-[#137d78]">{icon}</div>
        <div className="h-2.5 w-2.5 rounded-full bg-[#62bfb9] shadow-[0_0_18px_rgba(98,191,185,0.8)]" />
      </div>
      <div className="text-sm font-black text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-black tracking-tight text-[#06182a]">{value}</div>
      <div className="mt-1 text-xs font-semibold text-slate-500">{sub}</div>
    </div>
  );
}

function ChartCard({ title, icon, children }) {
  return (
    <div className="rounded-[28px] border border-white/60 bg-white/92 p-5 text-[#06182a] shadow-[0_18px_46px_rgba(8,35,52,0.13)] backdrop-blur-xl [&_.recharts-cartesian-axis-tick_text]:fill-[#06182a] [&_.recharts-legend-item-text]:!text-[#06182a] [&_.recharts-polar-angle-axis-tick-value]:fill-[#06182a] [&_.recharts-polar-radius-axis-tick-value]:fill-[#475569] [&_.recharts-text]:font-semibold">
      <div className="mb-4 flex items-center gap-2 text-sm font-black text-[#06182a]">
        {icon}
        <span>{title}</span>
      </div>
      {children}
    </div>
  );
}

function ExecutiveAlerts({ alerts }) {
  return (
    <div className="rounded-[28px] border border-white/60 bg-white/88 p-5 text-[#06182a] shadow-[0_18px_46px_rgba(8,35,52,0.13)] backdrop-blur-xl">
      <div className="mb-4 flex items-center gap-2 text-sm font-black text-[#06182a]">
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
                  ? 'border-red-300 bg-red-50'
                  : a.level === 'medium'
                  ? 'border-amber-300 bg-amber-50'
                  : 'border-emerald-300 bg-emerald-50'
              }`}
            >
              <div className="font-black text-[#06182a]">{a.title}</div>
              <div className="mt-1 text-sm font-semibold text-slate-600">{a.detail}</div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-500">
            No hay alertas críticas por ahora.
          </div>
        )}
      </div>
    </div>
  );
}

function OperationalCommandCenter({ operational, onOpenJob }) {
  const metrics = operational?.metrics || {};
  const jobs = operational?.jobs || [];

  return (
    <div className="mt-6 space-y-6">
      <div className="rounded-[34px] border border-white/60 bg-white/90 p-5 text-[#06182a] shadow-[0_24px_70px_rgba(8,35,52,0.14)] backdrop-blur-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#69c4c0]/35 bg-[#69c4c0]/12 px-3 py-1 text-xs font-black text-[#137d78]">
              <Activity className="h-3.5 w-3.5" />
              Trazabilidad operativa
            </div>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.045em] text-[#06182a]">
              Solicitud, chat, trabajo y review en una sola vista
            </h2>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-relaxed text-slate-600">
              Acá ves quién pidió, quién respondió, quién trabajó, cuánto tardó y qué quedó sin atención.
            </p>
          </div>

          <div className="rounded-[24px] bg-[#06182a] px-5 py-4 text-white">
            <div className="text-xs font-black uppercase tracking-[0.16em] text-[#94fff5]">Jobs auditados</div>
            <div className="mt-1 text-3xl font-black">{jobs.length}</div>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <OperationalMetric label="Tasa de aceptación" value={`${(metrics.acceptanceRate || 0).toFixed(1)}%`} sub="Aceptados, asignados o completados" />
          <OperationalMetric label="Tasa de cancelación" value={`${(metrics.cancellationRate || 0).toFixed(1)}%`} sub="Cancelados o rechazados" tone="warning" />
          <OperationalMetric label="Respuesta promedio" value={formatDuration(Math.round(metrics.avgResponseMinutes || 0))} sub="Desde solicitud hasta aceptación/respuesta" />
          <OperationalMetric label="Finalización promedio" value={formatDuration(Math.round(metrics.avgCompletionMinutes || 0))} sub="Desde solicitud hasta completado" />
          <OperationalMetric label="Abiertos sin respuesta" value={metrics.openNoResponse || 0} sub="Más de 2 horas abiertos" tone="danger" />
          <OperationalMetric label="Chats sin respuesta" value={metrics.chatsNoResponse || 0} sub="Cliente escribió, trabajador no respondió" tone="warning" />
          <OperationalMetric label="Trabajadores activos hoy" value={metrics.activeWorkersToday || 0} sub="Jobs, posts o mensajes hoy" />
          <OperationalMetric label="Clientes activos hoy" value={metrics.activeClientsToday || 0} sub="Solicitudes, chats o contactos hoy" />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
        <JobsOperationalTable jobs={jobs} onOpenJob={onOpenJob} />

        <div className="space-y-6">
          <AdminOperationalAlerts alerts={operational?.alerts || []} />
          <RankPanel title="Top trabajadores" icon={<Wrench className="h-4 w-4" />} rows={operational?.topWorkers || []} type="worker" />
          <RankPanel title="Top clientes" icon={<Users className="h-4 w-4" />} rows={operational?.topClients || []} type="client" />
          <RankPanel title="Top proveedores" icon={<Building2 className="h-4 w-4" />} rows={operational?.topProviders || []} type="provider" />
        </div>
      </div>
    </div>
  );
}

function OperationalMetric({ label, value, sub, tone = 'normal' }) {
  const toneClass =
    tone === 'danger'
      ? 'bg-red-50 text-red-700 border-red-200'
      : tone === 'warning'
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : 'bg-[#69c4c0]/12 text-[#137d78] border-[#69c4c0]/30';

  return (
    <div className="rounded-[24px] border border-slate-200/80 bg-white/80 p-4 shadow-sm">
      <div className={`mb-3 inline-flex rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.1em] ${toneClass}`}>
        {label}
      </div>
      <div className="text-3xl font-black text-[#06182a]">{value}</div>
      <div className="mt-1 text-xs font-semibold text-slate-500">{sub}</div>
    </div>
  );
}

function JobsOperationalTable({ jobs, onOpenJob }) {
  return (
    <div className="overflow-hidden rounded-[32px] border border-white/60 bg-white/92 text-[#06182a] shadow-[0_22px_60px_rgba(8,35,52,0.13)] backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.16em] text-[#137d78]">Tabla operativa de trabajos</div>
          <h3 className="mt-1 text-2xl font-black tracking-[-0.04em]">Últimas solicitudes conectadas</h3>
        </div>
        <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
          {jobs.length} registros
        </div>
      </div>

      <div className="max-h-[620px] overflow-auto">
        <table className="min-w-[1080px] w-full text-left text-sm">
          <thead className="sticky top-0 z-10 bg-[#f8fffd] text-xs uppercase tracking-[0.08em] text-slate-500">
            <tr>
              <th className="px-4 py-3">Job</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Trabajador</th>
              <th className="px-4 py-3">Servicio</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Solicitud</th>
              <th className="px-4 py-3">Aceptación</th>
              <th className="px-4 py-3">Finalización</th>
              <th className="px-4 py-3">Chat</th>
              <th className="px-4 py-3">Review</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {jobs.length ? (
              jobs.map((job) => (
                <tr key={job.id} className="bg-white/70 transition hover:bg-[#69c4c0]/8">
                  <td className="px-4 py-4 font-black text-[#06182a]">#{job.shortId}</td>
                  <td className="px-4 py-4">
                    <div className="font-bold text-slate-900">{job.clientName}</div>
                    <div className="text-xs text-slate-500">{job.client?.phone || job.client?.email || 'Sin contacto'}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-bold text-slate-900">{job.workerName}</div>
                    <div className="text-xs text-slate-500">{job.worker?.phone || job.worker?.email || 'Sin contacto'}</div>
                  </td>
                  <td className="px-4 py-4 max-w-[180px]">
                    <div className="truncate font-semibold text-slate-700">{job.service}</div>
                  </td>
                  <td className="px-4 py-4"><StatusPill status={job.status} /></td>
                  <td className="px-4 py-4 text-slate-600">{formatDateTime(job.created_at)}</td>
                  <td className="px-4 py-4">
                    <div className="text-slate-600">{formatDateTime(job.accepted_at)}</div>
                    <div className="text-xs font-bold text-slate-400">{formatDuration(job.responseMinutes)}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-slate-600">{formatDateTime(job.completed_at)}</div>
                    <div className="text-xs font-bold text-slate-400">{formatDuration(job.completionMinutes)}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className={job.hasChat ? 'font-black text-emerald-700' : 'font-black text-slate-400'}>
                      {job.hasChat ? 'Sí' : 'No'}
                    </div>
                    <div className="text-xs text-slate-500">{job.messagesCount} mensajes</div>
                  </td>
                  <td className="px-4 py-4">
                    {job.rating ? (
                      <div className="font-black text-amber-600">{Number(job.rating).toFixed(1)}/5</div>
                    ) : (
                      <div className="font-semibold text-slate-400">Sin review</div>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <button
                      type="button"
                      onClick={() => onOpenJob(job)}
                      className="rounded-full bg-[#06182a] px-4 py-2 text-xs font-black text-white shadow-[0_10px_24px_rgba(6,24,42,0.22)]"
                    >
                      Ver detalle
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={11} className="px-5 py-12 text-center font-semibold text-slate-500">
                  Todavía no hay trabajos recientes para auditar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusPill({ status }) {
  const meta = statusMeta(status);
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${meta.className}`}>
      {meta.label}
    </span>
  );
}

function AdminOperationalAlerts({ alerts }) {
  return (
    <div className="rounded-[28px] border border-white/60 bg-white/90 p-5 text-[#06182a] shadow-[0_18px_46px_rgba(8,35,52,0.13)]">
      <div className="mb-4 flex items-center gap-2 text-sm font-black">
        <Siren className="h-4 w-4 text-[#137d78]" />
        Alertas admin
      </div>
      <div className="space-y-3">
        {alerts.length ? (
          alerts.map((alert, index) => (
            <div
              key={`${alert.title}-${index}`}
              className={`rounded-2xl border p-4 ${
                alert.level === 'high'
                  ? 'border-red-200 bg-red-50'
                  : alert.level === 'medium'
                  ? 'border-amber-200 bg-amber-50'
                  : 'border-slate-200 bg-slate-50'
              }`}
            >
              <div className="font-black text-[#06182a]">{alert.title}</div>
              <p className="mt-1 text-sm font-semibold text-slate-600">{alert.detail}</p>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
            Sin alertas operativas críticas ahora mismo.
          </div>
        )}
      </div>
    </div>
  );
}

function RankPanel({ title, icon, rows, type }) {
  return (
    <div className="rounded-[28px] border border-white/60 bg-white/90 p-5 text-[#06182a] shadow-[0_18px_46px_rgba(8,35,52,0.13)]">
      <div className="mb-4 flex items-center gap-2 text-sm font-black">
        <span className="text-[#137d78]">{icon}</span>
        {title}
      </div>

      <div className="space-y-3">
        {rows.length ? (
          rows.slice(0, 5).map((row, index) => (
            <div key={`${type}-${row.id}`} className="rounded-2xl border border-slate-200 bg-white/80 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-black text-[#137d78]">#{index + 1}</div>
                  <div className="mt-1 font-black text-[#06182a]">{row.name}</div>
                </div>
                <div className="rounded-full bg-[#69c4c0]/14 px-3 py-1 text-xs font-black text-[#137d78]">
                  {Math.max(0, Math.round(row.score || 0))} pts
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-semibold text-slate-600">
                {type === 'worker' && (
                  <>
                    <span>{row.completed} completados</span>
                    <span>{row.cancelled} cancelados</span>
                    <span>{row.messages} respuestas</span>
                    <span>{row.posts} posts</span>
                    <span>Rating {row.avgRating ? row.avgRating.toFixed(1) : '-'}</span>
                    <span>Resp. {formatDuration(Math.round(row.avgResponse || 0))}</span>
                  </>
                )}
                {type === 'client' && (
                  <>
                    <span>{row.requests} solicitudes</span>
                    <span>{row.chats} chats</span>
                    <span>{row.reviews} reviews</span>
                    <span>{row.cancelled} cancelados</span>
                  </>
                )}
                {type === 'provider' && (
                  <>
                    <span>{row.contacts} contactos</span>
                    <span>{row.products} productos</span>
                    <span>{row.visits} visitas</span>
                    <span>{row.ctaClicks} CTA</span>
                  </>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-500">
            Sin datos suficientes todavía.
          </div>
        )}
      </div>
    </div>
  );
}

function JobDetailPanel({ job }) {
  if (!job) return null;

  const timeline = [
    { label: 'Solicitud creada', value: job.created_at },
    { label: 'Aceptación / primera respuesta', value: job.accepted_at },
    { label: 'Último mensaje', value: job.lastMessageAt },
    { label: 'Trabajo completado', value: job.completed_at },
    { label: 'Review recibida', value: job.reviewAt },
  ];

  return (
    <div className="max-h-[78vh] overflow-y-auto pr-1 text-white">
      <div className="mb-5">
        <div className="text-xs font-black uppercase tracking-[0.18em] text-[#94fff5]">Detalle operativo</div>
        <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">Trabajo #{job.shortId}</h2>
        <p className="mt-2 text-sm font-semibold leading-relaxed text-white/60">
          {job.description || job.service || 'Solicitud sin descripción cargada.'}
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <DetailMini label="Estado" value={<StatusPill status={job.status} />} />
        <DetailMini label="Mensajes" value={`${job.messagesCount} total`} />
        <DetailMini label="Review" value={job.rating ? `${Number(job.rating).toFixed(1)}/5` : 'Sin review'} />
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <PersonDetail title="Cliente" profile={job.client} fallback={job.clientName} />
        <PersonDetail title="Trabajador" profile={job.worker} fallback={job.workerName} />
      </div>

      <div className="mt-5 rounded-[24px] border border-white/10 bg-white/[0.05] p-5">
        <div className="mb-4 text-sm font-black text-white">Historial de estado</div>
        <div className="space-y-3">
          {timeline.map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-4 rounded-2xl bg-black/20 px-4 py-3">
              <span className="text-sm font-semibold text-white/70">{item.label}</span>
              <span className="text-sm font-black text-white">{formatDateTime(item.value)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <DetailMini label="Tiempo de respuesta" value={formatDuration(job.responseMinutes)} />
        <DetailMini label="Tiempo de finalización" value={formatDuration(job.completionMinutes)} />
      </div>

      <div className="mt-5 rounded-[24px] border border-white/10 bg-white/[0.05] p-5">
        <div className="mb-3 text-sm font-black text-white">Observaciones</div>
        <p className="text-sm font-semibold leading-relaxed text-white/62">
          {job.hasChat
            ? `Este trabajo tiene chat conectado (${job.chatId}). Hubo ${job.clientMessagesCount} mensajes del cliente y ${job.workerMessagesCount} respuestas del trabajador.`
            : 'Este trabajo todavía no tiene chat relacionado. Conviene revisar si el CTA está llevando correctamente a conversación.'}
        </p>
        {job.reviewComment ? (
          <p className="mt-3 rounded-2xl bg-amber-400/10 px-4 py-3 text-sm font-semibold text-amber-100">
            Review: “{job.reviewComment}”
          </p>
        ) : null}
      </div>
    </div>
  );
}

function DetailMini({ label, value }) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/[0.05] p-4">
      <div className="text-xs font-black uppercase tracking-[0.12em] text-white/45">{label}</div>
      <div className="mt-2 text-lg font-black text-white">{value}</div>
    </div>
  );
}

function PersonDetail({ title, profile, fallback }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-5">
      <div className="mb-3 text-xs font-black uppercase tracking-[0.12em] text-[#94fff5]">{title}</div>
      <div className="flex items-center gap-3">
        <img
          src={profile?.avatar_url || '/avatar-fallback.png'}
          alt={profileName(profile, fallback)}
          className="h-14 w-14 rounded-full object-cover"
        />
        <div className="min-w-0">
          <div className="truncate text-lg font-black text-white">{profileName(profile, fallback)}</div>
          <div className="truncate text-sm font-semibold text-white/55">{profile?.email || profile?.phone || 'Sin contacto visible'}</div>
          <div className="mt-1 text-xs font-black uppercase tracking-[0.1em] text-white/35">{profile?.role || 'sin rol'}</div>
        </div>
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
