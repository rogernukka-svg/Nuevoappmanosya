'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Sparkles,
  Users,
  ScanSearch,
  BadgeCheck,
  Hash,
  UserRound,
  ChevronRight,
  ShieldCheck,
  Orbit,
  X,
  Copy,
  CheckCircle2,
  Binary,
  Cpu,
  Zap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import data from '@/data/padron_socios_habilitados_manosya.json';

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s,.-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function highlightText(text, query) {
  if (!query?.trim()) return text;

  const source = String(text ?? '');
  const q = String(query ?? '').trim();
  if (!q) return source;

  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'ig');
  const parts = source.split(regex);

  return parts.map((part, idx) =>
    part.toLowerCase() === q.toLowerCase() ? (
      <mark
        key={idx}
        className="rounded-md bg-emerald-400/20 px-1 py-0.5 text-emerald-200"
      >
        {part}
      </mark>
    ) : (
      <span key={idx}>{part}</span>
    )
  );
}

function getInitialResults(items, visibleCount) {
  return items
    .slice()
    .sort((a, b) => Number(a.nro || 0) - Number(b.nro || 0))
    .slice(0, visibleCount);
}

function buildScore(item, cleanQuery) {
  if (!cleanQuery) return 0;

  const search = normalizeText(item.search || '');
  const fullName = normalizeText(item.nombre_completo || '');
  const apellido = normalizeText(item.apellido || '');
  const nombres = normalizeText(item.nombres || '');
  const numeroSocio = String(item.numero_socio || '');
  const nro = String(item.nro || '');

  let score = 0;

  if (search.startsWith(cleanQuery)) score += 180;
  if (fullName.startsWith(cleanQuery)) score += 160;
  if (apellido.startsWith(cleanQuery)) score += 140;
  if (nombres.startsWith(cleanQuery)) score += 120;

  if (numeroSocio === cleanQuery) score += 300;
  if (nro === cleanQuery) score += 260;

  if (search.includes(cleanQuery)) score += 75;
  if (fullName.includes(cleanQuery)) score += 60;
  if (apellido.includes(cleanQuery)) score += 50;
  if (nombres.includes(cleanQuery)) score += 40;

  const terms = cleanQuery.split(' ').filter(Boolean);
  for (const term of terms) {
    if (fullName.includes(term)) score += 18;
    if (apellido.includes(term)) score += 14;
    if (nombres.includes(term)) score += 12;
    if (numeroSocio.includes(term)) score += 22;
    if (nro.includes(term)) score += 16;
  }

  return score;
}

export default function PadronSociosPage() {
  const [query, setQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(24);
  const [selected, setSelected] = useState(null);
  const [ready, setReady] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 160);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setSelected(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    setVisibleCount(24);
  }, [query]);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(t);
  }, [copied]);

  const cleanQuery = useMemo(() => normalizeText(query), [query]);

  const ranked = useMemo(() => {
    if (!cleanQuery) return [];

    return data
      .map((item) => ({
        ...item,
        _score: buildScore(item, cleanQuery),
      }))
      .filter((item) => item._score > 0)
      .sort((a, b) => {
        if (b._score !== a._score) return b._score - a._score;
        return String(a.nombre_completo || '').localeCompare(
          String(b.nombre_completo || ''),
          'es'
        );
      });
  }, [cleanQuery]);

  const suggestions = useMemo(() => {
    if (!cleanQuery) {
      return data.slice(0, 6);
    }
    return ranked.slice(0, 6);
  }, [cleanQuery, ranked]);

  const results = useMemo(() => {
    if (!cleanQuery) return getInitialResults(data, visibleCount);
    return ranked.slice(0, visibleCount);
  }, [cleanQuery, ranked, visibleCount]);

  const exactMatch = useMemo(() => {
    if (!cleanQuery) return null;

    return (
      data.find((item) => {
        const fullName = normalizeText(item.nombre_completo);
        const apellido = normalizeText(item.apellido);
        const nombres = normalizeText(item.nombres);
        const numeroSocio = String(item.numero_socio || '');
        const nro = String(item.nro || '');

        return (
          fullName === cleanQuery ||
          apellido === cleanQuery ||
          nombres === cleanQuery ||
          numeroSocio === cleanQuery ||
          nro === cleanQuery
        );
      }) || null
    );
  }, [cleanQuery]);

  const stats = useMemo(
    () => ({
      total: data.length,
      showing: results.length,
      exact: exactMatch ? 1 : 0,
    }),
    [results.length, exactMatch]
  );

  const openItem = (item) => {
    setSelected(item);
  };

  const handleCopy = async () => {
    if (!selected) return;
    const payload = [
      `Nombre: ${selected.nombre_completo}`,
      `Número de socio: ${selected.numero_socio}`,
      `Número de orden: ${selected.nro}`,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const quickTips = ['2627', 'noguera', 'rojas', 'ramon', 'maria elena', '158'];

  return (
    <div className="min-h-screen bg-[#06111A] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.10),transparent_30%),radial-gradient(circle_at_right,rgba(6,182,212,0.10),transparent_28%),linear-gradient(180deg,#06111A_0%,#07131D_45%,#06111A_100%)]" />
        <div className="absolute left-[-10%] top-[-8%] h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl md:h-96 md:w-96" />
        <div className="absolute right-[-15%] top-[8%] h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl md:h-[28rem] md:w-[28rem]" />
        <div className="absolute bottom-[-12%] left-[18%] h-72 w-72 rounded-full bg-teal-500/10 blur-3xl md:h-96 md:w-96" />
        <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.16)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.16)_1px,transparent_1px)] [background-size:26px_26px]" />
      </div>

      <main className="relative z-10 mx-auto w-full max-w-7xl px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-6 lg:px-8">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42 }}
          className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.05] p-4 shadow-[0_24px_90px_rgba(0,0,0,0.34)] backdrop-blur-xl sm:p-5 md:rounded-[32px] md:p-6"
        >
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold text-emerald-300 sm:text-xs">
              <Sparkles className="h-3.5 w-3.5" />
              Padrón inteligente · ManosYA
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold text-cyan-200 sm:text-xs">
              <Cpu className="h-3.5 w-3.5" />
              Búsqueda predictiva
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.35fr_0.85fr] xl:items-end">
            <div>
              <h1 className="max-w-4xl text-2xl font-black tracking-tight text-white sm:text-3xl md:text-4xl xl:text-5xl">
                Padrón tecnológico de socios habilitados
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65 md:text-base">
                Buscá por nombre, apellido, número de socio o número de orden.
                Diseño optimizado para móvil, tablet y escritorio, con lectura rápida,
                sugerencias inteligentes y ficha dinámica.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
              <StatCard icon={Users} label="Total" value={stats.total} />
              <StatCard icon={ScanSearch} label="Mostrando" value={stats.showing} />
              <StatCard icon={BadgeCheck} label="Exacto" value={stats.exact} />
            </div>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-[1.35fr_0.85fr]">
            <div className="rounded-[24px] border border-white/10 bg-black/20 p-3 sm:p-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-emerald-300/70" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar por nombre, apellido, socio o número..."
                  className="h-14 w-full rounded-2xl border border-white/10 bg-[#08141F] pl-12 pr-12 text-sm text-white outline-none placeholder:text-white/35 focus:border-emerald-400/40"
                />
                {query && (
                  <button
                    onClick={() => setQuery('')}
                    className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 transition hover:bg-white/10 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {quickTips.map((tip) => (
                  <button
                    key={tip}
                    onClick={() => setQuery(tip)}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-white/70 transition hover:bg-white/10 sm:text-xs"
                  >
                    {tip}
                  </button>
                ))}
              </div>

              {exactMatch && (
                <motion.button
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => openItem(exactMatch)}
                  className="mt-4 flex w-full items-center justify-between rounded-[20px] border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-left"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-200/90">
                      <CheckCircle2 className="h-4 w-4" />
                      Coincidencia exacta
                    </div>
                    <div className="mt-1 truncate text-sm font-bold text-white sm:text-base">
                      {exactMatch.nombre_completo}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-emerald-200" />
                </motion.button>
              )}
            </div>

            <div className="rounded-[24px] border border-white/10 bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 p-3 sm:p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
                <Orbit className="h-4 w-4 text-cyan-300" />
                Predicción rápida
              </div>

              <div className="space-y-2">
                {suggestions.length > 0 ? (
                  suggestions.slice(0, 4).map((item) => (
                    <button
                      key={`${item.nro}-${item.numero_socio}`}
                      onClick={() => {
                        setQuery(item.nombre_completo);
                        openItem(item);
                      }}
                      className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-3 py-3 text-left transition hover:bg-white/[0.06]"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-white">
                          {item.nombre_completo}
                        </div>
                        <div className="mt-0.5 text-xs text-white/45">
                          Socio #{item.numero_socio}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-white/35" />
                    </button>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-6 text-sm text-white/45">
                    Escribí algo para activar sugerencias inteligentes.
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.section>

        <div className="mt-5 grid gap-5 xl:grid-cols-[1.18fr_0.82fr]">
          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: ready ? 1 : 0, y: ready ? 0 : 18 }}
            transition={{ duration: 0.42, delay: 0.05 }}
            className="rounded-[28px] border border-white/10 bg-white/[0.05] p-3 shadow-[0_24px_90px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:p-4 md:p-5"
          >
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-black text-white sm:text-2xl">
                  Resultados inteligentes
                </h2>
                <p className="text-sm text-white/50">
                  Coincidencias ordenadas por relevancia
                </p>
              </div>

              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold text-emerald-200 sm:text-xs">
                <Binary className="h-3.5 w-3.5" />
                {cleanQuery ? `${ranked.length} detectados` : 'Modo exploración'}
              </div>
            </div>

            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {results.map((item, index) => (
                  <motion.button
                    key={`${item.nro}-${item.numero_socio}`}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.18, delay: index * 0.012 }}
                    onClick={() => openItem(item)}
                    className={`group w-full rounded-[22px] border p-4 text-left transition ${
                      selected?.nro === item.nro && selected?.numero_socio === item.numero_socio
                        ? 'border-emerald-400/30 bg-emerald-500/10'
                        : 'border-white/10 bg-black/20 hover:-translate-y-[1px] hover:bg-white/[0.06]'
                    }`}
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0">
                        <div className="mb-2 flex items-start gap-2">
                          <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-xl bg-emerald-500/15 px-2 text-xs font-black text-emerald-200">
                            {item.nro}
                          </span>

                          <div className="min-w-0">
                            <h3 className="truncate text-sm font-black text-white sm:text-base">
                              {highlightText(item.nombre_completo, query)}
                            </h3>
                            <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-white/55 sm:text-xs">
                              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                                Socio #{highlightText(item.numero_socio, query)}
                              </span>
                              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                                Apellido: {highlightText(item.apellido, query)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-emerald-300">
                        <ShieldCheck className="h-4 w-4" />
                        <span className="text-xs font-bold">Habilitado</span>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>

            {!cleanQuery && visibleCount < data.length && (
              <button
                onClick={() => setVisibleCount((prev) => prev + 24)}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                <Zap className="h-4 w-4" />
                Ver más registros
              </button>
            )}

            {cleanQuery && results.length === 0 && (
              <div className="rounded-[24px] border border-dashed border-white/10 bg-black/20 px-4 py-10 text-center text-sm text-white/50">
                No encontramos coincidencias con esa búsqueda.
              </div>
            )}
          </motion.section>

          <motion.aside
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: ready ? 1 : 0, y: ready ? 0 : 18 }}
            transition={{ duration: 0.42, delay: 0.08 }}
            className="rounded-[28px] border border-white/10 bg-white/[0.05] p-3 shadow-[0_24px_90px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:p-4 md:p-5"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold text-cyan-200 sm:text-xs">
                  <Hash className="h-3.5 w-3.5" />
                  Ficha inteligente
                </div>
                <h2 className="text-xl font-black text-white sm:text-2xl">
                  {selected ? 'Registro seleccionado' : 'Esperando selección'}
                </h2>
              </div>

              {selected && (
                <button
                  onClick={() => setSelected(null)}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 transition hover:bg-white/10 hover:text-white xl:hidden"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {selected ? (
              <div className="space-y-4">
                <div className="rounded-[24px] border border-white/10 bg-gradient-to-br from-emerald-500/15 to-cyan-500/10 p-4 sm:p-5">
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/10">
                    <UserRound className="h-6 w-6 text-white" />
                  </div>

                  <div className="text-xl font-black leading-tight text-white sm:text-2xl">
                    {selected.nombre_completo}
                  </div>

                  <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-bold text-emerald-200 sm:text-xs">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Registro habilitado
                  </div>
                </div>

                <DetailCard label="Número de orden" value={selected.nro} />
                <DetailCard label="Número de socio" value={selected.numero_socio} />
                <DetailCard label="Apellido" value={selected.apellido} />
                <DetailCard label="Nombres" value={selected.nombres} />

                <button
                  onClick={handleCopy}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-600"
                >
                  {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copiado' : 'Copiar ficha'}
                </button>
              </div>
            ) : (
              <div className="rounded-[24px] border border-dashed border-white/10 bg-black/20 px-4 py-10 text-center text-sm text-white/50">
                Tocá un resultado para ver la ficha completa.
              </div>
            )}
          </motion.aside>
        </div>
      </main>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-black/20 p-3 sm:p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="rounded-xl bg-white/10 p-2">
          <Icon className="h-4 w-4 text-emerald-300" />
        </div>
      </div>
      <div className="text-xl font-black text-white sm:text-2xl">{value}</div>
      <div className="text-[11px] text-white/50 sm:text-xs">{label}</div>
    </div>
  );
}

function DetailCard({ label, value }) {
  return (
    <div className="rounded-[20px] border border-white/10 bg-black/20 p-4">
      <div className="text-[11px] uppercase tracking-[0.18em] text-white/40 sm:text-xs">
        {label}
      </div>
      <div className="mt-1 text-base font-bold text-white sm:text-lg">{value}</div>
    </div>
  );
}