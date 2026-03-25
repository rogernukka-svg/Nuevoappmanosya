'use client';

import { useEffect, useMemo, useState } from 'react';
import { getSupabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
  Loader2,
  FileText,
  ShieldCheck,
  RefreshCw,
  XCircle,
  Building,
  Search,
  MapPin,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  AlertTriangle,
  Clock3,
  Filter,
  Users,
  BadgeCheck,
  ChevronRight,
  Sparkles,
  Activity,
  ShieldAlert,
  Phone,
  Mail,
  ScanLine,
  Banknote,
  Eye,
  Lock,
  Unlock,
  ShieldX,
  ClipboardList,
  TriangleAlert,
  NotebookPen,
  Radar,
  CheckCheck,
  PauseCircle,
} from 'lucide-react';
import '../../globals.css';

const supabase = getSupabase();

const ADMIN_NOTES_TABLE = 'admin_worker_notes';
const ADMIN_HISTORY_TABLE = 'admin_worker_history';
const ADMIN_BLOCKS_TABLE = 'worker_blocks';

export default function AdminWorkersPage() {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [selected, setSelected] = useState(null);

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [docsFilter, setDocsFilter] = useState('all');
  const [sortBy, setSortBy] = useState('updated_desc');
  const [activeTab, setActiveTab] = useState('summary');
    const [accessChecked, setAccessChecked] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);

  async function logAdminHistory({
    workerId,
    action,
    detail = null,
    extra = null,
  }) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      await supabase.from(ADMIN_HISTORY_TABLE).insert({
        worker_id: workerId,
        admin_id: user?.id || null,
        action,
        detail,
        extra,
      });
    } catch (err) {
      console.warn('No se pudo guardar historial admin', err);
    }
  }
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
  async function fetchAll() {
    setLoading(true);
    try {
      const since90 = new Date();
      since90.setDate(since90.getDate() - 90);

      const [
        { data: base, error: baseError },
        { data: docs, error: docsError },
        { data: jobs, error: jobsError },
        { data: notes, error: notesError },
        { data: blocks, error: blocksError },
      ] = await Promise.all([
        supabase
          .from('admin_workers_view')
          .select('*')
          .order('updated_at', { ascending: false }),
        supabase
          .from('documents')
          .select('user_id, doc_type, doc_number, front_url, back_url, file_url'),
        supabase
          .from('jobs')
          .select('worker_id, status, created_at')
          .not('worker_id', 'is', null)
          .gte('created_at', since90.toISOString()),
        supabase
          .from(ADMIN_NOTES_TABLE)
          .select('id, worker_id, note, created_at, admin_id')
          .order('created_at', { ascending: false }),
        supabase
          .from(ADMIN_BLOCKS_TABLE)
          .select(
            'id, worker_id, reason, starts_at, ends_at, is_active, created_at, admin_id'
          )
          .order('created_at', { ascending: false }),
      ]);

      if (baseError) throw baseError;
      if (docsError) throw docsError;
      if (jobsError) throw jobsError;
      if (notesError && notesError.code !== 'PGRST116') console.warn(notesError);
      if (blocksError && blocksError.code !== 'PGRST116') console.warn(blocksError);

      const docsByUser = {};
      for (const d of docs || []) {
        if (!docsByUser[d.user_id]) docsByUser[d.user_id] = [];
        docsByUser[d.user_id].push(d);
      }

      const notesByUser = {};
      for (const n of notes || []) {
        if (!notesByUser[n.worker_id]) notesByUser[n.worker_id] = [];
        notesByUser[n.worker_id].push(n);
      }

      const blocksByUser = {};
      for (const b of blocks || []) {
        if (!blocksByUser[b.worker_id]) blocksByUser[b.worker_id] = [];
        blocksByUser[b.worker_id].push(b);
      }

      const now = new Date();
      const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const jobsByUser = {};
      for (const j of jobs || []) {
        const uid = j.worker_id;
        if (!uid) continue;

        if (!jobsByUser[uid]) {
          jobsByUser[uid] = {
            total90: 0,
            completed90: 0,
            accepted90: 0,
            cancelled90: 0,
            today: 0,
            month: 0,
          };
        }

        jobsByUser[uid].total90 += 1;

        if (j.status === 'completed') jobsByUser[uid].completed90 += 1;
        if (j.status === 'accepted' || j.status === 'assigned') jobsByUser[uid].accepted90 += 1;
        if (j.status === 'cancelled') jobsByUser[uid].cancelled90 += 1;

        const createdAt = new Date(j.created_at);
        if (createdAt >= startToday) jobsByUser[uid].today += 1;
        if (createdAt >= startMonth) jobsByUser[uid].month += 1;
      }

      const enriched = (base || []).map((w) => {
        const userDocs = docsByUser[w.user_id] || [];
        const userStats = jobsByUser[w.user_id] || {
          total90: 0,
          completed90: 0,
          accepted90: 0,
          cancelled90: 0,
          today: 0,
          month: 0,
        };

        const hasBank =
          !!w.bank_name ||
          !!w.account_number ||
          !!w.holder_name ||
          !!w.holder_document;

        const normalizedSkills = normalizeSkills(w.skills);
        const docNumbers = userDocs.map((d) => d.doc_number).filter(Boolean);
        const latestNote = (notesByUser[w.user_id] || [])[0] || null;
        const activeBlock = (blocksByUser[w.user_id] || []).find((b) => {
          if (!b.is_active) return false;
          if (!b.ends_at) return true;
          return new Date(b.ends_at) > new Date();
        });

        const docRisk = getDocumentRisk({
          docs: userDocs,
          hasBank,
          hasAvatar: !!w.avatar_url,
          hasCity: !!w.city,
          hasSkills: normalizedSkills.length > 0,
        });

        const score = calculateProfileScore({
          worker: w,
          docs: userDocs,
          stats: userStats,
          hasBank,
          normalizedSkills,
          activeBlock,
          docRisk,
        });

        return {
          ...w,
          docs: userDocs,
          notes: notesByUser[w.user_id] || [],
          latestNote,
          blocks: blocksByUser[w.user_id] || [],
          activeBlock: activeBlock || null,
          docNumbers,
          stats: userStats,
          hasDocs: userDocs.length > 0,
          hasBank,
          normalizedSkills,
          docRisk,
          profileScore: score,
          searchableText: [
            w.full_name,
            w.city,
            w.bio,
            normalizedSkills.join(' '),
            docNumbers.join(' '),
            w.phone,
            latestNote?.note,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase(),
          workerStatus: getWorkerStatus(w, activeBlock),
        };
      });

      setWorkers(enriched);
    } catch (err) {
      console.error(err);
      toast.error('⚠️ Error cargando trabajadores');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let alive = true;

    (async () => {
      const allowed = await checkAdminAccess();
      if (!alive || !allowed) return;
      await fetchAll();
    })();

    return () => {
      alive = false;
    };
  }, []);

  async function handleVerify(userId, approve) {
    setBusy(userId);
    try {
      const { error } = await supabase.rpc('admin_approve_worker', {
        target_user: userId,
        approve,
      });

      if (error) throw error;

      await logAdminHistory({
        workerId: userId,
        action: approve ? 'approve_worker' : 'reject_worker',
        detail: approve
          ? 'Trabajador aprobado y publicado'
          : 'Trabajador rechazado y ocultado',
      });

      toast.success(
        approve
          ? '✅ Trabajador aprobado y publicado en el mapa'
          : '❌ Trabajador rechazado y ocultado'
      );

      await fetchAll();
      setSelected(null);
    } catch (err) {
      console.error(err);
      toast.error('Error al actualizar trabajador');
    } finally {
      setBusy(null);
    }
  }

  async function handleSaveNote(workerId, note) {
    if (!note?.trim()) {
      toast.warning('Escribí una nota primero');
      return false;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase.from(ADMIN_NOTES_TABLE).insert({
        worker_id: workerId,
        admin_id: user?.id || null,
        note: note.trim(),
      });

      if (error) throw error;

      await logAdminHistory({
        workerId,
        action: 'note_added',
        detail: 'Nota interna agregada',
        extra: { note: note.trim() },
      });

      toast.success('📝 Nota guardada');
      await fetchAll();
      return true;
    } catch (err) {
      console.error(err);
      toast.error('No se pudo guardar la nota');
      return false;
    }
  }

  async function handleToggleBlock(worker, payload) {
    setBusy(worker.user_id);
    try {
      if (worker.activeBlock) {
        const { error } = await supabase
          .from(ADMIN_BLOCKS_TABLE)
          .update({
            is_active: false,
            ends_at: new Date().toISOString(),
          })
          .eq('id', worker.activeBlock.id);

        if (error) throw error;

        await logAdminHistory({
          workerId: worker.user_id,
          action: 'worker_unblocked',
          detail: 'Bloqueo temporal levantado',
        });

        toast.success('🔓 Bloqueo levantado');
      } else {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        const { error } = await supabase.from(ADMIN_BLOCKS_TABLE).insert({
          worker_id: worker.user_id,
          admin_id: user?.id || null,
          reason: payload?.reason || 'Bloqueo administrativo temporal',
          starts_at: new Date().toISOString(),
          ends_at: payload?.endsAt || null,
          is_active: true,
        });

        if (error) throw error;

        await logAdminHistory({
          workerId: worker.user_id,
          action: 'worker_blocked',
          detail: payload?.reason || 'Bloqueo administrativo temporal',
          extra: { ends_at: payload?.endsAt || null },
        });

        toast.success('⛔ Trabajador bloqueado temporalmente');
      }

      await fetchAll();
      setSelected(null);
    } catch (err) {
      console.error(err);
      toast.error('No se pudo actualizar el bloqueo');
    } finally {
      setBusy(null);
    }
  }

  const cities = useMemo(() => {
    const set = new Set(workers.map((w) => w.city).filter(Boolean));
    return ['all', ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [workers]);

  const filteredWorkers = useMemo(() => {
    let list = [...workers];

    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((w) => w.searchableText.includes(q));
    }

    if (statusFilter !== 'all') {
      list = list.filter((w) => w.workerStatus.key === statusFilter);
    }

    if (cityFilter !== 'all') {
      list = list.filter((w) => w.city === cityFilter);
    }

    if (docsFilter === 'with_docs') list = list.filter((w) => w.hasDocs);
    if (docsFilter === 'without_docs') list = list.filter((w) => !w.hasDocs);
    if (docsFilter === 'risk_high') list = list.filter((w) => w.docRisk.level === 'high');
    if (docsFilter === 'risk_medium') list = list.filter((w) => w.docRisk.level === 'medium');
    if (docsFilter === 'risk_low') list = list.filter((w) => w.docRisk.level === 'low');

    list.sort((a, b) => {
      switch (sortBy) {
        case 'name_asc':
          return (a.full_name || '').localeCompare(b.full_name || '');
        case 'jobs_today_desc':
          return (b.stats?.today || 0) - (a.stats?.today || 0);
        case 'jobs_month_desc':
          return (b.stats?.month || 0) - (a.stats?.month || 0);
        case 'completed_desc':
          return (b.stats?.completed90 || 0) - (a.stats?.completed90 || 0);
        case 'score_desc':
          return (b.profileScore || 0) - (a.profileScore || 0);
        case 'risk_desc':
          return riskWeight(b.docRisk.level) - riskWeight(a.docRisk.level);
        case 'updated_desc':
        default:
          return (
            new Date(b.updated_at || 0).getTime() -
            new Date(a.updated_at || 0).getTime()
          );
      }
    });

    return list;
  }, [workers, query, statusFilter, cityFilter, docsFilter, sortBy]);

  const pending = filteredWorkers.filter(
    (w) => !w.worker_verified || !w.is_active
  );
  const verified = filteredWorkers.filter(
    (w) => w.worker_verified && w.is_active && !w.activeBlock
  );
  const risky = filteredWorkers.filter(
    (w) => w.docRisk.level !== 'low' || !!w.activeBlock
  );

  const currentTabList = useMemo(() => {
    if (activeTab === 'pending') return pending;
    if (activeTab === 'active') return verified;
    if (activeTab === 'risk') return risky;
    return filteredWorkers;
  }, [activeTab, pending, verified, risky, filteredWorkers]);

  const dashboard = useMemo(() => {
    const total = workers.length;
    const active = workers.filter((w) => w.worker_verified && w.is_active && !w.activeBlock).length;
    const pendingCount = workers.filter((w) => !w.worker_verified || !w.is_active).length;
    const withDocs = workers.filter((w) => w.hasDocs).length;
    const highRisk = workers.filter((w) => w.docRisk.level === 'high').length;
    const blocked = workers.filter((w) => !!w.activeBlock).length;
    const totalToday = workers.reduce((acc, w) => acc + (w.stats?.today || 0), 0);
    const totalMonth = workers.reduce((acc, w) => acc + (w.stats?.month || 0), 0);
    const avgScore = total
      ? Math.round(
          workers.reduce((acc, w) => acc + (w.profileScore || 0), 0) / total
        )
      : 0;

    return {
      total,
      active,
      pendingCount,
      withDocs,
      highRisk,
      blocked,
      totalToday,
      totalMonth,
      avgScore,
    };
  }, [workers]);

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
    <div className="min-h-screen bg-[#06111A] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-28 left-[-10%] h-80 w-80 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute top-[15%] right-[-5%] h-96 w-96 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute bottom-[-10%] left-[20%] h-96 w-96 rounded-full bg-teal-400/10 blur-3xl" />
      </div>

      <main className="relative z-10 mx-auto max-w-7xl px-4 py-6 md:px-6 lg:px-8">
        <Header onRefresh={fetchAll} />

        <DashboardCards dashboard={dashboard} />

        <TabsBar activeTab={activeTab} setActiveTab={setActiveTab} dashboard={dashboard} />

        <ControlBar
          query={query}
          setQuery={setQuery}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          cityFilter={cityFilter}
          setCityFilter={setCityFilter}
          docsFilter={docsFilter}
          setDocsFilter={setDocsFilter}
          sortBy={sortBy}
          setSortBy={setSortBy}
          cities={cities}
        />

        {loading ? (
          <LoadingState />
        ) : (
          <>
            {activeTab === 'summary' && (
              <>
                <Section
                  title="Vista general del sistema"
                  subtitle="Todos los perfiles con filtros avanzados, score y riesgo documental"
                  tone="summary"
                  list={currentTabList}
                  onSelect={setSelected}
                />
              </>
            )}

            {activeTab === 'pending' && (
              <Section
                title="Pendientes de control"
                subtitle="Perfiles no aprobados, incompletos o inactivos"
                tone="pending"
                list={currentTabList}
                onSelect={setSelected}
              />
            )}

            {activeTab === 'active' && (
              <Section
                title="Activos y aprobados"
                subtitle="Trabajadores visibles, operativos y sin bloqueo"
                tone="active"
                list={currentTabList}
                onSelect={setSelected}
              />
            )}

            {activeTab === 'risk' && (
              <Section
                title="Riesgo y revisión"
                subtitle="Perfiles con documentos incompletos, score bajo o bloqueos"
                tone="risk"
                list={currentTabList}
                onSelect={setSelected}
              />
            )}
          </>
        )}
      </main>

      <footer className="relative z-10 border-t border-white/10 bg-black/20 px-6 py-4 text-center text-xs text-white/60 backdrop-blur">
        © {new Date().getFullYear()}{' '}
        <span className="font-semibold text-emerald-400">ManosYA</span> · Panel corporativo
      </footer>

      {selected && (
        <WorkerDetailModal
          worker={selected}
          onClose={() => setSelected(null)}
          onVerify={handleVerify}
          onSaveNote={handleSaveNote}
          onToggleBlock={handleToggleBlock}
          busy={busy}
        />
      )}
    </div>
  );
}

/* ========================================================= */
/* HEADER */

function Header({ onRefresh }) {
  return (
    <div className="mb-6 rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur-xl shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">
            <Sparkles className="h-3.5 w-3.5" />
            Centro de control ManosYA
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white md:text-4xl">
            Panel de Verificación de Trabajadores
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-white/65 md:text-base">
            Vista premium para administrar validaciones, riesgo documental, notas internas, bloqueos y score automático.
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15 active:scale-[0.99]"
        >
          <RefreshCw size={16} />
          Refrescar panel
        </button>
      </div>
    </div>
  );
}

/* ========================================================= */
/* DASHBOARD */

function DashboardCards({ dashboard }) {
  const cards = [
    {
      label: 'Trabajadores totales',
      value: dashboard.total,
      icon: Users,
      tone: 'from-cyan-500/20 to-cyan-400/5',
    },
    {
      label: 'Activos',
      value: dashboard.active,
      icon: BadgeCheck,
      tone: 'from-emerald-500/20 to-emerald-400/5',
    },
    {
      label: 'Pendientes',
      value: dashboard.pendingCount,
      icon: ShieldAlert,
      tone: 'from-amber-500/20 to-orange-400/5',
    },
    {
      label: 'Riesgo alto',
      value: dashboard.highRisk,
      icon: TriangleAlert,
      tone: 'from-red-500/20 to-orange-500/5',
    },
    {
      label: 'Bloqueados',
      value: dashboard.blocked,
      icon: ShieldX,
      tone: 'from-fuchsia-500/20 to-fuchsia-400/5',
    },
    {
      label: 'Score promedio',
      value: dashboard.avgScore,
      icon: Radar,
      tone: 'from-teal-500/20 to-teal-400/5',
    },
    {
      label: 'Trabajos hoy',
      value: dashboard.totalToday,
      icon: CalendarDays,
      tone: 'from-sky-500/20 to-sky-400/5',
    },
    {
      label: 'Trabajos del mes',
      value: dashboard.totalMonth,
      icon: Activity,
      tone: 'from-violet-500/20 to-violet-400/5',
    },
  ];

  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className={`rounded-[26px] border border-white/10 bg-gradient-to-br ${card.tone} p-5 shadow-[0_18px_60px_rgba(0,0,0,0.25)] backdrop-blur-xl`}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
                <Icon className="h-5 w-5 text-white" />
              </div>
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(16,185,129,0.8)]" />
            </div>
            <div className="text-3xl font-black tracking-tight text-white">
              {card.value}
            </div>
            <div className="mt-1 text-sm text-white/65">{card.label}</div>
          </div>
        );
      })}
    </div>
  );
}

/* ========================================================= */
/* TABS */

function TabsBar({ activeTab, setActiveTab, dashboard }) {
  const tabs = [
    {
      key: 'summary',
      label: 'Resumen',
      icon: ClipboardList,
      count: dashboard.total,
    },
    {
      key: 'pending',
      label: 'Pendientes',
      icon: Clock3,
      count: dashboard.pendingCount,
    },
    {
      key: 'active',
      label: 'Activos',
      icon: CheckCheck,
      count: dashboard.active,
    },
    {
      key: 'risk',
      label: 'Riesgo',
      icon: TriangleAlert,
      count: dashboard.highRisk + dashboard.blocked,
    },
  ];

  return (
    <div className="mb-6 rounded-[28px] border border-white/10 bg-white/5 p-3 backdrop-blur-xl shadow-[0_20px_80px_rgba(0,0,0,0.28)]">
      <div className="grid gap-3 md:grid-cols-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center justify-between rounded-2xl px-4 py-4 text-left transition ${
                active
                  ? 'bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 border border-emerald-400/20'
                  : 'bg-black/20 border border-white/10 hover:bg-white/[0.06]'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-white/10 p-2">
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">{tab.label}</div>
                  <div className="text-xs text-white/45">Vista operativa</div>
                </div>
              </div>
              <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white">
                {tab.count}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ========================================================= */
/* CONTROL BAR */

function ControlBar({
  query,
  setQuery,
  statusFilter,
  setStatusFilter,
  cityFilter,
  setCityFilter,
  docsFilter,
  setDocsFilter,
  sortBy,
  setSortBy,
  cities,
}) {
  return (
    <div className="mb-8 rounded-[28px] border border-white/10 bg-white/5 p-4 backdrop-blur-xl shadow-[0_20px_80px_rgba(0,0,0,0.28)]">
      <div className="grid gap-3 lg:grid-cols-[1.8fr_repeat(4,1fr)]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, cédula, teléfono, ciudad, oficio o nota..."
            className="h-12 w-full rounded-2xl border border-white/10 bg-black/20 pl-11 pr-4 text-sm text-white outline-none placeholder:text-white/35 focus:border-emerald-400/40"
          />
        </div>

        <SelectBox
          icon={Filter}
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            ['all', 'Todos'],
            ['active', 'Activos'],
            ['pending', 'Pendientes'],
            ['inactive', 'Inactivos'],
            ['blocked', 'Bloqueados'],
          ]}
        />

        <SelectBox
          icon={MapPin}
          value={cityFilter}
          onChange={setCityFilter}
          options={cities.map((c) => [c, c === 'all' ? 'Todas las ciudades' : c])}
        />

        <SelectBox
          icon={ScanLine}
          value={docsFilter}
          onChange={setDocsFilter}
          options={[
            ['all', 'Todos los docs'],
            ['with_docs', 'Con documentos'],
            ['without_docs', 'Sin documentos'],
            ['risk_high', 'Riesgo alto'],
            ['risk_medium', 'Riesgo medio'],
            ['risk_low', 'Riesgo bajo'],
          ]}
        />

        <SelectBox
          icon={ChevronRight}
          value={sortBy}
          onChange={setSortBy}
          options={[
            ['updated_desc', 'Última actividad'],
            ['name_asc', 'Nombre A-Z'],
            ['jobs_today_desc', 'Más trabajos hoy'],
            ['jobs_month_desc', 'Más trabajos mes'],
            ['completed_desc', 'Más completados'],
            ['score_desc', 'Mayor score'],
            ['risk_desc', 'Mayor riesgo'],
          ]}
        />
      </div>
    </div>
  );
}

function SelectBox({ icon: Icon, value, onChange, options }) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 w-full appearance-none rounded-2xl border border-white/10 bg-black/20 pl-11 pr-4 text-sm text-white outline-none focus:border-emerald-400/40"
      >
        {options.map(([val, label]) => (
          <option key={val} value={val} className="bg-slate-900 text-white">
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}

/* ========================================================= */
/* SECTION */

function Section({ title, subtitle, tone, list, onSelect }) {
  const toneClass =
    tone === 'pending'
      ? 'text-amber-300'
      : tone === 'risk'
      ? 'text-red-300'
      : tone === 'active'
      ? 'text-emerald-300'
      : 'text-cyan-300';

  const pillClass =
    tone === 'pending'
      ? 'bg-amber-500/15 text-amber-200'
      : tone === 'risk'
      ? 'bg-red-500/15 text-red-200'
      : tone === 'active'
      ? 'bg-emerald-500/15 text-emerald-200'
      : 'bg-cyan-500/15 text-cyan-200';

  return (
    <section className="mb-10">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className={`text-2xl font-black tracking-tight ${toneClass}`}>
            {title}
          </h2>
          <p className="mt-1 text-sm text-white/55">{subtitle}</p>
        </div>
        <div className={`rounded-full px-4 py-2 text-sm font-semibold ${pillClass}`}>
          {list.length} registros
        </div>
      </div>

      {list.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-white/10 bg-white/5 px-5 py-8 text-center text-sm text-white/50">
          No hay registros en esta categoría con los filtros actuales.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((w) => (
            <WorkerCard key={w.user_id} worker={w} onSelect={onSelect} />
          ))}
        </div>
      )}
    </section>
  );
}

function WorkerCard({ worker, onSelect }) {
  const status = getWorkerStatus(worker, worker.activeBlock);
  const completionRate = calcCompletionRate(worker.stats);
  const primaryDoc = worker.docs?.[0];
  const riskUi = getRiskUI(worker.docRisk.level);

  return (
    <button
      onClick={() => onSelect(worker)}
      className="group w-full rounded-[28px] border border-white/10 bg-white/[0.05] p-5 text-left shadow-[0_18px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl transition hover:-translate-y-[2px] hover:bg-white/[0.07] active:scale-[0.995]"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <img
            src={worker.avatar_url || '/avatar-fallback.png'}
            alt="avatar"
            className="h-14 w-14 rounded-2xl border border-white/10 object-cover"
          />
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold text-white">
              {worker.full_name || 'Sin nombre'}
            </h3>
            <p className="truncate text-xs text-white/45">
              ID: {worker.user_id?.slice(0, 8)}...
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className={`rounded-full px-3 py-1 text-[11px] font-bold ${status.badge}`}>
            {status.label}
          </div>
          <div className={`rounded-full px-3 py-1 text-[11px] font-bold ${riskUi.badge}`}>
            Riesgo {riskUi.label}
          </div>
        </div>
      </div>

      <div className="mb-3 line-clamp-2 min-h-[40px] text-sm text-white/70">
        {worker.bio || 'Sin descripción cargada.'}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <MiniPill icon={MapPin} label={worker.city || 'Sin ciudad'} />
        <MiniPill icon={Briefcase} label={`${worker.normalizedSkills?.length || 0} oficios`} />
        <MiniPill icon={FileText} label={worker.hasDocs ? 'Con docs' : 'Sin docs'} />
        <MiniPill icon={Banknote} label={worker.hasBank ? 'Banco OK' : 'Sin banco'} />
        {worker.activeBlock ? (
          <MiniPill icon={PauseCircle} label="Bloqueado" />
        ) : null}
      </div>

      <div className="mb-3 grid grid-cols-4 gap-2">
        <StatMini label="Hoy" value={worker.stats?.today || 0} />
        <StatMini label="Mes" value={worker.stats?.month || 0} />
        <StatMini label="Score" value={worker.profileScore || 0} />
        <StatMini label="Comp." value={worker.stats?.completed90 || 0} />
      </div>

      <div className="mb-3">
        <div className="mb-1 flex items-center justify-between text-[11px] text-white/50">
          <span>Eficiencia operativa</span>
          <span>{completionRate}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400"
            style={{ width: `${completionRate}%` }}
          />
        </div>
      </div>

      <div className="mb-3">
        <div className="mb-1 flex items-center justify-between text-[11px] text-white/50">
          <span>Semáforo documental</span>
          <span>{riskUi.label}</span>
        </div>
        <div className="flex gap-2">
          <div className={`h-2 flex-1 rounded-full ${worker.docRisk.level === 'low' ? 'bg-emerald-400' : 'bg-white/10'}`} />
          <div className={`h-2 flex-1 rounded-full ${worker.docRisk.level === 'medium' ? 'bg-amber-400' : 'bg-white/10'}`} />
          <div className={`h-2 flex-1 rounded-full ${worker.docRisk.level === 'high' ? 'bg-red-400' : 'bg-white/10'}`} />
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-white/10 pt-3 text-xs text-white/45">
        <div>
          Cédula:{' '}
          <span className="text-white/70">
            {primaryDoc?.doc_number || 'Sin número'}
          </span>
        </div>
        <div className="flex items-center gap-1 text-emerald-300">
          <Eye className="h-3.5 w-3.5" />
          Ver detalle
        </div>
      </div>
    </button>
  );
}

function MiniPill({ icon: Icon, label }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-white/70">
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

function StatMini({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2">
      <div className="text-[11px] text-white/45">{label}</div>
      <div className="text-lg font-black text-white">{value}</div>
    </div>
  );
}

/* ========================================================= */
/* LOADING */

function LoadingState() {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/5 py-16 text-center backdrop-blur-xl">
      <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-emerald-300" />
      <p className="text-sm text-white/60">Cargando centro de control...</p>
    </div>
  );
}

/* ========================================================= */
/* MODAL */

function WorkerDetailModal({
  worker,
  onClose,
  onVerify,
  onSaveNote,
  onToggleBlock,
  busy,
}) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(null);
  const [jobHistory, setJobHistory] = useState({
    total: 0,
    completed: 0,
    cancelled: 0,
    accepted: 0,
    thisWeek: 0,
    thisMonth: 0,
  });
  const [history, setHistory] = useState([]);
  const [noteInput, setNoteInput] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [blockDays, setBlockDays] = useState('7');

  useEffect(() => {
    if (!worker) return;

    (async () => {
      setLoading(true);
      try {
        const startMonth = new Date();
        startMonth.setDate(1);
        startMonth.setHours(0, 0, 0, 0);

        const startWeek = new Date();
        startWeek.setDate(startWeek.getDate() - 7);

        const [
          { data: profile },
          { data: docs },
          { data: bank },
          { data: jobs },
          { data: adminHistory },
        ] = await Promise.all([
          supabase
            .from('profiles')
            .select('email, full_name, phone, created_at')
            .eq('id', worker.user_id)
            .maybeSingle(),
          supabase
            .from('documents')
            .select('doc_type, doc_number, front_url, back_url, file_url')
            .eq('user_id', worker.user_id),
          supabase
            .from('bank_accounts')
            .select(
              'bank_name, account_type, account_number, holder_name, holder_document'
            )
            .eq('user_id', worker.user_id)
            .maybeSingle(),
          supabase
            .from('jobs')
            .select('status, created_at')
            .eq('worker_id', worker.user_id)
            .order('created_at', { ascending: false }),
          supabase
            .from(ADMIN_HISTORY_TABLE)
            .select('id, action, detail, extra, created_at, admin_id')
            .eq('worker_id', worker.user_id)
            .order('created_at', { ascending: false })
            .limit(20),
        ]);

        const stats = {
          total: 0,
          completed: 0,
          cancelled: 0,
          accepted: 0,
          thisWeek: 0,
          thisMonth: 0,
        };

        for (const j of jobs || []) {
          stats.total += 1;
          if (j.status === 'completed') stats.completed += 1;
          if (j.status === 'cancelled') stats.cancelled += 1;
          if (j.status === 'accepted' || j.status === 'assigned') stats.accepted += 1;

          const createdAt = new Date(j.created_at);
          if (createdAt >= startWeek) stats.thisWeek += 1;
          if (createdAt >= startMonth) stats.thisMonth += 1;
        }

        setJobHistory(stats);
        setDetails({ profile, docs, bank });
        setHistory(adminHistory || []);
      } catch (err) {
        console.error(err);
        toast.error('Error cargando detalles');
      } finally {
        setLoading(false);
      }
    })();
  }, [worker]);

  const skills = normalizeSkills(worker.skills);
  const completionRate = calcCompletionRate(worker.stats);
  const status = getWorkerStatus(worker, worker.activeBlock);
  const riskUi = getRiskUI(worker.docRisk.level);

  const handleCreateNote = async () => {
    const ok = await onSaveNote(worker.user_id, noteInput);
    if (ok) {
      setNoteInput('');
      onClose();
    }
  };

  const handleBlockAction = async () => {
    let endsAt = null;

    if (!worker.activeBlock) {
      const days = Number(blockDays || 0);
      if (days > 0) {
        const date = new Date();
        date.setDate(date.getDate() + days);
        endsAt = date.toISOString();
      }
    }

    await onToggleBlock(worker, {
      reason: blockReason || 'Bloqueo administrativo temporal',
      endsAt,
    });
  };

  return (
    <div className="fixed inset-0 z-[10000] bg-black/70 p-3 backdrop-blur-md md:p-6">
      <div className="mx-auto flex max-h-[92vh] w-full max-w-7xl flex-col overflow-hidden rounded-[32px] border border-white/10 bg-[#07131D] shadow-[0_30px_100px_rgba(0,0,0,0.55)]">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 md:px-6">
          <div>
            <div className="text-xs uppercase tracking-[0.24em] text-emerald-300/80">
              Worker intelligence
            </div>
            <h2 className="mt-1 text-xl font-black text-white md:text-2xl">
              Ficha completa del trabajador
            </h2>
          </div>

          <button
            onClick={onClose}
            className="rounded-2xl border border-white/10 bg-white/5 p-2.5 text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            <XCircle size={22} />
          </button>
        </div>

        {loading ? (
          <div className="py-16 text-center text-white/60">
            <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-emerald-300" />
            Cargando información completa...
          </div>
        ) : (
          <div className="grid flex-1 overflow-y-auto xl:grid-cols-[1.1fr_0.9fr]">
            <div className="border-b border-white/10 p-5 xl:border-b-0 xl:border-r xl:p-6">
              <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center">
                <img
                  src={worker.avatar_url || '/avatar-fallback.png'}
                  className="h-24 w-24 rounded-[26px] border border-white/10 object-cover"
                  alt="avatar"
                />
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h3 className="text-2xl font-black text-white">
                      {worker.full_name || 'Sin nombre'}
                    </h3>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${status.badge}`}>
                      {status.label}
                    </span>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${riskUi.badge}`}>
                      Riesgo {riskUi.label}
                    </span>
                  </div>

                  <div className="grid gap-2 text-sm text-white/70 md:grid-cols-2">
                    <InfoLine icon={Mail} text={details?.profile?.email || 'Sin email'} />
                    <InfoLine icon={Phone} text={details?.profile?.phone || 'Sin número'} />
                    <InfoLine icon={MapPin} text={worker.city || 'No seleccionado'} />
                    <InfoLine
                      icon={Clock3}
                      text={
                        details?.profile?.created_at
                          ? `Registrado: ${new Date(details.profile.created_at).toLocaleString('es-AR')}`
                          : 'Sin fecha de registro'
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <MetricCard label="Trabajos hoy" value={worker.stats?.today || 0} icon={CalendarDays} />
                <MetricCard label="Trabajos mes" value={worker.stats?.month || 0} icon={Activity} />
                <MetricCard label="Completados" value={jobHistory.completed} icon={CheckCircle2} />
                <MetricCard label="Score" value={worker.profileScore || 0} icon={Radar} />
                <MetricCard label="Eficiencia" value={`${completionRate}%`} icon={ShieldCheck} />
              </div>

              <div className="mb-6 rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                <h4 className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-emerald-300/80">
                  Perfil profesional
                </h4>
                <p className="mb-4 text-sm leading-6 text-white/75">
                  {worker.bio || 'Sin descripción profesional.'}
                </p>

                <div>
                  <div className="mb-2 text-sm font-semibold text-white/75">Oficios</div>
                  {skills.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {skills.map((skill, idx) => (
                        <span
                          key={idx}
                          className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-white/45">Sin oficios registrados.</p>
                  )}
                </div>
              </div>

              <div className="mb-6 rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                <h4 className="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-cyan-300/80">
                  Operación y rendimiento
                </h4>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <MetricSoft label="Total histórico" value={jobHistory.total} />
                  <MetricSoft label="Aceptados" value={jobHistory.accepted} />
                  <MetricSoft label="Cancelados" value={jobHistory.cancelled} />
                  <MetricSoft label="Últimos 7 días" value={jobHistory.thisWeek} />
                  <MetricSoft label="Este mes" value={jobHistory.thisMonth} />
                  <MetricSoft
                    label="Ubicación"
                    value={
                      worker.lat && worker.lng
                        ? `${Number(worker.lat).toFixed(4)}, ${Number(worker.lng).toFixed(4)}`
                        : 'Sin GPS'
                    }
                  />
                </div>
              </div>

              <div className="mb-6 rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                <h4 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-red-300/80">
                  <TriangleAlert size={16} />
                  Semáforo de riesgo documental
                </h4>

                <div className="mb-4 flex gap-2">
                  <div className={`h-3 flex-1 rounded-full ${worker.docRisk.level === 'low' ? 'bg-emerald-400' : 'bg-white/10'}`} />
                  <div className={`h-3 flex-1 rounded-full ${worker.docRisk.level === 'medium' ? 'bg-amber-400' : 'bg-white/10'}`} />
                  <div className={`h-3 flex-1 rounded-full ${worker.docRisk.level === 'high' ? 'bg-red-400' : 'bg-white/10'}`} />
                </div>

                <div className={`mb-3 rounded-2xl border px-4 py-3 text-sm ${riskUi.panel}`}>
                  <div className="font-bold">Nivel: {riskUi.label}</div>
                  <div className="mt-1 opacity-90">{worker.docRisk.reason}</div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <CheckRow ok={!!details?.docs?.length} label="Documentación cargada" />
                  <CheckRow ok={!!worker.avatar_url} label="Avatar cargado" />
                  <CheckRow ok={!!worker.city} label="Ciudad configurada" />
                  <CheckRow ok={!!details?.bank} label="Datos bancarios" />
                  <CheckRow ok={skills.length > 0} label="Oficios configurados" />
                  <CheckRow ok={!worker.activeBlock} label="Sin bloqueo activo" />
                </div>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                <h4 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-amber-300/80">
                  <FileText size={16} />
                  Documentos cargados
                </h4>

                {details?.docs?.length ? (
                  <div className="space-y-5">
                    {details.docs.map((d, i) => (
                      <div
                        key={i}
                        className="rounded-[22px] border border-white/10 bg-black/20 p-4"
                      >
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white">
                            {getDocLabel(d.doc_type)}
                          </span>
                          <span className="text-sm text-white/70">
                            Nro: {d.doc_number || 'Sin número'}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-3">
                          {['front_url', 'back_url', 'file_url'].map((key) => {
                            const url = d[key];
                            if (!url) return null;
                            const isPDF = String(url).toLowerCase().includes('.pdf');

                            return (
                              <div
                                key={key}
                                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5"
                              >
                                {isPDF ? (
                                  <iframe src={url} className="h-40 w-32" title={key} />
                                ) : (
                                  <img
                                    src={url}
                                    alt={key}
                                    className="h-40 w-32 cursor-pointer object-cover transition group-hover:scale-[1.04]"
                                    onClick={() => setPreview(url)}
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-white/45">
                    Sin documentos cargados.
                  </div>
                )}
              </div>
            </div>

            <div className="p-5 xl:p-6">
              <div className="mb-4 rounded-[24px] border border-white/10 bg-gradient-to-br from-emerald-500/15 to-cyan-500/10 p-4">
                <h4 className="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-white/85">
                  Estado del perfil
                </h4>

                <div className="space-y-3">
                  <CheckRow ok={!!worker.worker_verified} label="Verificación administrativa" />
                  <CheckRow ok={!!worker.is_active} label="Activo en operación" />
                  <CheckRow ok={!!details?.docs?.length} label="Documentación cargada" />
                  <CheckRow ok={!!details?.bank} label="Datos bancarios" />
                  <CheckRow ok={skills.length > 0} label="Oficios configurados" />
                </div>
              </div>

              <div className="mb-4 rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                <h4 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-white/80">
                  <Building size={16} />
                  Datos bancarios
                </h4>

                {details?.bank ? (
                  <div className="space-y-3 text-sm text-white/75">
                    <InfoBlock label="Banco" value={details.bank.bank_name || 'No informado'} />
                    <InfoBlock label="Tipo de cuenta" value={details.bank.account_type || 'No informado'} />
                    <InfoBlock label="Número de cuenta" value={details.bank.account_number || 'No informado'} />
                    <InfoBlock label="Titular" value={details.bank.holder_name || 'No informado'} />
                    <InfoBlock label="Documento titular" value={details.bank.holder_document || 'No informado'} />
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-white/45">
                    Sin cuenta bancaria cargada.
                  </div>
                )}
              </div>

              <div className="mb-4 rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                <h4 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-white/80">
                  <NotebookPen size={16} />
                  Nota interna del verificador
                </h4>

                <textarea
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  rows={4}
                  placeholder="Escribí observaciones internas del perfil, faltantes, alertas o decisiones..."
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-emerald-400/40"
                />

                <button
                  onClick={handleCreateNote}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-cyan-600"
                >
                  <NotebookPen className="h-4 w-4" />
                  Guardar nota interna
                </button>

                {worker.notes?.length ? (
                  <div className="mt-4 space-y-2">
                    {worker.notes.slice(0, 4).map((n) => (
                      <div
                        key={n.id}
                        className="rounded-2xl border border-white/10 bg-black/20 p-3"
                      >
                        <div className="text-sm text-white/80">{n.note}</div>
                        <div className="mt-1 text-[11px] text-white/40">
                          {n.created_at
                            ? new Date(n.created_at).toLocaleString('es-AR')
                            : 'Sin fecha'}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-white/45">Sin notas internas todavía.</p>
                )}
              </div>

              <div className="mb-4 rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                <h4 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-white/80">
                  <ShieldX size={16} />
                  Bloqueo temporal
                </h4>

                {worker.activeBlock ? (
                  <div className="mb-3 rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-100">
                    <div className="font-bold">Bloqueo activo</div>
                    <div className="mt-1">
                      Motivo: {worker.activeBlock.reason || 'Sin motivo'}
                    </div>
                    <div className="mt-1">
                      Hasta:{' '}
                      {worker.activeBlock.ends_at
                        ? new Date(worker.activeBlock.ends_at).toLocaleString('es-AR')
                        : 'Sin fecha de fin'}
                    </div>
                  </div>
                ) : (
                  <div className="mb-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-100">
                    Sin bloqueo activo.
                  </div>
                )}

                {!worker.activeBlock && (
                  <>
                    <input
                      value={blockReason}
                      onChange={(e) => setBlockReason(e.target.value)}
                      placeholder="Motivo del bloqueo temporal"
                      className="mb-3 h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none placeholder:text-white/30 focus:border-emerald-400/40"
                    />

                    <select
                      value={blockDays}
                      onChange={(e) => setBlockDays(e.target.value)}
                      className="mb-3 h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none focus:border-emerald-400/40"
                    >
                      <option value="1" className="bg-slate-900">1 día</option>
                      <option value="3" className="bg-slate-900">3 días</option>
                      <option value="7" className="bg-slate-900">7 días</option>
                      <option value="15" className="bg-slate-900">15 días</option>
                      <option value="30" className="bg-slate-900">30 días</option>
                      <option value="0" className="bg-slate-900">Sin fecha límite</option>
                    </select>
                  </>
                )}

                <button
                  onClick={handleBlockAction}
                  disabled={busy === worker.user_id}
                  className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-white transition disabled:opacity-60 ${
                    worker.activeBlock
                      ? 'bg-emerald-500 hover:bg-emerald-600'
                      : 'bg-fuchsia-500 hover:bg-fuchsia-600'
                  }`}
                >
                  {worker.activeBlock ? (
                    <>
                      <Unlock className="h-4 w-4" />
                      Levantar bloqueo
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" />
                      Aplicar bloqueo temporal
                    </>
                  )}
                </button>
              </div>

              <div className="mb-4 rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                <h4 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-white/80">
                  <Radar size={16} />
                  Score automático del perfil
                </h4>

                <div className="mb-3 flex items-center justify-between">
                  <div className="text-4xl font-black text-white">{worker.profileScore}</div>
                  <div
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      worker.profileScore >= 85
                        ? 'bg-emerald-500/15 text-emerald-200'
                        : worker.profileScore >= 65
                        ? 'bg-amber-500/15 text-amber-200'
                        : 'bg-red-500/15 text-red-200'
                    }`}
                  >
                    {worker.profileScore >= 85
                      ? 'Perfil premium'
                      : worker.profileScore >= 65
                      ? 'Perfil revisable'
                      : 'Perfil crítico'}
                  </div>
                </div>

                <div className="mb-4 h-3 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-sky-400"
                    style={{ width: `${Math.max(0, Math.min(100, worker.profileScore || 0))}%` }}
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <CheckRow ok={!!details?.docs?.length} label="+ Documentos" />
                  <CheckRow ok={!!details?.bank} label="+ Banco" />
                  <CheckRow ok={skills.length > 0} label="+ Oficios" />
                  <CheckRow ok={!!worker.avatar_url} label="+ Avatar" />
                  <CheckRow ok={(worker.stats?.completed90 || 0) > 0} label="+ Trabajo completado" />
                  <CheckRow ok={!worker.activeBlock} label="- Sin bloqueo" />
                </div>
              </div>

              <div className="mb-4 rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                <h4 className="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-white/80">
                  Acciones rápidas
                </h4>

                <div className="grid gap-3">
                  <button
                    onClick={() => {
                      if (!details?.docs || details.docs.length === 0) {
                        toast.warning(
                          '⚠️ No se puede aprobar un trabajador sin documentos cargados.'
                        );
                        return;
                      }
                      onVerify(worker.user_id, true);
                    }}
                    disabled={busy === worker.user_id}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-600 disabled:opacity-60"
                  >
                    {busy === worker.user_id ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Procesando...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Aprobar y publicar
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => onVerify(worker.user_id, false)}
                    disabled={busy === worker.user_id}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-600 disabled:opacity-60"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    Rechazar y ocultar
                  </button>
                </div>
              </div>

              <div className="mb-4 rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                <h4 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-white/80">
                  <ClipboardList size={16} />
                  Historial de cambios del admin
                </h4>

                {history?.length ? (
                  <div className="space-y-2">
                    {history.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-white/10 bg-black/20 p-3"
                      >
                        <div className="text-sm font-semibold text-white">
                          {humanizeAdminAction(item.action)}
                        </div>
                        <div className="mt-1 text-sm text-white/65">
                          {item.detail || 'Sin detalle'}
                        </div>
                        <div className="mt-1 text-[11px] text-white/40">
                          {item.created_at
                            ? new Date(item.created_at).toLocaleString('es-AR')
                            : 'Sin fecha'}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-white/45">
                    Sin historial de cambios todavía.
                  </div>
                )}
              </div>

              <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                <h4 className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-white/80">
                  Identificación interna
                </h4>
                <div className="space-y-2 text-sm text-white/60">
                  <div className="rounded-2xl bg-black/20 p-3">
                    <span className="text-white/40">User ID:</span>{' '}
                    <span className="break-all text-white/80">{worker.user_id}</span>
                  </div>
                  <div className="rounded-2xl bg-black/20 p-3">
                    <span className="text-white/40">Nombre visible:</span>{' '}
                    <span className="text-white/80">{worker.full_name || 'Sin nombre'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {preview && (
          <div
            className="fixed inset-0 z-[20000] flex items-center justify-center bg-black/80 p-4"
            onClick={() => setPreview(null)}
          >
            <div className="relative max-h-[90vh] max-w-[90vw] rounded-[24px] border border-white/10 bg-[#07131D] p-3 shadow-2xl">
              {String(preview).toLowerCase().includes('.pdf') ? (
                <iframe
                  src={preview}
                  className="h-[80vh] w-[80vw] rounded-[18px]"
                  title="Documento PDF"
                />
              ) : (
                <img
                  src={preview}
                  alt="Documento"
                  className="max-h-[80vh] max-w-[80vw] rounded-[18px] object-contain"
                />
              )}

              <button
                onClick={() => setPreview(null)}
                className="absolute right-3 top-3 rounded-full bg-black/70 p-2 text-white hover:bg-black"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ========================================================= */
/* SUBCOMPONENTES */

function InfoLine({ icon: Icon, text }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
      <Icon className="h-4 w-4 text-emerald-300" />
      <span className="truncate">{text}</span>
    </div>
  );
}

function MetricCard({ label, value, icon: Icon }) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="rounded-xl bg-white/10 p-2">
          <Icon className="h-4 w-4 text-emerald-300" />
        </div>
      </div>
      <div className="text-2xl font-black text-white">{value}</div>
      <div className="text-xs text-white/50">{label}</div>
    </div>
  );
}

function MetricSoft({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
      <div className="text-xs text-white/45">{label}</div>
      <div className="mt-1 text-xl font-black text-white">{value}</div>
    </div>
  );
}

function CheckRow({ ok, label }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
      <span className="text-sm text-white/75">{label}</span>
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
          ok
            ? 'bg-emerald-500/15 text-emerald-200'
            : 'bg-red-500/15 text-red-200'
        }`}
      >
        {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
        {ok ? 'OK' : 'Pendiente'}
      </span>
    </div>
  );
}

function InfoBlock({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
      <div className="text-xs text-white/45">{label}</div>
      <div className="mt-1 font-medium text-white/85">{value}</div>
    </div>
  );
}

/* ========================================================= */
/* HELPERS */

function normalizeSkills(skills) {
  if (!skills) return [];
  if (Array.isArray(skills)) return skills.filter(Boolean);
  if (typeof skills === 'string') {
    return skills
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function getWorkerStatus(worker, activeBlock = null) {
  if (activeBlock) {
    return {
      key: 'blocked',
      label: 'Bloqueado',
      badge: 'bg-fuchsia-500/15 text-fuchsia-200',
    };
  }

  if (worker.worker_verified && worker.is_active) {
    return {
      key: 'active',
      label: 'Activo',
      badge: 'bg-emerald-500/15 text-emerald-200',
    };
  }

  if (!worker.worker_verified) {
    return {
      key: 'pending',
      label: 'Pendiente',
      badge: 'bg-amber-500/15 text-amber-200',
    };
  }

  return {
    key: 'inactive',
    label: 'Inactivo',
    badge: 'bg-red-500/15 text-red-200',
  };
}

function calcCompletionRate(stats) {
  const total = stats?.total90 || 0;
  const completed = stats?.completed90 || 0;
  if (!total) return 0;
  return Math.max(0, Math.min(100, Math.round((completed / total) * 100)));
}

function getDocLabel(type) {
  switch (type) {
    case 'POLICE':
      return 'Antecedente Policial';
    case 'CI':
      return 'Cédula de Identidad';
    case 'DNI':
      return 'Documento Nacional de Identidad';
    case 'PASSPORT':
      return 'Pasaporte';
    default:
      return type || 'Documento';
  }
}

function getDocumentRisk({ docs, hasBank, hasAvatar, hasCity, hasSkills }) {
  const docCount = docs?.length || 0;
  const hasIdentityDoc = (docs || []).some((d) =>
    ['CI', 'DNI', 'PASSPORT'].includes(d.doc_type)
  );

  if (!docCount || !hasIdentityDoc) {
    return {
      level: 'high',
      reason: 'No hay documento principal de identidad cargado.',
    };
  }

  if (!hasBank || !hasAvatar || !hasCity || !hasSkills) {
    return {
      level: 'medium',
      reason: 'El perfil tiene documentación, pero le faltan datos operativos clave.',
    };
  }

  return {
    level: 'low',
    reason: 'El perfil cuenta con documentación y estructura operativa suficiente.',
  };
}

function getRiskUI(level) {
  if (level === 'high') {
    return {
      label: 'ALTO',
      badge: 'bg-red-500/15 text-red-200',
      panel: 'border-red-400/20 bg-red-500/10 text-red-100',
    };
  }
  if (level === 'medium') {
    return {
      label: 'MEDIO',
      badge: 'bg-amber-500/15 text-amber-200',
      panel: 'border-amber-400/20 bg-amber-500/10 text-amber-100',
    };
  }
  return {
    label: 'BAJO',
    badge: 'bg-emerald-500/15 text-emerald-200',
    panel: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100',
  };
}

function riskWeight(level) {
  if (level === 'high') return 3;
  if (level === 'medium') return 2;
  return 1;
}

function calculateProfileScore({
  worker,
  docs,
  stats,
  hasBank,
  normalizedSkills,
  activeBlock,
  docRisk,
}) {
  let score = 0;

  if (worker.full_name) score += 8;
  if (worker.avatar_url) score += 10;
  if (worker.bio) score += 8;
  if (worker.city) score += 8;
  if (normalizedSkills?.length > 0) score += 12;
  if (docs?.length > 0) score += 20;
  if (hasBank) score += 12;
  if (worker.worker_verified) score += 8;
  if (worker.is_active) score += 6;
  if ((stats?.completed90 || 0) > 0) score += 8;
  if ((stats?.month || 0) >= 5) score += 5;
  if (docRisk.level === 'low') score += 5;
  if (docRisk.level === 'medium') score -= 6;
  if (docRisk.level === 'high') score -= 15;
  if (activeBlock) score -= 20;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function humanizeAdminAction(action) {
  switch (action) {
    case 'approve_worker':
      return 'Aprobación de trabajador';
    case 'reject_worker':
      return 'Rechazo de trabajador';
    case 'note_added':
      return 'Nota interna agregada';
    case 'worker_blocked':
      return 'Bloqueo temporal aplicado';
    case 'worker_unblocked':
      return 'Bloqueo temporal levantado';
    default:
      return action || 'Acción administrativa';
  }
}