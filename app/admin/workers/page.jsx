'use client';

import { useEffect, useMemo, useState } from 'react';
import { getSupabase } from '@/lib/supabase';

const supabase = getSupabase();

export default function AdminWorkersPage() {
  return (
    <div className="container">
      <header className="mt-6 mb-4 flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-white">
            Profesionales
          </h1>
          <p className="text-white/60 text-sm">
            Verificación, documentos y detalles.
          </p>
        </div>
      </header>

      <WorkersTable />
    </div>
  );
}

function WorkersTable() {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    fetchRows();
  }, []);

  /** 🔹 Obtener datos desde Supabase */
  async function fetchRows() {
    setBusy(true);
    setErr(null);
    try {
      const { data, error } = await supabase
        .from('admin_workers_view')
        .select('*')
        .order('full_name', { ascending: true });

      if (error) throw error;

      console.log('✅ Datos recibidos:', data);
      setRows(data || []);
    } catch (e) {
      console.error('❌ Error al obtener profesionales:', e);
      setErr(e.message || 'Error al cargar los datos.');
    } finally {
      setBusy(false);
    }
  }

  /** 🔹 Filtro de búsqueda */
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(
      (r) =>
        (r.full_name || '').toLowerCase().includes(s) ||
        (r.email || '').toLowerCase().includes(s) ||
        (r.id_doc_number || '').toLowerCase().includes(s)
    );
  }, [rows, q]);

  /** 🔹 Cambiar verificación del trabajador */
  async function toggleVerified(userId, current) {
    try {
      const { error } = await supabase.rpc('admin_toggle_verified', {
        worker_id: userId,
        make_verified: !current,
      });
      if (error) throw error;
      await fetchRows();
    } catch (e) {
      console.error('❌ Error al cambiar verificación:', e);
      alert(e.message || 'No se pudo actualizar la verificación');
    }
  }

  return (
    <section className="card p-4 bg-zinc-900 rounded-2xl border border-white/10">
      {/* 🔍 Barra de búsqueda */}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          className="input text-black rounded-lg px-3 py-2"
          style={{ maxWidth: 420 }}
          placeholder="Buscar por nombre, email o documento…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button
          className="btn btn-ghost bg-teal-500 hover:bg-teal-600 text-white rounded-lg px-4 py-2"
          onClick={fetchRows}
          disabled={busy}
        >
          {busy ? 'Actualizando…' : 'Actualizar'}
        </button>
      </div>

      {err && <div className="text-red-400 text-sm mt-3">{err}</div>}

      <div className="mt-6 space-y-4">
        {filtered.length === 0 && !busy && (
          <div className="text-white/50 text-sm">Sin resultados.</div>
        )}

        {filtered.map((u) => {
          // 🔸 Parsear skills de forma segura
          let skills = [];
          try {
            skills = typeof u.skills === 'string' ? JSON.parse(u.skills) : u.skills;
          } catch {
            skills = [];
          }

          return (
            <article
              key={u.user_id}
              className="card p-4 bg-zinc-800 rounded-xl border border-white/10"
            >
              <div className="flex items-start gap-4 flex-wrap">
                {/* 🖼️ Foto de perfil */}
                <img
                  src={u.avatar_url || '/avatar-fallback.png'}
                  alt="Foto de perfil"
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '3px solid #14B8A6',
                  }}
                />

                {/* 📋 Información principal */}
                <div className="flex-1 min-w-[260px]">
                  <div className="font-heading text-lg font-extrabold text-white">
                    {u.full_name || 'Usuario'}{' '}
                    {u.verified && (
                      <span className="text-white/60 text-sm">· Verificado ✓</span>
                    )}
                  </div>
                  <div className="text-white/70 text-sm">{u.email}</div>
                  <div className="text-white/60 text-sm mt-1">
                    {u.years_experience ? `${u.years_experience} años · ` : ''}
                    {skills?.length
                      ? skills.map((s) => s.name).join(' · ')
                      : 'Sin oficios cargados'}
                  </div>
                  <div className="text-white/60 text-sm mt-1">
                    Radio: {u.radius_km ?? '—'} km · Estado:{' '}
                    {u.is_active ? 'Activo' : 'Pausado'}
                  </div>
                  <div className="text-white/60 text-sm mt-1">
                    {u.total_ratings > 0
                      ? `★ ${Number(u.avg_rating).toFixed(1)} · ${u.total_ratings} calif.`
                      : 'Sin calificaciones'}
                  </div>
                </div>

                {/* 📄 Documentos */}
                <div className="min-w-[220px]">
                  <div className="text-white/60 text-xs">Documento</div>
                  <div className="text-white/80 text-sm">
                    {(u.id_doc_type || '—')} {(u.id_doc_number || '')}
                  </div>
                  <div className="flex gap-2 mt-2">
                    {u.id_doc_front_url && (
                      <a
                        href={u.id_doc_front_url}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-ghost border border-white/20 rounded-lg px-3 py-1 text-white/80"
                      >
                        Frente
                      </a>
                    )}
                    {u.id_doc_back_url && (
                      <a
                        href={u.id_doc_back_url}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-ghost border border-white/20 rounded-lg px-3 py-1 text-white/80"
                      >
                        Dorso
                      </a>
                    )}
                  </div>

                  <button
                    className={`btn w-full mt-3 font-bold rounded-lg ${
                      u.verified
                        ? 'bg-rose-600 hover:bg-rose-700'
                        : 'bg-teal-500 hover:bg-teal-600'
                    }`}
                    onClick={() => toggleVerified(u.user_id, u.verified)}
                  >
                    {u.verified ? 'Quitar verificación' : 'Verificar ✓'}
                  </button>
                </div>
              </div>

              {u.bio && (
                <div className="text-white/80 text-sm mt-3 border-t border-white/10 pt-3">
                  {u.bio}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
