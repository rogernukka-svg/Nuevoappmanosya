'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

const SKILLS = [
  { slug: 'limpieza', name: 'Limpieza' },
  { slug: 'plomeria', name: 'Plomería' },
  { slug: 'jardineria', name: 'Jardinería / Césped' },
  { slug: 'electricidad', name: 'Electricidad' },
  { slug: 'auxilio-vehicular', name: 'Auxilio vehicular' },
  { slug: 'fletes', name: 'Fletes' },
];

const RADII = [3, 5, 10, 15, 20]; // km

export default function WorkerNearbyPage() {
  const [coords, setCoords] = useState(null);
  const [skill, setSkill] = useState(SKILLS[0].slug);
  const [radius, setRadius] = useState(5);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState([]);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  async function updateMyLocation() {
    if (!navigator.geolocation) {
      setErr('Tu navegador no soporta geolocalización');
      return;
    }
    navigator.geolocation.getCurrentPosition(async p => {
      const loc = { lon: p.coords.longitude, lat: p.coords.latitude };
      setCoords(loc);
      await supabase.rpc('set_my_worker_location', loc);
    }, e => setErr(e.message), { enableHighAccuracy: true });
  }

  async function searchNearby() {
    if (!coords) return setErr('Primero actualizá tu ubicación');
    setBusy(true); setErr(null);
    const { data, error } = await supabase.rpc('fn_find_nearby_jobs', {
      lon: coords.lon, lat: coords.lat,
      skill_slug: skill, max_km: radius
    });
    setBusy(false);
    if (error) setErr(error.message);
    else {
      setResults(data || []);
      setMsg(`${(data || []).length} trabajo(s) encontrados`);
    }
  }

  async function takeJob(jobId) {
    const { error } = await supabase.rpc('take_job', { job_id: jobId });
    if (error) return alert(error.message);
    alert('✅ Tomaste el trabajo. Revisá en "Mis trabajos".');
    searchNearby();
  }

  return (
    <div className="container">
      <header className="mt-6 mb-4 flex items-end justify-between">
        <h1 className="text-2xl font-extrabold">Trabajos cerca</h1>
      </header>

      {/* filtros */}
      <section className="card p-4 mb-6">
        <div className="grid md:grid-cols-4 gap-4">
          <select value={skill} onChange={e=>setSkill(e.target.value)} className="select">
            {SKILLS.map(s => <option key={s.slug} value={s.slug}>{s.name}</option>)}
          </select>
          <select value={radius} onChange={e=>setRadius(Number(e.target.value))} className="select">
            {RADII.map(r => <option key={r} value={r}>{r} km</option>)}
          </select>
          <button onClick={updateMyLocation} className="btn btn-ghost">Actualizar ubicación</button>
          <button onClick={searchNearby} disabled={busy} className="btn btn-primary">
            {busy ? 'Buscando…' : 'Buscar trabajos'}
          </button>
        </div>
        {coords && <div className="text-xs text-white/60 mt-2">Ubicación: {coords.lat.toFixed(4)}, {coords.lon.toFixed(4)}</div>}
      </section>

      {/* resultados */}
      {err && <div className="text-red-400">{err}</div>}
      {msg && <div className="text-white/60">{msg}</div>}
      <div className="space-y-3">
        {results.map(job => (
          <article key={job.id} className="card p-4 flex justify-between items-center">
            <div>
              <h3 className="font-bold">{job.title}</h3>
              <p className="text-sm opacity-70">{job.description}</p>
            </div>
            <button onClick={() => takeJob(job.id)} className="btn btn-primary">Tomar</button>
          </article>
        ))}
      </div>
    </div>
  );
}