'use client';
import { useEffect, useMemo, useState } from 'react';
import RequireAdmin from '@/components/RequireAdmin';
import { supabase } from '@/lib/supabase';

export default function IncidentsPage() {
  return (
    <RequireAdmin>
      <div className="container">
        <header className="mt-6 mb-4">
          <h1 className="font-heading text-2xl font-extrabold">Incidencias</h1>
          <p className="text-white/60 text-sm">Reportes de clientes y profesionales.</p>
        </header>
        <IncidentsTable />
      </div>
    </RequireAdmin>
  );
}

function IncidentsTable() {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => { fetchRows(); }, []);

  async function fetchRows() {
    setBusy(true); setErr(null);
    try {
      // Ajustá el nombre de la tabla/relaciones a tu esquema si ya existe
      const { data, error } = await supabase
        .from('incidents')
        .select(`
          id, job_id, reporter_id, target_user_id, type, details, status, created_at,
          job:jobs(title),
          reporter:profiles(full_name, email),
          target:profiles(full_name, email)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setRows(data || []);
    } catch (e) {
      // si no existe la tabla, mostramos un aviso limpio
      setErr('Aún no hay módulo de incidencias en la base (tabla "incidents").');
      setRows([]);
    } finally {
      setBusy(false);
    }
  }

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(r =>
      (r.job?.title || '').toLowerCase().includes(s) ||
      (r.reporter?.email || '').toLowerCase().includes(s) ||
      (r.target?.email || '').toLowerCase().includes(s) ||
      (r.type || '').toLowerCase().includes(s) ||
      (r.details || '').toLowerCase().includes(s)
    );
  }, [rows, q]);

  async function setStatus(id, status) {
    try {
      const { error } = await supabase
        .from('incidents')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
      await fetchRows();
    } catch (e) {
      alert(String(e.message || e));
    }
  }

  return (
    <section className="card p-4">
      <div className="flex items-center gap-3 flex-wrap">
        <input
          className="input"
          style={{maxWidth: 420}}
          placeholder="Buscar por trabajo, email, tipo…"
          value={q}
          onChange={e=>setQ(e.target.value)}
        />
        <button className="btn btn-ghost" onClick={fetchRows} disabled={busy}>
          {busy ? 'Actualizando…' : 'Actualizar'}
        </button>
      </div>

      {err && <div className="text-white/60 text-sm mt-3">{err}</div>}
      {!err && filtered.length === 0 && (
        <div className="text-white/50 text-sm mt-3">Sin incidencias.</div>
      )}

      <div className="mt-4 space-y-3">
        {filtered.map(r => (
          <article key={r.id} className="card p-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="min-w-[260px]">
                <div className="font-heading font-extrabold text-lg">
                  {r.job?.title || 'Trabajo'}
                </div>
                <div className="text-white/60 text-sm mt-1">
                  {new Date(r.created_at).toLocaleString()} · Tipo: {r.type || '—'}
                </div>
                <div className="text-white/80 text-sm mt-2 whitespace-pre-line">
                  {r.details || '—'}
                </div>
              </div>

              <div className="text-sm text-white/80">
                <div><b>Reportado por:</b> {r.reporter?.full_name || 'Usuario'} ({r.reporter?.email})</div>
                <div className="mt-1"><b>Contra:</b> {r.target?.full_name || 'Usuario'} ({r.target?.email})</div>
              </div>

              <div className="min-w-[220px]">
                <div className="text-white/60 text-xs mb-1">Estado</div>
                <div className="flex gap-2">
                  {['open','in_review','resolved','rejected'].map(s => (
                    <button
                      key={s}
                      className={`btn ${r.status === s ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => setStatus(r.id, s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
