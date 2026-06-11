'use client';

import { useEffect, useMemo, useState } from 'react';
import { getSupabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
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
  UserRound,
  UserCog,
  LayoutDashboard,
  Network,
  Fingerprint,
  ArrowUpDown,
  MousePointerClick,
  Gauge,
  UserPlus,
  MessageCircle,
  Navigation,
  Layers3,
  Crown,
  BellRing,
} from 'lucide-react';
import '../../globals.css';

const supabase = getSupabase();

const ADMIN_NOTES_TABLE = 'admin_worker_notes';
const ADMIN_HISTORY_TABLE = 'admin_worker_history';
const ADMIN_BLOCKS_TABLE = 'worker_blocks';

const GLASS_PANEL =
  'border border-white/55 bg-white/82 text-[#06182a] shadow-[0_22px_70px_rgba(8,35,52,0.12)] backdrop-blur-2xl';

export default function AdminWorkersPage() {
  const [workers, setWorkers] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [docsFilter, setDocsFilter] = useState('all');
  const [sortBy, setSortBy] = useState('updated_desc');
  const [activeTab, setActiveTab] = useState('command');
  const [directoryType, setDirectoryType] = useState('all');
  const [accessChecked, setAccessChecked] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);

  async function logAdminHistory({ workerId, action, detail = null, extra = null }) {
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
        { data: workerBase, error: workerError },
        { data: profileBase, error: profileError },
        { data: docs, error: docsError },
        { data: jobs, error: jobsError },
        { data: notes, error: notesError },
        { data: blocks, error: blocksError },
      ] = await Promise.all([
        supabase.from('admin_workers_view').select('*').order('updated_at', { ascending: false }),
        supabase
          .from('profiles')
          .select('id, full_name, email, phone, role, admin_role, avatar_url, city, created_at, updated_at, is_verified')
          .order('created_at', { ascending: false }),
        supabase.from('documents').select('user_id, doc_type, doc_number, front_url, back_url, file_url'),
        supabase
          .from('jobs')
          .select('id, client_id, worker_id, status, service, created_at')
          .gte('created_at', since90.toISOString()),
        supabase.from(ADMIN_NOTES_TABLE).select('id, worker_id, note, created_at, admin_id').order('created_at', { ascending: false }),
        supabase
          .from(ADMIN_BLOCKS_TABLE)
          .select('id, worker_id, reason, starts_at, ends_at, is_active, created_at, admin_id')
          .order('created_at', { ascending: false }),
      ]);

      if (workerError) throw workerError;
      if (profileError) throw profileError;
      if (docsError) throw docsError;
      if (jobsError) throw jobsError;
      if (notesError && notesError.code !== 'PGRST116') console.warn(notesError);
      if (blocksError && blocksError.code !== 'PGRST116') console.warn(blocksError);

      const docsByUser = groupBy(docs || [], 'user_id');
      const notesByUser = groupBy(notes || [], 'worker_id');
      const blocksByUser = groupBy(blocks || [], 'worker_id');

      const now = new Date();
      const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const workerJobsByUser = {};
      const clientJobsByUser = {};
      const serviceHeat = {};

      for (const j of jobs || []) {
        const createdAt = new Date(j.created_at);
        const service = j.service || 'Sin rubro';
        serviceHeat[service] = (serviceHeat[service] || 0) + 1;

        if (j.worker_id) {
          if (!workerJobsByUser[j.worker_id]) workerJobsByUser[j.worker_id] = emptyWorkerStats();
          hydrateWorkerStats(workerJobsByUser[j.worker_id], j, createdAt, startToday, startMonth);
        }

        if (j.client_id) {
          if (!clientJobsByUser[j.client_id]) clientJobsByUser[j.client_id] = emptyClientStats();
          hydrateClientStats(clientJobsByUser[j.client_id], j, createdAt, startToday, startMonth);
        }
      }

      const workerIds = new Set((workerBase || []).map((w) => w.user_id).filter(Boolean));

      const enrichedWorkers = (workerBase || []).map((w) => {
        const userDocs = docsByUser[w.user_id] || [];
        const stats = workerJobsByUser[w.user_id] || emptyWorkerStats();
        const hasBank = !!w.bank_name || !!w.account_number || !!w.holder_name || !!w.holder_document;
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

        const profileScore = calculateProfileScore({
          worker: w,
          docs: userDocs,
          stats,
          hasBank,
          normalizedSkills,
          activeBlock,
          docRisk,
        });

        const workerStatus = getWorkerStatus(w, activeBlock);

        return {
          ...w,
          kind: 'worker',
          personLabel: 'Trabajador',
          docs: userDocs,
          notes: notesByUser[w.user_id] || [],
          latestNote,
          blocks: blocksByUser[w.user_id] || [],
          activeBlock: activeBlock || null,
          docNumbers,
          stats,
          hasDocs: userDocs.length > 0,
          hasBank,
          normalizedSkills,
          docRisk,
          profileScore,
          workerStatus,
          searchableText: [
            w.full_name,
            w.city,
            w.bio,
            normalizedSkills.join(' '),
            docNumbers.join(' '),
            w.phone,
            latestNote?.note,
            'trabajador worker proveedor tecnico oficio',
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase(),
        };
      });

      const enrichedClients = (profileBase || [])
        .filter((p) => !workerIds.has(p.id))
        .filter((p) => !['admin', 'superadmin'].includes(p.admin_role || ''))
        .filter((p) => normalizeRole(p.role) !== 'worker' && normalizeRole(p.role) !== 'supplier')
        .map((p) => {
          const stats = clientJobsByUser[p.id] || emptyClientStats();
          const status = getClientStatus(p, stats);
          const score = calculateClientScore(p, stats);

          return {
            ...p,
            user_id: p.id,
            kind: 'client',
            personLabel: 'Cliente',
            stats,
            clientStatus: status,
            profileScore: score,
            searchableText: [
              p.full_name,
              p.email,
              p.phone,
              p.city,
              p.role,
              'cliente usuario comprador servicio solicitud pedido',
            ]
              .filter(Boolean)
              .join(' ')
              .toLowerCase(),
          };
        });

      setWorkers(enrichedWorkers);
      setClients(enrichedClients);
    } catch (err) {
      console.error(err);
      toast.error('⚠️ Error cargando centro de control');
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

      await Promise.all([
        supabase.from('profiles').update({ is_verified: approve }).eq('id', userId),
        supabase.from('worker_profiles').update({ is_active: approve }).eq('user_id', userId),
      ]);

      await logAdminHistory({
        workerId: userId,
        action: approve ? 'approve_worker' : 'reject_worker',
        detail: approve ? 'Trabajador aprobado y publicado' : 'Trabajador rechazado y ocultado',
      });

      toast.success(approve ? '✅ Trabajador aprobado y publicado en el mapa' : '❌ Trabajador rechazado y ocultado');
      await fetchAll();
      setSelectedWorker(null);
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
          .update({ is_active: false, ends_at: new Date().toISOString() })
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
      setSelectedWorker(null);
    } catch (err) {
      console.error(err);
      toast.error('No se pudo actualizar el bloqueo');
    } finally {
      setBusy(null);
    }
  }

  const combined = useMemo(() => [...workers, ...clients], [workers, clients]);

  const cities = useMemo(() => {
    const set = new Set(combined.map((item) => item.city).filter(Boolean));
    return ['all', ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [combined]);

  const filteredWorkers = useMemo(() => {
    let list = filterBaseList(workers, { query, cityFilter, sortBy });

    if (statusFilter !== 'all') list = list.filter((w) => w.workerStatus.key === statusFilter);
    if (docsFilter === 'with_docs') list = list.filter((w) => w.hasDocs);
    if (docsFilter === 'without_docs') list = list.filter((w) => !w.hasDocs);
    if (docsFilter === 'risk_high') list = list.filter((w) => w.docRisk.level === 'high');
    if (docsFilter === 'risk_medium') list = list.filter((w) => w.docRisk.level === 'medium');
    if (docsFilter === 'risk_low') list = list.filter((w) => w.docRisk.level === 'low');

    return sortPeople(list, sortBy);
  }, [workers, query, statusFilter, cityFilter, docsFilter, sortBy]);

  const filteredClients = useMemo(() => {
    let list = filterBaseList(clients, { query, cityFilter, sortBy });
    if (statusFilter === 'active') list = list.filter((c) => c.clientStatus.key === 'active');
    if (statusFilter === 'pending') list = list.filter((c) => c.clientStatus.key === 'new');
    if (statusFilter === 'inactive') list = list.filter((c) => c.clientStatus.key === 'silent');
    return sortPeople(list, sortBy);
  }, [clients, query, statusFilter, cityFilter, sortBy]);

  const filteredDirectory = useMemo(() => {
    if (directoryType === 'workers') return filteredWorkers;
    if (directoryType === 'clients') return filteredClients;
    return sortPeople([...filteredWorkers, ...filteredClients], sortBy);
  }, [directoryType, filteredWorkers, filteredClients, sortBy]);

  const pending = filteredWorkers.filter((w) => !w.worker_verified || !w.is_active);
  const verified = filteredWorkers.filter((w) => w.worker_verified && w.is_active && !w.activeBlock);
  const risky = filteredWorkers.filter((w) => w.docRisk.level !== 'low' || !!w.activeBlock);
  const hotClients = filteredClients.filter((c) => (c.stats?.total90 || 0) > 0);

  const dashboard = useMemo(() => {
    const totalWorkers = workers.length;
    const totalClients = clients.length;
    const activeWorkers = workers.filter((w) => w.worker_verified && w.is_active && !w.activeBlock).length;
    const pendingWorkers = workers.filter((w) => !w.worker_verified || !w.is_active).length;
    const highRisk = workers.filter((w) => w.docRisk.level === 'high').length;
    const blocked = workers.filter((w) => !!w.activeBlock).length;
    const clientsWithOrders = clients.filter((c) => (c.stats?.total90 || 0) > 0).length;
    const totalToday = workers.reduce((acc, w) => acc + (w.stats?.today || 0), 0);
    const clientToday = clients.reduce((acc, c) => acc + (c.stats?.today || 0), 0);
    const totalMonth = workers.reduce((acc, w) => acc + (w.stats?.month || 0), 0);
    const clientMonth = clients.reduce((acc, c) => acc + (c.stats?.month || 0), 0);
    const avgScore = totalWorkers ? Math.round(workers.reduce((acc, w) => acc + (w.profileScore || 0), 0) / totalWorkers) : 0;
    const conversion = totalClients ? Math.round((clientsWithOrders / totalClients) * 100) : 0;

    return {
      totalWorkers,
      totalClients,
      totalUsers: totalWorkers + totalClients,
      activeWorkers,
      pendingWorkers,
      highRisk,
      blocked,
      clientsWithOrders,
      totalToday,
      clientToday,
      totalMonth,
      clientMonth,
      avgScore,
      conversion,
    };
  }, [workers, clients]);

  const currentTabList = useMemo(() => {
    if (activeTab === 'workers') return filteredWorkers;
    if (activeTab === 'clients') return filteredClients;
    if (activeTab === 'pending') return pending;
    if (activeTab === 'active') return verified;
    if (activeTab === 'risk') return risky;
    if (activeTab === 'directory') return filteredDirectory;
    return filteredDirectory;
  }, [activeTab, filteredWorkers, filteredClients, pending, verified, risky, filteredDirectory]);

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

  if (!hasAccess) return null;

  return (
    <div className="min-h-screen bg-[#69c4c0] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(255,255,255,0.42),transparent_30%),radial-gradient(circle_at_84%_12%,rgba(255,255,255,0.22),transparent_28%)]" />
        <div className="absolute left-[-8%] top-[18%] h-[420px] w-[420px] rounded-full bg-white/20 blur-3xl" />
        <div className="absolute bottom-[-14%] left-[14%] h-96 w-96 rounded-full bg-[#06182a]/14 blur-3xl" />
        <div className="absolute right-[-8%] top-[28%] h-[460px] w-[460px] rounded-full bg-[#06182a]/18 blur-3xl" />
      </div>

      <main className="relative z-10 mx-auto max-w-7xl px-4 py-6 md:px-6 lg:px-8">
        <Header onRefresh={fetchAll} />
        <CommandStrip dashboard={dashboard} />
        <DashboardCards dashboard={dashboard} />
        <TechnologyRail dashboard={dashboard} />
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
          directoryType={directoryType}
          setDirectoryType={setDirectoryType}
        />

        {loading ? (
          <LoadingState />
        ) : (
          <>
            {activeTab === 'command' && (
              <CommandCenter
                workers={filteredWorkers.slice(0, 6)}
                clients={filteredClients.slice(0, 6)}
                onSelectWorker={setSelectedWorker}
                onSelectClient={setSelectedClient}
              />
            )}

            {activeTab === 'directory' && (
              <PeopleSection
                title="Directorio inteligente"
                subtitle="Clientes y trabajadores separados por tipo, ordenados por actividad, riesgo y score"
                list={currentTabList}
                onSelectWorker={setSelectedWorker}
                onSelectClient={setSelectedClient}
              />
            )}

            {activeTab === 'clients' && (
              <PeopleSection
                title="Clientes registrados"
                subtitle="Personas que entraron como cliente, con actividad, pedidos y estado comercial"
                list={currentTabList}
                onSelectWorker={setSelectedWorker}
                onSelectClient={setSelectedClient}
              />
            )}

            {activeTab === 'workers' && (
              <PeopleSection
                title="Trabajadores registrados"
                subtitle="Trabajadores separados del cliente, con verificación, documentos, score y operación"
                list={currentTabList}
                onSelectWorker={setSelectedWorker}
                onSelectClient={setSelectedClient}
              />
            )}

            {activeTab === 'pending' && (
              <PeopleSection
                title="Pendientes de control"
                subtitle="Trabajadores no aprobados, incompletos o inactivos"
                list={currentTabList}
                onSelectWorker={setSelectedWorker}
                onSelectClient={setSelectedClient}
              />
            )}

            {activeTab === 'active' && (
              <PeopleSection
                title="Activos y aprobados"
                subtitle="Trabajadores visibles, operativos y sin bloqueo"
                list={currentTabList}
                onSelectWorker={setSelectedWorker}
                onSelectClient={setSelectedClient}
              />
            )}

            {activeTab === 'risk' && (
              <PeopleSection
                title="Riesgo y revisión"
                subtitle="Perfiles con documentos incompletos, score bajo o bloqueos administrativos"
                list={currentTabList}
                onSelectWorker={setSelectedWorker}
                onSelectClient={setSelectedClient}
              />
            )}
          </>
        )}
      </main>

      <footer className="relative z-10 border-t border-white/10 bg-black/20 px-6 py-4 text-center text-xs text-white/65 backdrop-blur">
        © {new Date().getFullYear()} <span className="font-semibold text-emerald-200">ManosYA</span> · Centro corporativo de conexiones
      </footer>

      {selectedWorker && (
        <WorkerDetailModal
          worker={selectedWorker}
          onClose={() => setSelectedWorker(null)}
          onVerify={handleVerify}
          onSaveNote={handleSaveNote}
          onToggleBlock={handleToggleBlock}
          busy={busy}
        />
      )}

      {selectedClient && <ClientDetailModal client={selectedClient} onClose={() => setSelectedClient(null)} />}
    </div>
  );
}

function Header({ onRefresh }) {
  return (
    <div className={`mb-6 overflow-hidden rounded-[34px] p-5 ${GLASS_PANEL}`}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-5 md:flex-row md:items-center">
          <div className="relative flex h-[90px] w-[168px] shrink-0 items-center justify-center rounded-[30px] bg-[#69c4c0] shadow-[0_18px_38px_rgba(105,196,192,0.25)]">
            <div className="absolute inset-2 rounded-[24px] border border-white/35" />
            <img src="/logo-manosya.png" alt="ManosYA" className="relative h-12 w-auto object-contain" />
          </div>

          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#69c4c0]/35 bg-[#69c4c0]/12 px-3 py-1 text-xs font-black text-[#137d78]">
              <Sparkles className="h-3.5 w-3.5" />
              Centro de inteligencia ManosYA
            </div>
            <h1 className="text-3xl font-black tracking-[-0.055em] text-[#06182a] md:text-5xl">
              Personas, pedidos y confianza
            </h1>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-relaxed text-slate-600 md:text-base">
              Separá clientes de trabajadores, ordená por actividad, detectá riesgo y conectá mejor al equipo interno con la operación.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:flex-col lg:items-end">
          <div className="flex items-center gap-3 rounded-[26px] border border-[#69c4c0]/25 bg-[#69c4c0]/10 p-3">
            <motion.div
              animate={{ y: [0, -5, 0], rotate: [0, -1.5, 1.5, 0] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
              className="relative flex h-16 w-16 shrink-0 items-end justify-center overflow-hidden rounded-2xl bg-[#69c4c0]"
            >
              <img src="/ROGER SALUDANDO.png" alt="Roger ManosYA" className="h-[78px] w-auto object-contain" />
            </motion.div>
            <div>
              <div className="text-sm font-black text-[#06182a]">Roger</div>
              <div className="text-xs font-bold text-[#137d78]">Centro de mando activo</div>
            </div>
          </div>

          <button
            onClick={onRefresh}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#06182a] px-5 py-3 text-sm font-black text-white shadow-[0_16px_34px_rgba(6,24,42,0.18)] transition hover:-translate-y-0.5 hover:bg-[#0a263f] active:scale-[0.99]"
          >
            <RefreshCw size={16} />
            Refrescar centro
          </button>
        </div>
      </div>
    </div>
  );
}

function CommandStrip({ dashboard }) {
  return (
    <div className="mb-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr_0.8fr]">
      <div className={`rounded-[30px] p-5 ${GLASS_PANEL}`}>
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-2xl bg-[#06182a] p-3 text-white">
            <Network className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-black text-[#06182a]">Mapa de conexiones</div>
            <div className="text-xs font-bold text-slate-500">Clientes → pedidos → trabajadores → verificación</div>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <SignalBox label="Usuarios" value={dashboard.totalUsers} />
          <SignalBox label="Conversión cliente" value={`${dashboard.conversion}%`} />
          <SignalBox label="Score worker" value={dashboard.avgScore} />
        </div>
      </div>

      <InsightCard icon={BellRing} title="Atención comercial" value={dashboard.clientsWithOrders} label="clientes con pedidos" />
      <InsightCard icon={Crown} title="Operación visible" value={dashboard.activeWorkers} label="trabajadores activos" />
    </div>
  );
}

function SignalBox({ label, value }) {
  return (
    <div className="rounded-2xl border border-[#69c4c0]/25 bg-[#69c4c0]/10 p-4">
      <div className="text-xs font-bold text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-black text-[#06182a]">{value}</div>
    </div>
  );
}

function InsightCard({ icon: Icon, title, value, label }) {
  return (
    <div className={`rounded-[30px] p-5 ${GLASS_PANEL}`}>
      <div className="mb-5 flex items-center justify-between">
        <div className="rounded-2xl bg-[#69c4c0]/15 p-3">
          <Icon className="h-5 w-5 text-[#137d78]" />
        </div>
        <div className="h-2.5 w-2.5 rounded-full bg-[#62bfb9] shadow-[0_0_18px_rgba(98,191,185,0.8)]" />
      </div>
      <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{title}</div>
      <div className="mt-1 text-3xl font-black text-[#06182a]">{value}</div>
      <div className="mt-1 text-sm font-bold text-slate-500">{label}</div>
    </div>
  );
}

function DashboardCards({ dashboard }) {
  const cards = [
    { label: 'Usuarios totales', value: dashboard.totalUsers, icon: Users },
    { label: 'Clientes', value: dashboard.totalClients, icon: UserRound },
    { label: 'Trabajadores', value: dashboard.totalWorkers, icon: UserCog },
    { label: 'Activos', value: dashboard.activeWorkers, icon: BadgeCheck },
    { label: 'Pendientes', value: dashboard.pendingWorkers, icon: ShieldAlert },
    { label: 'Riesgo alto', value: dashboard.highRisk, icon: TriangleAlert },
    { label: 'Pedidos hoy', value: dashboard.clientToday, icon: MousePointerClick },
    { label: 'Trabajos mes', value: dashboard.totalMonth, icon: Activity },
  ];

  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.label} className={`rounded-[28px] p-5 ${GLASS_PANEL}`}>
            <div className="mb-4 flex items-center justify-between">
              <div className="rounded-2xl border border-[#69c4c0]/25 bg-[#69c4c0]/15 p-3">
                <Icon className="h-5 w-5 text-[#137d78]" />
              </div>
              <ChevronRight className="h-4 w-4 text-slate-300" />
            </div>
            <div className="text-3xl font-black tracking-tight text-[#06182a]">{card.value}</div>
            <div className="mt-1 text-sm font-bold text-slate-500">{card.label}</div>
          </div>
        );
      })}
    </div>
  );
}

function TechnologyRail({ dashboard }) {
  const chips = [
    ['Separación inteligente', 'Cliente y trabajador ya no se mezclan'],
    ['Score operativo', `${dashboard.avgScore}/100 promedio worker`],
    ['Radar comercial', `${dashboard.clientsWithOrders} clientes con intención real`],
    ['Riesgo documental', `${dashboard.highRisk} requieren revisión fuerte`],
  ];

  return (
    <div className="mb-6 rounded-[28px] border border-white/55 bg-[#06182a]/88 p-4 shadow-[0_20px_54px_rgba(8,35,52,0.16)] backdrop-blur-xl">
      <div className="grid gap-3 md:grid-cols-4">
        {chips.map(([title, text]) => (
          <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[#9af7ef]">
              <Gauge className="h-3.5 w-3.5" />
              {title}
            </div>
            <div className="text-sm font-semibold text-white/70">{text}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TabsBar({ activeTab, setActiveTab, dashboard }) {
  const tabs = [
    { key: 'command', label: 'Comando', icon: LayoutDashboard, count: dashboard.totalUsers },
    { key: 'directory', label: 'Directorio', icon: ClipboardList, count: dashboard.totalUsers },
    { key: 'clients', label: 'Clientes', icon: UserRound, count: dashboard.totalClients },
    { key: 'workers', label: 'Trabajadores', icon: UserCog, count: dashboard.totalWorkers },
    { key: 'pending', label: 'Pendientes', icon: Clock3, count: dashboard.pendingWorkers },
    { key: 'active', label: 'Activos', icon: CheckCheck, count: dashboard.activeWorkers },
    { key: 'risk', label: 'Riesgo', icon: TriangleAlert, count: dashboard.highRisk + dashboard.blocked },
  ];

  return (
    <div className="mb-6 rounded-[28px] border border-white/55 bg-white/76 p-3 text-[#06182a] shadow-[0_20px_54px_rgba(8,35,52,0.12)] backdrop-blur-xl">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center justify-between rounded-2xl px-4 py-4 text-left transition ${
                active ? 'border border-[#69c4c0]/35 bg-[#69c4c0]/18 shadow-[0_12px_30px_rgba(98,191,185,0.16)]' : 'border border-slate-200/70 bg-white/65 hover:bg-white'
              }`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="rounded-xl bg-[#69c4c0]/15 p-2">
                  <Icon className="h-4 w-4 text-[#137d78]" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-black text-[#06182a]">{tab.label}</div>
                  <div className="text-xs font-semibold text-slate-500">Vista</div>
                </div>
              </div>
              <div className="rounded-full bg-[#06182a] px-2.5 py-1 text-xs font-black text-white">{tab.count}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

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
  directoryType,
  setDirectoryType,
}) {
  return (
    <div className="mb-8 rounded-[28px] border border-white/55 bg-white/76 p-4 text-[#06182a] shadow-[0_20px_54px_rgba(8,35,52,0.12)] backdrop-blur-xl">
      <div className="grid gap-3 lg:grid-cols-[1.8fr_repeat(5,1fr)]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#137d78]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, teléfono, ciudad, email, cédula, oficio o nota..."
            className="h-12 w-full rounded-2xl border border-slate-200/80 bg-white/75 pl-11 pr-4 text-sm font-semibold text-[#06182a] outline-none placeholder:text-slate-400 focus:border-[#62bfb9]"
          />
        </div>

        <SelectBox icon={Layers3} value={directoryType} onChange={setDirectoryType} options={[
          ['all', 'Todos'],
          ['clients', 'Solo clientes'],
          ['workers', 'Solo trabajadores'],
        ]} />

        <SelectBox icon={Filter} value={statusFilter} onChange={setStatusFilter} options={[
          ['all', 'Estado: todos'],
          ['active', 'Activos'],
          ['pending', 'Pendientes/Nuevos'],
          ['inactive', 'Inactivos'],
          ['blocked', 'Bloqueados'],
        ]} />

        <SelectBox icon={MapPin} value={cityFilter} onChange={setCityFilter} options={cities.map((c) => [c, c === 'all' ? 'Todas las ciudades' : c])} />

        <SelectBox icon={ScanLine} value={docsFilter} onChange={setDocsFilter} options={[
          ['all', 'Docs: todos'],
          ['with_docs', 'Con documentos'],
          ['without_docs', 'Sin documentos'],
          ['risk_high', 'Riesgo alto'],
          ['risk_medium', 'Riesgo medio'],
          ['risk_low', 'Riesgo bajo'],
        ]} />

        <SelectBox icon={ArrowUpDown} value={sortBy} onChange={setSortBy} options={[
          ['updated_desc', 'Última actividad'],
          ['created_desc', 'Registro reciente'],
          ['name_asc', 'Nombre A-Z'],
          ['jobs_today_desc', 'Más hoy'],
          ['jobs_month_desc', 'Más mes'],
          ['completed_desc', 'Más completados'],
          ['score_desc', 'Mayor score'],
          ['risk_desc', 'Mayor riesgo'],
        ]} />
      </div>
    </div>
  );
}

function SelectBox({ icon: Icon, value, onChange, options }) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#137d78]" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 w-full appearance-none rounded-2xl border border-slate-200/80 bg-white/75 pl-11 pr-4 text-sm font-semibold text-[#06182a] outline-none focus:border-[#62bfb9]"
      >
        {options.map(([val, label]) => (
          <option key={val} value={val} className="bg-white text-[#06182a]">
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}

function CommandCenter({ workers, clients, onSelectWorker, onSelectClient }) {
  return (
    <section className="mb-10 grid gap-6 xl:grid-cols-2">
      <CommandColumn
        title="Clientes que entraron"
        subtitle="Identificación limpia de personas que vinieron a pedir servicio"
        icon={UserRound}
        list={clients}
        empty="No hay clientes con estos filtros."
        render={(item) => <ClientCompactCard key={item.user_id} client={item} onSelect={onSelectClient} />}
      />
      <CommandColumn
        title="Trabajadores operativos"
        subtitle="Separados del cliente, listos para revisar, aprobar o bloquear"
        icon={UserCog}
        list={workers}
        empty="No hay trabajadores con estos filtros."
        render={(item) => <WorkerCompactCard key={item.user_id} worker={item} onSelect={onSelectWorker} />}
      />
    </section>
  );
}

function CommandColumn({ title, subtitle, icon: Icon, list, empty, render }) {
  return (
    <div className="rounded-[30px] border border-white/10 bg-[#06182a]/88 p-5 shadow-[0_24px_70px_rgba(6,24,42,0.20)] backdrop-blur-xl">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#62bfb9]/25 bg-[#62bfb9]/10 px-3 py-1 text-xs font-black text-[#9af7ef]">
            <Icon className="h-3.5 w-3.5" />
            {list.length} registros
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white">{title}</h2>
          <p className="mt-1 text-sm text-white/55">{subtitle}</p>
        </div>
      </div>

      {list.length ? <div className="space-y-3">{list.map(render)}</div> : <EmptyState text={empty} />}
    </div>
  );
}

function PeopleSection({ title, subtitle, list, onSelectWorker, onSelectClient }) {
  return (
    <section className="mb-10">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-white">{title}</h2>
          <p className="mt-1 text-sm text-white/60">{subtitle}</p>
        </div>
        <div className="rounded-full bg-white/20 px-4 py-2 text-sm font-black text-white">{list.length} registros</div>
      </div>

      {list.length === 0 ? (
        <EmptyState text="No hay registros en esta categoría con los filtros actuales." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((item) =>
            item.kind === 'client' ? (
              <ClientCard key={`client-${item.user_id}`} client={item} onSelect={onSelectClient} />
            ) : (
              <WorkerCard key={`worker-${item.user_id}`} worker={item} onSelect={onSelectWorker} />
            )
          )}
        </div>
      )}
    </section>
  );
}

function WorkerCompactCard({ worker, onSelect }) {
  const status = getWorkerStatus(worker, worker.activeBlock);
  return (
    <button onClick={() => onSelect(worker)} className="flex w-full items-center gap-3 rounded-[24px] border border-white/10 bg-white/[0.05] p-3 text-left transition hover:bg-white/[0.08]">
      <img src={worker.avatar_url || '/avatar-fallback.png'} alt="avatar" className="h-14 w-14 rounded-2xl object-cover" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-black text-white">{worker.full_name || 'Sin nombre'}</div>
        <div className="truncate text-xs text-white/45">{worker.normalizedSkills?.join(', ') || 'Sin oficio'}</div>
      </div>
      <div className="text-right">
        <div className={`rounded-full px-3 py-1 text-[11px] font-bold ${status.badge}`}>{status.label}</div>
        <div className="mt-1 text-xs font-bold text-white/50">Score {worker.profileScore}</div>
      </div>
    </button>
  );
}

function ClientCompactCard({ client, onSelect }) {
  const status = client.clientStatus;
  return (
    <button onClick={() => onSelect(client)} className="flex w-full items-center gap-3 rounded-[24px] border border-white/10 bg-white/[0.05] p-3 text-left transition hover:bg-white/[0.08]">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#62bfb9]/15 text-[#9af7ef]">
        <UserRound className="h-6 w-6" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-black text-white">{client.full_name || client.email || 'Cliente sin nombre'}</div>
        <div className="truncate text-xs text-white/45">{client.phone || client.city || 'Sin contacto visible'}</div>
      </div>
      <div className="text-right">
        <div className={`rounded-full px-3 py-1 text-[11px] font-bold ${status.badge}`}>{status.label}</div>
        <div className="mt-1 text-xs font-bold text-white/50">Pedidos {client.stats?.total90 || 0}</div>
      </div>
    </button>
  );
}

function WorkerCard({ worker, onSelect }) {
  const status = getWorkerStatus(worker, worker.activeBlock);
  const completionRate = calcCompletionRate(worker.stats);
  const primaryDoc = worker.docs?.[0];
  const riskUi = getRiskUI(worker.docRisk.level);

  return (
    <button onClick={() => onSelect(worker)} className="group w-full rounded-[28px] border border-white/10 bg-[#06182a]/80 p-5 text-left shadow-[0_18px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl transition hover:-translate-y-[2px] hover:bg-[#06182a]/88 active:scale-[0.995]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <img src={worker.avatar_url || '/avatar-fallback.png'} alt="avatar" className="h-14 w-14 rounded-2xl border border-white/10 object-cover" />
          <div className="min-w-0">
            <div className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-black text-emerald-200">
              <UserCog className="h-3 w-3" /> Trabajador
            </div>
            <h3 className="truncate text-base font-bold text-white">{worker.full_name || 'Sin nombre'}</h3>
            <p className="truncate text-xs text-white/45">ID: {worker.user_id?.slice(0, 8)}...</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className={`rounded-full px-3 py-1 text-[11px] font-bold ${status.badge}`}>{status.label}</div>
          <div className={`rounded-full px-3 py-1 text-[11px] font-bold ${riskUi.badge}`}>Riesgo {riskUi.label}</div>
        </div>
      </div>

      <div className="mb-3 line-clamp-2 min-h-[40px] text-sm text-white/70">{worker.bio || 'Sin descripción cargada.'}</div>
      <div className="mb-4 flex flex-wrap gap-2">
        <MiniPill icon={MapPin} label={worker.city || 'Sin ciudad'} />
        <MiniPill icon={Briefcase} label={`${worker.normalizedSkills?.length || 0} oficios`} />
        <MiniPill icon={FileText} label={worker.hasDocs ? 'Con docs' : 'Sin docs'} />
        <MiniPill icon={Banknote} label={worker.hasBank ? 'Banco OK' : 'Sin banco'} />
        {worker.activeBlock ? <MiniPill icon={PauseCircle} label="Bloqueado" /> : null}
      </div>

      <div className="mb-3 grid grid-cols-4 gap-2">
        <StatMini label="Hoy" value={worker.stats?.today || 0} />
        <StatMini label="Mes" value={worker.stats?.month || 0} />
        <StatMini label="Score" value={worker.profileScore || 0} />
        <StatMini label="Comp." value={worker.stats?.completed90 || 0} />
      </div>

      <ProgressLine label="Eficiencia operativa" value={completionRate} />
      <RiskDots level={worker.docRisk.level} />

      <div className="flex items-center justify-between border-t border-white/10 pt-3 text-xs text-white/45">
        <div>Cédula: <span className="text-white/70">{primaryDoc?.doc_number || 'Sin número'}</span></div>
        <div className="flex items-center gap-1 text-emerald-300"><Eye className="h-3.5 w-3.5" /> Ver detalle</div>
      </div>
    </button>
  );
}

function ClientCard({ client, onSelect }) {
  const status = client.clientStatus;
  const firstLetter = (client.full_name || client.email || 'C').slice(0, 1).toUpperCase();

  return (
    <button onClick={() => onSelect(client)} className="group w-full rounded-[28px] border border-white/10 bg-white/88 p-5 text-left text-[#06182a] shadow-[0_18px_60px_rgba(8,35,52,0.16)] backdrop-blur-xl transition hover:-translate-y-[2px] hover:bg-white active:scale-[0.995]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#69c4c0]/18 text-xl font-black text-[#137d78]">
            {client.avatar_url ? <img src={client.avatar_url} alt="avatar" className="h-full w-full rounded-2xl object-cover" /> : firstLetter}
          </div>
          <div className="min-w-0">
            <div className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-[#69c4c0]/25 bg-[#69c4c0]/12 px-2 py-0.5 text-[10px] font-black text-[#137d78]">
              <UserRound className="h-3 w-3" /> Cliente
            </div>
            <h3 className="truncate text-base font-black text-[#06182a]">{client.full_name || 'Cliente sin nombre'}</h3>
            <p className="truncate text-xs font-semibold text-slate-500">{client.email || 'Sin email'}</p>
          </div>
        </div>
        <div className={`rounded-full px-3 py-1 text-[11px] font-bold ${status.lightBadge}`}>{status.label}</div>
      </div>

      <div className="mb-4 grid gap-2 text-sm font-semibold text-slate-600">
        <InfoLite icon={Phone} text={client.phone || 'Sin teléfono'} />
        <InfoLite icon={MapPin} text={client.city || 'Sin ciudad'} />
        <InfoLite icon={CalendarDays} text={client.created_at ? `Entró: ${new Date(client.created_at).toLocaleDateString('es-AR')}` : 'Sin fecha'} />
      </div>

      <div className="mb-3 grid grid-cols-4 gap-2">
        <StatMiniLight label="Hoy" value={client.stats?.today || 0} />
        <StatMiniLight label="Mes" value={client.stats?.month || 0} />
        <StatMiniLight label="Total" value={client.stats?.total90 || 0} />
        <StatMiniLight label="Score" value={client.profileScore || 0} />
      </div>

      <ProgressLineDark label="Intención comercial" value={client.profileScore || 0} />

      <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-xs font-bold text-slate-500">
        <span>ID: {client.user_id?.slice(0, 8)}...</span>
        <span className="flex items-center gap-1 text-[#137d78]"><Eye className="h-3.5 w-3.5" /> Ver ficha</span>
      </div>
    </button>
  );
}

function MiniPill({ icon: Icon, label }) {
  return <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-white/70"><Icon className="h-3.5 w-3.5" />{label}</span>;
}

function StatMini({ label, value }) {
  return <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2"><div className="text-[11px] text-white/45">{label}</div><div className="text-lg font-black text-white">{value}</div></div>;
}

function StatMiniLight({ label, value }) {
  return <div className="rounded-2xl border border-slate-200 bg-white/75 px-3 py-2"><div className="text-[11px] font-bold text-slate-400">{label}</div><div className="text-lg font-black text-[#06182a]">{value}</div></div>;
}

function ProgressLine({ label, value }) {
  return (
    <div className="mb-3">
      <div className="mb-1 flex items-center justify-between text-[11px] text-white/50"><span>{label}</span><span>{value}%</span></div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400" style={{ width: `${value}%` }} /></div>
    </div>
  );
}

function ProgressLineDark({ label, value }) {
  return (
    <div className="mb-3">
      <div className="mb-1 flex items-center justify-between text-[11px] font-bold text-slate-500"><span>{label}</span><span>{value}%</span></div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-[#69c4c0]" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>
    </div>
  );
}

function RiskDots({ level }) {
  const riskUi = getRiskUI(level);
  return (
    <div className="mb-3">
      <div className="mb-1 flex items-center justify-between text-[11px] text-white/50"><span>Semáforo documental</span><span>{riskUi.label}</span></div>
      <div className="flex gap-2">
        <div className={`h-2 flex-1 rounded-full ${level === 'low' ? 'bg-emerald-400' : 'bg-white/10'}`} />
        <div className={`h-2 flex-1 rounded-full ${level === 'medium' ? 'bg-amber-400' : 'bg-white/10'}`} />
        <div className={`h-2 flex-1 rounded-full ${level === 'high' ? 'bg-red-400' : 'bg-white/10'}`} />
      </div>
    </div>
  );
}

function InfoLite({ icon: Icon, text }) {
  return <div className="flex items-center gap-2"><Icon className="h-4 w-4 text-[#137d78]" /><span className="truncate">{text}</span></div>;
}

function LoadingState() {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/5 py-16 text-center backdrop-blur-xl">
      <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-emerald-300" />
      <p className="text-sm text-white/60">Cargando centro de control...</p>
    </div>
  );
}

function EmptyState({ text }) {
  return <div className="rounded-[24px] border border-dashed border-white/15 bg-white/5 px-5 py-8 text-center text-sm text-white/55">{text}</div>;
}

function ClientDetailModal({ client, onClose }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!client) return;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('jobs')
          .select('id, service, status, created_at, worker_id')
          .eq('client_id', client.user_id)
          .order('created_at', { ascending: false })
          .limit(30);
        if (error) throw error;
        setJobs(data || []);
      } catch (err) {
        console.error(err);
        toast.error('No se pudo cargar actividad del cliente');
      } finally {
        setLoading(false);
      }
    })();
  }, [client]);

  return (
    <div className="fixed inset-0 z-[10000] bg-black/70 p-3 backdrop-blur-md md:p-6">
      <div className="mx-auto max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-[32px] border border-white/10 bg-[#07131D] shadow-[0_30px_100px_rgba(0,0,0,0.55)]">
        <ModalHeader title="Ficha completa del cliente" eyebrow="Client intelligence" onClose={onClose} />
        <div className="max-h-[78vh] overflow-y-auto p-5 md:p-6">
          <div className="mb-6 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-5">
              <div className="mb-4 flex items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-[26px] bg-[#62bfb9]/15 text-3xl font-black text-[#9af7ef]">
                  {(client.full_name || client.email || 'C').slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h3 className="truncate text-2xl font-black text-white">{client.full_name || 'Cliente sin nombre'}</h3>
                  <div className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-bold ${client.clientStatus.badge}`}>{client.clientStatus.label}</div>
                </div>
              </div>
              <div className="grid gap-3 text-sm text-white/75">
                <InfoLine icon={Mail} text={client.email || 'Sin email'} />
                <InfoLine icon={Phone} text={client.phone || 'Sin teléfono'} />
                <InfoLine icon={MapPin} text={client.city || 'Sin ciudad'} />
                <InfoLine icon={Fingerprint} text={client.user_id} />
              </div>
            </div>

            <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-5">
              <h4 className="mb-4 text-sm font-black uppercase tracking-[0.18em] text-[#9af7ef]">Actividad comercial</h4>
              <div className="grid gap-3 sm:grid-cols-3">
                <MetricCard label="Pedidos 90 días" value={client.stats?.total90 || 0} icon={ClipboardList} />
                <MetricCard label="Este mes" value={client.stats?.month || 0} icon={CalendarDays} />
                <MetricCard label="Score" value={client.profileScore || 0} icon={Radar} />
              </div>
              <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-white/65">
                Este registro está clasificado como cliente para que el equipo comercial pueda verlo separado del trabajador. Ideal para seguimiento, soporte, conversión y mensajes internos.
              </div>
            </div>
          </div>

          <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-5">
            <h4 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-white/80"><MessageCircle size={16} /> Últimos pedidos</h4>
            {loading ? (
              <div className="py-8 text-center text-white/50"><Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin" />Cargando pedidos...</div>
            ) : jobs.length ? (
              <div className="space-y-3">
                {jobs.map((job) => <JobRow key={job.id} job={job} />)}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-white/45">Sin pedidos todavía.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function WorkerDetailModal({ worker, onClose, onVerify, onSaveNote, onToggleBlock, busy }) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(null);
  const [jobHistory, setJobHistory] = useState(emptyWorkerStats());
  const [history, setHistory] = useState([]);
  const [noteInput, setNoteInput] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [blockDays, setBlockDays] = useState('7');

  async function createSignedWorkerDocUrl(pathOrUrl) {
    if (!pathOrUrl) return null;
    const value = String(pathOrUrl);
    if (value.startsWith('http://') || value.startsWith('https://')) return value;

    try {
      const { data, error } = await supabase.storage.from('worker-docs').createSignedUrl(value, 60 * 30);
      if (error) throw error;
      return data?.signedUrl || null;
    } catch (err) {
      console.warn('No se pudo firmar documento del trabajador:', err.message);
      return null;
    }
  }

  async function hydrateDocumentPreviews(docs = []) {
    return Promise.all(
      docs.map(async (doc) => ({
        ...doc,
        signed_front_url: await createSignedWorkerDocUrl(doc.front_url),
        signed_back_url: await createSignedWorkerDocUrl(doc.back_url),
        signed_file_url: await createSignedWorkerDocUrl(doc.file_url),
      }))
    );
  }

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

        const [{ data: profile }, { data: docs }, { data: bank }, { data: jobs }, { data: adminHistory }] = await Promise.all([
          supabase.from('profiles').select('email, full_name, phone, created_at').eq('id', worker.user_id).maybeSingle(),
          supabase.from('documents').select('doc_type, doc_number, front_url, back_url, file_url').eq('user_id', worker.user_id),
          supabase.from('bank_accounts').select('bank_name, account_type, account_number, holder_name, holder_document').eq('user_id', worker.user_id).maybeSingle(),
          supabase.from('jobs').select('status, created_at, service').eq('worker_id', worker.user_id).order('created_at', { ascending: false }),
          supabase.from(ADMIN_HISTORY_TABLE).select('id, action, detail, extra, created_at, admin_id').eq('worker_id', worker.user_id).order('created_at', { ascending: false }).limit(20),
        ]);

        const stats = emptyWorkerStats();
        for (const j of jobs || []) {
          const createdAt = new Date(j.created_at);
          hydrateWorkerStats(stats, j, createdAt, new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()), startMonth);
          if (createdAt >= startWeek) stats.thisWeek += 1;
        }

        const signedDocs = await hydrateDocumentPreviews(docs || []);
        setJobHistory(stats);
        setDetails({ profile, docs: signedDocs, bank });
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
    await onToggleBlock(worker, { reason: blockReason || 'Bloqueo administrativo temporal', endsAt });
  };

  return (
    <div className="fixed inset-0 z-[10000] bg-black/70 p-3 backdrop-blur-md md:p-6">
      <div className="mx-auto flex max-h-[92vh] w-full max-w-7xl flex-col overflow-hidden rounded-[32px] border border-white/10 bg-[#07131D] shadow-[0_30px_100px_rgba(0,0,0,0.55)]">
        <ModalHeader title="Ficha completa del trabajador" eyebrow="Worker intelligence" onClose={onClose} />

        {loading ? (
          <div className="py-16 text-center text-white/60"><Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-emerald-300" />Cargando información completa...</div>
        ) : (
          <div className="grid flex-1 overflow-y-auto xl:grid-cols-[1.1fr_0.9fr]">
            <div className="border-b border-white/10 p-5 xl:border-b-0 xl:border-r xl:p-6">
              <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center">
                <img src={worker.avatar_url || '/avatar-fallback.png'} className="h-24 w-24 rounded-[26px] border border-white/10 object-cover" alt="avatar" />
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h3 className="text-2xl font-black text-white">{worker.full_name || 'Sin nombre'}</h3>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${status.badge}`}>{status.label}</span>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${riskUi.badge}`}>Riesgo {riskUi.label}</span>
                  </div>
                  <div className="grid gap-2 text-sm text-white/70 md:grid-cols-2">
                    <InfoLine icon={Mail} text={details?.profile?.email || 'Sin email'} />
                    <InfoLine icon={Phone} text={details?.profile?.phone || 'Sin número'} />
                    <InfoLine icon={MapPin} text={worker.city || 'No seleccionado'} />
                    <InfoLine icon={Clock3} text={details?.profile?.created_at ? `Registrado: ${new Date(details.profile.created_at).toLocaleString('es-AR')}` : 'Sin fecha de registro'} />
                  </div>
                </div>
              </div>

              <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <MetricCard label="Trabajos hoy" value={worker.stats?.today || 0} icon={CalendarDays} />
                <MetricCard label="Trabajos mes" value={worker.stats?.month || 0} icon={Activity} />
                <MetricCard label="Completados" value={jobHistory.completed90 || jobHistory.completed || 0} icon={CheckCircle2} />
                <MetricCard label="Score" value={worker.profileScore || 0} icon={Radar} />
                <MetricCard label="Eficiencia" value={`${completionRate}%`} icon={ShieldCheck} />
              </div>

              <Panel title="Perfil profesional" color="emerald">
                <p className="mb-4 text-sm leading-6 text-white/75">{worker.bio || 'Sin descripción profesional.'}</p>
                <div className="mb-2 text-sm font-semibold text-white/75">Oficios</div>
                {skills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">{skills.map((skill, idx) => <span key={idx} className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">{skill}</span>)}</div>
                ) : (
                  <p className="text-sm text-white/45">Sin oficios registrados.</p>
                )}
              </Panel>

              <Panel title="Operación y rendimiento" color="cyan">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <MetricSoft label="Total 90 días" value={jobHistory.total90 || 0} />
                  <MetricSoft label="Aceptados" value={jobHistory.accepted90 || 0} />
                  <MetricSoft label="Cancelados" value={jobHistory.cancelled90 || 0} />
                  <MetricSoft label="Últimos 7 días" value={jobHistory.thisWeek || 0} />
                  <MetricSoft label="Este mes" value={jobHistory.month || 0} />
                  <MetricSoft label="Ubicación" value={worker.lat && worker.lng ? `${Number(worker.lat).toFixed(4)}, ${Number(worker.lng).toFixed(4)}` : 'Sin GPS'} />
                </div>
              </Panel>

              <Panel title="Semáforo de riesgo documental" icon={TriangleAlert} color="red">
                <RiskDots level={worker.docRisk.level} />
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
              </Panel>

              <div className="rounded-[28px] border border-[#62bfb9]/20 bg-gradient-to-br from-[#62bfb9]/12 via-white/[0.045] to-sky-400/10 p-4 shadow-[0_18px_44px_rgba(0,0,0,0.16)]">
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h4 className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-[#7bf0e7]"><FileText size={16} /> Documentos cargados</h4>
                  <span className="rounded-full border border-[#62bfb9]/25 bg-[#62bfb9]/12 px-3 py-1 text-xs font-black text-[#9af7ef]">Verificación ManosYA</span>
                </div>
                {details?.docs?.length ? (
                  <div className="space-y-5">
                    {details.docs.map((d, i) => (
                      <div key={i} className="rounded-[26px] border border-white/10 bg-[#07131D]/80 p-4 shadow-inner">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-[#62bfb9]/18 px-3 py-1 text-xs font-black text-[#a7fff7]">{getDocLabel(d.doc_type)}</span>
                          <span className="text-sm text-white/70">Nro: {d.doc_number || 'Sin número'}</span>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          <DocumentPreviewCard label="Frente" url={d.signed_front_url} rawPath={d.front_url} onOpen={setPreview} />
                          <DocumentPreviewCard label="Dorso" url={d.signed_back_url} rawPath={d.back_url} onOpen={setPreview} />
                          <DocumentPreviewCard label={d.doc_type === 'POLICE' ? 'Antecedente' : 'Archivo'} url={d.signed_file_url} rawPath={d.file_url} onOpen={setPreview} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-white/45">Sin documentos cargados.</div>
                )}
              </div>
            </div>

            <div className="p-5 xl:p-6">
              <Panel title="Estado del perfil">
                <div className="space-y-3">
                  <CheckRow ok={!!worker.worker_verified} label="Verificación administrativa" />
                  <CheckRow ok={!!worker.is_active} label="Activo en operación" />
                  <CheckRow ok={!!details?.docs?.length} label="Documentación cargada" />
                  <CheckRow ok={!!details?.bank} label="Datos bancarios" />
                  <CheckRow ok={skills.length > 0} label="Oficios configurados" />
                </div>
              </Panel>

              <Panel title="Datos bancarios" icon={Building}>
                {details?.bank ? (
                  <div className="space-y-3 text-sm text-white/75">
                    <InfoBlock label="Banco" value={details.bank.bank_name || 'No informado'} />
                    <InfoBlock label="Tipo de cuenta" value={details.bank.account_type || 'No informado'} />
                    <InfoBlock label="Número de cuenta" value={details.bank.account_number || 'No informado'} />
                    <InfoBlock label="Titular" value={details.bank.holder_name || 'No informado'} />
                    <InfoBlock label="Documento titular" value={details.bank.holder_document || 'No informado'} />
                  </div>
                ) : <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-white/45">Sin cuenta bancaria cargada.</div>}
              </Panel>

              <Panel title="Nota interna del verificador" icon={NotebookPen}>
                <textarea value={noteInput} onChange={(e) => setNoteInput(e.target.value)} rows={4} placeholder="Escribí observaciones internas del perfil, faltantes, alertas o decisiones..." className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-emerald-400/40" />
                <button onClick={handleCreateNote} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-cyan-600"><NotebookPen className="h-4 w-4" />Guardar nota interna</button>
                {worker.notes?.length ? <div className="mt-4 space-y-2">{worker.notes.slice(0, 4).map((n) => <div key={n.id} className="rounded-2xl border border-white/10 bg-black/20 p-3"><div className="text-sm text-white/80">{n.note}</div><div className="mt-1 text-[11px] text-white/40">{n.created_at ? new Date(n.created_at).toLocaleString('es-AR') : 'Sin fecha'}</div></div>)}</div> : <p className="mt-3 text-sm text-white/45">Sin notas internas todavía.</p>}
              </Panel>

              <Panel title="Bloqueo temporal" icon={ShieldX}>
                {worker.activeBlock ? (
                  <div className="mb-3 rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-100"><div className="font-bold">Bloqueo activo</div><div className="mt-1">Motivo: {worker.activeBlock.reason || 'Sin motivo'}</div><div className="mt-1">Hasta: {worker.activeBlock.ends_at ? new Date(worker.activeBlock.ends_at).toLocaleString('es-AR') : 'Sin fecha de fin'}</div></div>
                ) : (
                  <div className="mb-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-100">Sin bloqueo activo.</div>
                )}
                {!worker.activeBlock && (
                  <>
                    <input value={blockReason} onChange={(e) => setBlockReason(e.target.value)} placeholder="Motivo del bloqueo temporal" className="mb-3 h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none placeholder:text-white/30 focus:border-emerald-400/40" />
                    <select value={blockDays} onChange={(e) => setBlockDays(e.target.value)} className="mb-3 h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none focus:border-emerald-400/40">
                      <option value="1" className="bg-slate-900">1 día</option>
                      <option value="3" className="bg-slate-900">3 días</option>
                      <option value="7" className="bg-slate-900">7 días</option>
                      <option value="15" className="bg-slate-900">15 días</option>
                      <option value="30" className="bg-slate-900">30 días</option>
                      <option value="0" className="bg-slate-900">Sin fecha límite</option>
                    </select>
                  </>
                )}
                <button onClick={handleBlockAction} disabled={busy === worker.user_id} className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-white transition disabled:opacity-60 ${worker.activeBlock ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-fuchsia-500 hover:bg-fuchsia-600'}`}>
                  {worker.activeBlock ? <><Unlock className="h-4 w-4" />Levantar bloqueo</> : <><Lock className="h-4 w-4" />Aplicar bloqueo temporal</>}
                </button>
              </Panel>

              <Panel title="Acciones rápidas">
                <div className="grid gap-3">
                  <button onClick={() => { if (!details?.docs || details.docs.length === 0) { toast.warning('⚠️ No se puede aprobar un trabajador sin documentos cargados.'); return; } onVerify(worker.user_id, true); }} disabled={busy === worker.user_id} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-600 disabled:opacity-60">
                    {busy === worker.user_id ? <><Loader2 className="h-4 w-4 animate-spin" />Procesando...</> : <><CheckCircle2 className="h-4 w-4" />Aprobar y publicar</>}
                  </button>
                  <button onClick={() => onVerify(worker.user_id, false)} disabled={busy === worker.user_id} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-600 disabled:opacity-60"><AlertTriangle className="h-4 w-4" />Rechazar y ocultar</button>
                </div>
              </Panel>

              <Panel title="Historial de cambios del admin" icon={ClipboardList}>
                {history?.length ? <div className="space-y-2">{history.map((item) => <div key={item.id} className="rounded-2xl border border-white/10 bg-black/20 p-3"><div className="text-sm font-semibold text-white">{humanizeAdminAction(item.action)}</div><div className="mt-1 text-sm text-white/65">{item.detail || 'Sin detalle'}</div><div className="mt-1 text-[11px] text-white/40">{item.created_at ? new Date(item.created_at).toLocaleString('es-AR') : 'Sin fecha'}</div></div>)}</div> : <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-white/45">Sin historial de cambios todavía.</div>}
              </Panel>
            </div>
          </div>
        )}

        {preview && (
          <div className="fixed inset-0 z-[20000] flex items-center justify-center bg-black/80 p-4" onClick={() => setPreview(null)}>
            <div className="relative max-h-[90vh] max-w-[90vw] rounded-[24px] border border-white/10 bg-[#07131D] p-3 shadow-2xl">
              {String(preview).toLowerCase().includes('.pdf') ? <iframe src={preview} className="h-[80vh] w-[80vw] rounded-[18px]" title="Documento PDF" /> : <img src={preview} alt="Documento" className="max-h-[80vh] max-w-[80vw] rounded-[18px] object-contain" />}
              <button onClick={() => setPreview(null)} className="absolute right-3 top-3 rounded-full bg-black/70 p-2 text-white"><XCircle size={22} /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ModalHeader({ title, eyebrow, onClose }) {
  return (
    <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 md:px-6">
      <div>
        <div className="text-xs uppercase tracking-[0.24em] text-emerald-300/80">{eyebrow}</div>
        <h2 className="mt-1 text-xl font-black text-white md:text-2xl">{title}</h2>
      </div>
      <button onClick={onClose} className="rounded-2xl border border-white/10 bg-white/5 p-2.5 text-white/70 transition hover:bg-white/10 hover:text-white"><XCircle size={22} /></button>
    </div>
  );
}

function Panel({ title, icon: Icon, children, color = 'white' }) {
  const tone = color === 'emerald' ? 'text-emerald-300/80' : color === 'cyan' ? 'text-cyan-300/80' : color === 'red' ? 'text-red-300/80' : 'text-white/80';
  return (
    <div className="mb-6 rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
      <h4 className={`mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] ${tone}`}>{Icon ? <Icon size={16} /> : null}{title}</h4>
      {children}
    </div>
  );
}

function MetricCard({ label, value, icon: Icon }) {
  return <div className="rounded-2xl border border-white/10 bg-black/20 p-3"><Icon className="mb-2 h-4 w-4 text-[#9af7ef]" /><div className="text-2xl font-black text-white">{value}</div><div className="text-xs text-white/50">{label}</div></div>;
}

function MetricSoft({ label, value }) {
  return <div className="rounded-2xl border border-white/10 bg-black/20 p-3"><div className="text-xs text-white/45">{label}</div><div className="mt-1 text-xl font-black text-white">{value}</div></div>;
}

function CheckRow({ ok, label }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
      <span className="text-sm text-white/75">{label}</span>
      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${ok ? 'bg-emerald-500/15 text-emerald-200' : 'bg-red-500/15 text-red-200'}`}>{ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}{ok ? 'OK' : 'Pendiente'}</span>
    </div>
  );
}

function InfoLine({ icon: Icon, text }) {
  return <div className="flex min-w-0 items-center gap-2"><Icon className="h-4 w-4 shrink-0 text-[#9af7ef]" /><span className="truncate">{text}</span></div>;
}

function InfoBlock({ label, value }) {
  return <div className="rounded-2xl border border-white/10 bg-black/20 p-3"><div className="text-xs text-white/45">{label}</div><div className="mt-1 font-medium text-white/85">{value}</div></div>;
}

function DocumentPreviewCard({ label, url, rawPath, onOpen }) {
  const isPDF = String(url || rawPath || '').toLowerCase().includes('.pdf') || String(rawPath || '').toLowerCase().endsWith('.pdf');

  if (!rawPath && !url) {
    return <div className="rounded-[22px] border border-dashed border-white/10 bg-black/20 p-4"><div className="text-xs font-black uppercase tracking-[0.16em] text-white/45">{label}</div><div className="mt-4 flex h-36 items-center justify-center rounded-2xl bg-white/[0.03] text-center text-xs font-bold text-white/35">No cargado</div></div>;
  }

  if (!url) {
    return <div className="rounded-[22px] border border-amber-400/20 bg-amber-500/10 p-4"><div className="text-xs font-black uppercase tracking-[0.16em] text-amber-200">{label}</div><div className="mt-4 flex h-36 items-center justify-center rounded-2xl bg-black/20 px-3 text-center text-xs font-bold text-amber-100">Documento guardado, pero no se pudo generar vista segura.</div></div>;
  }

  return (
    <button type="button" onClick={() => onOpen(url)} className="group rounded-[22px] border border-white/10 bg-black/20 p-3 text-left transition hover:border-[#62bfb9]/40 hover:bg-[#62bfb9]/10">
      <div className="mb-2 flex items-center justify-between gap-2"><div className="text-xs font-black uppercase tracking-[0.16em] text-[#9af7ef]">{label}</div><span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-black text-white/65">Ver</span></div>
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
        {isPDF ? <div className="flex h-40 items-center justify-center p-4 text-center"><div><FileText className="mx-auto h-8 w-8 text-[#9af7ef]" /><div className="mt-3 text-xs font-black text-white">PDF privado</div><div className="mt-1 text-[11px] font-semibold text-white/45">Tocar para abrir</div></div></div> : <img src={url} alt={label} className="h-40 w-full object-cover transition duration-300 group-hover:scale-[1.04]" />}
      </div>
    </button>
  );
}

function JobRow({ job }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-black/20 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="text-sm font-bold text-white">{job.service || 'Servicio sin nombre'}</div>
        <div className="text-xs text-white/45">{job.created_at ? new Date(job.created_at).toLocaleString('es-AR') : 'Sin fecha'}</div>
      </div>
      <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/70">{humanizeJobStatus(job.status)}</div>
    </div>
  );
}

function groupBy(list, key) {
  const out = {};
  for (const item of list || []) {
    const val = item?.[key];
    if (!val) continue;
    if (!out[val]) out[val] = [];
    out[val].push(item);
  }
  return out;
}

function normalizeRole(role) {
  return String(role || '').toLowerCase().trim();
}

function emptyWorkerStats() {
  return { total90: 0, completed90: 0, accepted90: 0, cancelled90: 0, today: 0, month: 0, thisWeek: 0 };
}

function emptyClientStats() {
  return { total90: 0, completed90: 0, cancelled90: 0, pending90: 0, today: 0, month: 0 };
}

function hydrateWorkerStats(stats, job, createdAt, startToday, startMonth) {
  stats.total90 += 1;
  if (job.status === 'completed') stats.completed90 += 1;
  if (job.status === 'accepted' || job.status === 'assigned') stats.accepted90 += 1;
  if (job.status === 'cancelled') stats.cancelled90 += 1;
  if (createdAt >= startToday) stats.today += 1;
  if (createdAt >= startMonth) stats.month += 1;
}

function hydrateClientStats(stats, job, createdAt, startToday, startMonth) {
  stats.total90 += 1;
  if (job.status === 'completed') stats.completed90 += 1;
  if (job.status === 'cancelled') stats.cancelled90 += 1;
  if (job.status === 'open' || job.status === 'accepted' || job.status === 'assigned') stats.pending90 += 1;
  if (createdAt >= startToday) stats.today += 1;
  if (createdAt >= startMonth) stats.month += 1;
}

function filterBaseList(list, { query, cityFilter }) {
  let out = [...list];
  const q = query.trim().toLowerCase();
  if (q) out = out.filter((item) => item.searchableText?.includes(q));
  if (cityFilter !== 'all') out = out.filter((item) => item.city === cityFilter);
  return out;
}

function sortPeople(list, sortBy) {
  const arr = [...list];
  arr.sort((a, b) => {
    switch (sortBy) {
      case 'created_desc':
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
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
        return riskWeight(b.docRisk?.level) - riskWeight(a.docRisk?.level);
      case 'updated_desc':
      default:
        return new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime();
    }
  });
  return arr;
}

function normalizeSkills(skills) {
  if (!skills) return [];
  if (Array.isArray(skills)) return skills.filter(Boolean);
  if (typeof skills === 'string') return skills.split(',').map((s) => s.trim()).filter(Boolean);
  return [];
}

function getWorkerStatus(worker, activeBlock = null) {
  if (activeBlock) return { key: 'blocked', label: 'Bloqueado', badge: 'bg-fuchsia-500/15 text-fuchsia-200' };
  if (worker.worker_verified && worker.is_active) return { key: 'active', label: 'Activo', badge: 'bg-emerald-500/15 text-emerald-200' };
  if (!worker.worker_verified) return { key: 'pending', label: 'Pendiente', badge: 'bg-amber-500/15 text-amber-200' };
  return { key: 'inactive', label: 'Inactivo', badge: 'bg-red-500/15 text-red-200' };
}

function getClientStatus(client, stats) {
  if ((stats?.today || 0) > 0) return { key: 'active', label: 'Activo hoy', badge: 'bg-emerald-500/15 text-emerald-200', lightBadge: 'bg-emerald-500/12 text-emerald-700' };
  if ((stats?.total90 || 0) > 0) return { key: 'warm', label: 'Con pedidos', badge: 'bg-cyan-500/15 text-cyan-200', lightBadge: 'bg-cyan-500/12 text-cyan-700' };
  if (client.created_at && daysSince(client.created_at) <= 7) return { key: 'new', label: 'Nuevo', badge: 'bg-amber-500/15 text-amber-200', lightBadge: 'bg-amber-500/12 text-amber-700' };
  return { key: 'silent', label: 'Sin pedidos', badge: 'bg-slate-500/15 text-slate-200', lightBadge: 'bg-slate-500/12 text-slate-600' };
}

function daysSince(date) {
  const diff = Date.now() - new Date(date).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function calcCompletionRate(stats) {
  const total = stats?.total90 || 0;
  const completed = stats?.completed90 || 0;
  if (!total) return 0;
  return Math.max(0, Math.min(100, Math.round((completed / total) * 100)));
}

function getDocLabel(type) {
  switch (type) {
    case 'POLICE': return 'Antecedente Policial';
    case 'CI': return 'Cédula de Identidad';
    case 'DNI': return 'Documento Nacional de Identidad';
    case 'PASSPORT': return 'Pasaporte';
    default: return type || 'Documento';
  }
}

function getDocumentRisk({ docs, hasBank, hasAvatar, hasCity, hasSkills }) {
  const docCount = docs?.length || 0;
  const hasIdentityDoc = (docs || []).some((d) => ['CI', 'DNI', 'PASSPORT'].includes(d.doc_type));
  if (!docCount || !hasIdentityDoc) return { level: 'high', reason: 'No hay documento principal de identidad cargado.' };
  if (!hasBank || !hasAvatar || !hasCity || !hasSkills) return { level: 'medium', reason: 'El perfil tiene documentación, pero le faltan datos operativos clave.' };
  return { level: 'low', reason: 'El perfil cuenta con documentación y estructura operativa suficiente.' };
}

function getRiskUI(level) {
  if (level === 'high') return { label: 'ALTO', badge: 'bg-red-500/15 text-red-200', panel: 'border-red-400/20 bg-red-500/10 text-red-100' };
  if (level === 'medium') return { label: 'MEDIO', badge: 'bg-amber-500/15 text-amber-200', panel: 'border-amber-400/20 bg-amber-500/10 text-amber-100' };
  return { label: 'BAJO', badge: 'bg-emerald-500/15 text-emerald-200', panel: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100' };
}

function riskWeight(level) {
  if (level === 'high') return 3;
  if (level === 'medium') return 2;
  return 1;
}

function calculateProfileScore({ worker, docs, stats, hasBank, normalizedSkills, activeBlock, docRisk }) {
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

function calculateClientScore(client, stats) {
  let score = 18;
  if (client.full_name) score += 14;
  if (client.phone) score += 16;
  if (client.email) score += 10;
  if (client.city) score += 10;
  if ((stats?.total90 || 0) > 0) score += 20;
  if ((stats?.month || 0) > 0) score += 12;
  if ((stats?.today || 0) > 0) score += 10;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function humanizeAdminAction(action) {
  switch (action) {
    case 'approve_worker': return 'Aprobación de trabajador';
    case 'reject_worker': return 'Rechazo de trabajador';
    case 'note_added': return 'Nota interna agregada';
    case 'worker_blocked': return 'Bloqueo temporal aplicado';
    case 'worker_unblocked': return 'Bloqueo temporal levantado';
    default: return action || 'Acción administrativa';
  }
}

function humanizeJobStatus(status) {
  switch (status) {
    case 'open': return 'Abierto';
    case 'accepted': return 'Aceptado';
    case 'assigned': return 'Asignado';
    case 'completed': return 'Completado';
    case 'cancelled': return 'Cancelado';
    default: return status || 'Sin estado';
  }
}
