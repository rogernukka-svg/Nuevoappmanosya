'use client';

import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Filter,
  Heart,
  Inbox,
  MessageCircle,
  Search,
  ShieldCheck,
  Sparkles,
  ThumbsUp,
  TrendingUp,
  Users,
  XCircle,
} from 'lucide-react';

const POSTS = [
  {
    id: 'post-1',
    title: 'Lanzamiento de trabajadores verificados en Ciudad del Este',
    date: 'Hoy · 08:20',
    status: 'Activa',
    text: 'En ManosYA seguimos verificando perfiles para que cada cliente sepa a quién invita a su casa o negocio.',
    likes: 284,
    loves: 96,
    comments: 58,
    sentiment: 'positive',
  },
  {
    id: 'post-2',
    title: 'Semana Santa con apoyo real para trabajadores',
    date: 'Ayer · 19:10',
    status: 'Activa',
    text: 'Queremos que más personas encuentren trabajo digno y formalizado con ManosYA.',
    likes: 191,
    loves: 71,
    comments: 33,
    sentiment: 'mixed',
  },
  {
    id: 'post-3',
    title: 'Explicación del proceso de verificación',
    date: 'Hace 2 días · 11:42',
    status: 'Activa',
    text: 'La verificación tarda entre 12 y 24 horas porque cuidamos tanto al trabajador como al cliente.',
    likes: 163,
    loves: 34,
    comments: 49,
    sentiment: 'mixed',
  },
];

const COMMENTS = [
  {
    id: 'c1',
    postId: 'post-1',
    author: 'María González',
    text: 'Muy buena idea, hace falta algo así en Paraguay. ¿Cómo me registro?',
    sentiment: 'positive',
    intent: 'worker',
    status: 'pending',
    time: 'Hace 12 min',
  },
  {
    id: 'c2',
    postId: 'post-1',
    author: 'Carlos Benítez',
    text: '¿Ya está disponible para clientes o todavía están en prueba?',
    sentiment: 'neutral',
    intent: 'client',
    status: 'pending',
    time: 'Hace 28 min',
  },
  {
    id: 'c3',
    postId: 'post-2',
    author: 'Lucía Rojas',
    text: 'Excelente. Por fin una app que piensa también en los trabajadores.',
    sentiment: 'positive',
    intent: 'support',
    status: 'reviewed',
    time: 'Hace 1 h',
  },
  {
    id: 'c4',
    postId: 'post-3',
    author: 'José Fernández',
    text: 'Demasiado tarda la verificación, deberían hacerlo más rápido.',
    sentiment: 'negative',
    intent: 'complaint',
    status: 'pending',
    time: 'Hace 2 h',
  },
  {
    id: 'c5',
    postId: 'post-1',
    author: 'Nadia Vera',
    text: 'Quiero poner a mi esposo para plomería, ¿se puede desde el celular?',
    sentiment: 'positive',
    intent: 'worker',
    status: 'assigned',
    time: 'Hace 2 h',
  },
  {
    id: 'c6',
    postId: 'post-2',
    author: 'Miguel Cáceres',
    text: 'Esto parece buena idea, pero ojalá no cobren comisión como otras apps.',
    sentiment: 'mixed',
    intent: 'objection',
    status: 'pending',
    time: 'Hace 3 h',
  },
  {
    id: 'c7',
    postId: 'post-3',
    author: 'Andrea Núñez',
    text: 'Necesito una persona de limpieza para mi oficina. Avísenme cuando abran al público.',
    sentiment: 'positive',
    intent: 'client',
    status: 'pending',
    time: 'Hace 5 h',
  },
  {
    id: 'c8',
    postId: 'post-2',
    author: 'Ramon Ayala',
    text: 'No entendí bien, ¿es solo para Ciudad del Este o también para otras ciudades?',
    sentiment: 'neutral',
    intent: 'question',
    status: 'reviewed',
    time: 'Hace 6 h',
  },
];

const reactionBadge = {
  positive: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  neutral: 'border-slate-200 bg-slate-100 text-slate-700',
  mixed: 'border-amber-200 bg-amber-50 text-amber-700',
  negative: 'border-rose-200 bg-rose-50 text-rose-700',
};

const statusBadge = {
  pending: 'border-amber-200 bg-amber-50 text-amber-700',
  reviewed: 'border-cyan-200 bg-cyan-50 text-cyan-700',
  assigned: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

const intentBadge = {
  worker: 'Trabajador',
  client: 'Cliente',
  support: 'A favor',
  complaint: 'Queja',
  objection: 'Objeción',
  question: 'Consulta',
};

function StatCard({ icon: Icon, label, value, hint }) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">{label}</p>
          <p className="mt-2 text-4xl font-black tracking-tight text-slate-950">{value}</p>
          <p className="mt-2 text-sm text-slate-500">{hint}</p>
        </div>

        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 text-white shadow-[0_12px_30px_rgba(16,185,129,0.28)]">
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

function MiniBar({ value, max = 100 }) {
  const width = Math.max(6, Math.min(100, (value / max) * 100));
  return (
    <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
      <div
        className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

export default function FacebookControlPage() {
  const [selectedPost, setSelectedPost] = useState(POSTS[0].id);
  const [query, setQuery] = useState('');
  const [sentimentFilter, setSentimentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const selectedPostData = useMemo(
    () => POSTS.find((post) => post.id === selectedPost) || POSTS[0],
    [selectedPost]
  );

  const totals = useMemo(() => {
    const totalLikes = POSTS.reduce((acc, post) => acc + post.likes, 0);
    const totalLoves = POSTS.reduce((acc, post) => acc + post.loves, 0);
    const totalComments = COMMENTS.length;
    const positive = COMMENTS.filter((item) => item.sentiment === 'positive').length;
    const negative = COMMENTS.filter((item) => item.sentiment === 'negative').length;
    const pending = COMMENTS.filter((item) => item.status === 'pending').length;

    return {
      totalLikes,
      totalLoves,
      totalComments,
      positive,
      negative,
      pending,
    };
  }, []);

  const filteredComments = useMemo(() => {
    return COMMENTS.filter((comment) => {
      const samePost = comment.postId === selectedPost;
      const matchesQuery =
        query.trim() === '' ||
        comment.text.toLowerCase().includes(query.toLowerCase()) ||
        comment.author.toLowerCase().includes(query.toLowerCase());

      const matchesSentiment =
        sentimentFilter === 'all' || comment.sentiment === sentimentFilter;

      const matchesStatus =
        statusFilter === 'all' || comment.status === statusFilter;

      return samePost && matchesQuery && matchesSentiment && matchesStatus;
    });
  }, [selectedPost, query, sentimentFilter, statusFilter]);

  const sentimentCounts = useMemo(() => {
    const current = COMMENTS.filter((c) => c.postId === selectedPost);
    return {
      positive: current.filter((c) => c.sentiment === 'positive').length,
      neutral: current.filter((c) => c.sentiment === 'neutral').length,
      mixed: current.filter((c) => c.sentiment === 'mixed').length,
      negative: current.filter((c) => c.sentiment === 'negative').length,
    };
  }, [selectedPost]);

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-[36px] bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950 px-6 py-8 text-white shadow-[0_25px_80px_rgba(2,6,23,0.28)] md:px-8">
          <div className="grid gap-8 lg:grid-cols-[1.4fr_0.8fr] lg:items-center">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.28em] text-emerald-300">
                <Sparkles className="h-3.5 w-3.5" />
                Centro de interacción Facebook
              </div>

              <h1 className="max-w-4xl text-4xl font-black leading-[0.95] tracking-tight text-white md:text-6xl">
                Inteligencia de marca, conversación y crecimiento
              </h1>

              <p className="mt-5 max-w-3xl text-base leading-7 text-slate-200 md:text-xl">
                Medí reacciones, detectá comentarios a favor o en contra, encontrá
                intención real de compra o registro y convertí Facebook en un
                centro de análisis para ManosYA y para otras empresas.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-[26px] border border-white/10 bg-white/5 p-5 backdrop-blur">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-300">
                  Posts
                </p>
                <p className="mt-3 text-4xl font-black">{POSTS.length}</p>
              </div>

              <div className="rounded-[26px] border border-white/10 bg-white/5 p-5 backdrop-blur">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-300">
                  Likes
                </p>
                <p className="mt-3 text-4xl font-black">{totals.totalLikes}</p>
              </div>

              <div className="rounded-[26px] border border-white/10 bg-white/5 p-5 backdrop-blur">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-300">
                  Me encanta
                </p>
                <p className="mt-3 text-4xl font-black">{totals.totalLoves}</p>
              </div>

              <div className="rounded-[26px] border border-white/10 bg-white/5 p-5 backdrop-blur">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-300">
                  Comentarios
                </p>
                <p className="mt-3 text-4xl font-black">{totals.totalComments}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={ThumbsUp}
            label="Total Me gusta"
            value={totals.totalLikes}
            hint="Volumen bruto de aprobación visible"
          />
          <StatCard
            icon={Heart}
            label="Total Me encanta"
            value={totals.totalLoves}
            hint="Interacción emocional más fuerte"
          />
          <StatCard
            icon={MessageCircle}
            label="Comentarios analizados"
            value={totals.totalComments}
            hint={`${totals.positive} positivos · ${totals.negative} negativos`}
          />
          <StatCard
            icon={Users}
            label="Pendientes de revisar"
            value={totals.pending}
            hint="Conversaciones aún sin gestión"
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <div className="space-y-6">
            <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-black text-slate-950">Publicaciones</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Elegí una publicación para analizar su comportamiento.
                  </p>
                </div>

                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  <BarChart3 className="h-5 w-5" />
                </div>
              </div>

              <div className="space-y-3">
                {POSTS.map((post) => {
                  const active = post.id === selectedPost;

                  return (
                    <button
                      key={post.id}
                      type="button"
                      onClick={() => setSelectedPost(post.id)}
                      className={`w-full rounded-[24px] border p-4 text-left transition-all ${
                        active
                          ? 'border-emerald-300 bg-emerald-50 shadow-[0_12px_30px_rgba(16,185,129,0.10)]'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-lg font-black leading-6 text-slate-950">
                            {post.title}
                          </p>
                          <p className="mt-2 text-sm text-slate-500">{post.date}</p>
                        </div>

                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-bold ${reactionBadge[post.sentiment]}`}
                        >
                          {post.sentiment === 'positive'
                            ? 'A favor'
                            : post.sentiment === 'negative'
                            ? 'En contra'
                            : 'Mixto'}
                        </span>
                      </div>

                      <p className="mt-4 text-sm leading-6 text-slate-600">
                        {post.text}
                      </p>

                      <div className="mt-4 grid grid-cols-3 gap-2 text-sm font-bold text-slate-700">
                        <div className="rounded-2xl bg-slate-100 px-3 py-3 text-center">
                          👍 {post.likes}
                        </div>
                        <div className="rounded-2xl bg-slate-100 px-3 py-3 text-center">
                          ❤️ {post.loves}
                        </div>
                        <div className="rounded-2xl bg-slate-100 px-3 py-3 text-center">
                          💬 {post.comments}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-slate-950">Radar de sentimiento</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Distribución de la conversación en esta publicación.
                  </p>
                </div>

                <Activity className="h-5 w-5 text-emerald-600" />
              </div>

              <div className="space-y-5">
                {[
                  { key: 'positive', label: 'A favor', value: sentimentCounts.positive },
                  { key: 'neutral', label: 'Neutros', value: sentimentCounts.neutral },
                  { key: 'mixed', label: 'Mixtos', value: sentimentCounts.mixed },
                  { key: 'negative', label: 'En contra', value: sentimentCounts.negative },
                ].map((item) => (
                  <div key={item.key}>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-700">{item.label}</span>
                      <span className="text-lg font-black text-slate-950">{item.value}</span>
                    </div>
                    <MiniBar value={item.value} max={Math.max(1, selectedPostData.comments)} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-3xl">
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Publicación seleccionada
                  </div>

                  <h2 className="text-4xl font-black leading-tight tracking-tight text-slate-950">
                    {selectedPostData.title}
                  </h2>

                  <p className="mt-4 text-base leading-7 text-slate-600">
                    {selectedPostData.text}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3 lg:min-w-[320px]">
                  <div className="rounded-[22px] bg-slate-100 px-4 py-4 text-center">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                      Likes
                    </p>
                    <p className="mt-2 text-3xl font-black text-slate-950">
                      {selectedPostData.likes}
                    </p>
                  </div>

                  <div className="rounded-[22px] bg-slate-100 px-4 py-4 text-center">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                      Loves
                    </p>
                    <p className="mt-2 text-3xl font-black text-slate-950">
                      {selectedPostData.loves}
                    </p>
                  </div>

                  <div className="rounded-[22px] bg-slate-100 px-4 py-4 text-center">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                      Comments
                    </p>
                    <p className="mt-2 text-3xl font-black text-slate-950">
                      {selectedPostData.comments}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <h2 className="text-2xl font-black text-slate-950">Bandeja de comentarios</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Leé, filtrá y clasificá la conversación real de la marca.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                    <Search className="h-4 w-4 text-slate-400" />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Buscar comentario"
                      className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                    />
                  </label>

                  <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                    <Filter className="h-4 w-4 text-slate-400" />
                    <select
                      value={sentimentFilter}
                      onChange={(e) => setSentimentFilter(e.target.value)}
                      className="w-full bg-transparent text-sm text-slate-900 outline-none"
                    >
                      <option value="all">Todo sentimiento</option>
                      <option value="positive">A favor</option>
                      <option value="neutral">Neutral</option>
                      <option value="mixed">Mixto</option>
                      <option value="negative">En contra</option>
                    </select>
                  </label>

                  <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                    <Clock3 className="h-4 w-4 text-slate-400" />
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full bg-transparent text-sm text-slate-900 outline-none"
                    >
                      <option value="all">Todo estado</option>
                      <option value="pending">Pendientes</option>
                      <option value="reviewed">Revisados</option>
                      <option value="assigned">Asignados</option>
                    </select>
                  </label>

                  <div className="flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white">
                    {filteredComments.length} visibles
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {filteredComments.length === 0 ? (
                  <div className="rounded-[26px] border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
                    <Inbox className="mx-auto h-10 w-10 text-slate-400" />
                    <p className="mt-3 text-lg font-black text-slate-800">
                      No encontramos comentarios con esos filtros.
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Probá cambiar la búsqueda o el estado.
                    </p>
                  </div>
                ) : (
                  filteredComments.map((comment) => (
                    <div
                      key={comment.id}
                      className="rounded-[28px] border border-slate-200 bg-slate-50 p-5"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-lg font-black text-slate-950">{comment.author}</p>

                            <span
                              className={`rounded-full border px-3 py-1 text-xs font-bold ${reactionBadge[comment.sentiment]}`}
                            >
                              {comment.sentiment === 'positive'
                                ? 'A favor'
                                : comment.sentiment === 'negative'
                                ? 'En contra'
                                : comment.sentiment === 'neutral'
                                ? 'Neutral'
                                : 'Mixto'}
                            </span>

                            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700">
                              {intentBadge[comment.intent] || comment.intent}
                            </span>

                            <span
                              className={`rounded-full border px-3 py-1 text-xs font-bold ${statusBadge[comment.status]}`}
                            >
                              {comment.status === 'pending'
                                ? 'Pendiente'
                                : comment.status === 'reviewed'
                                ? 'Revisado'
                                : 'Asignado'}
                            </span>
                          </div>

                          <p className="mt-4 text-base leading-7 text-slate-700">
                            {comment.text}
                          </p>

                          <div className="mt-4 flex items-center gap-2 text-sm font-medium text-slate-500">
                            <Clock3 className="h-4 w-4" />
                            {comment.time}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 lg:max-w-[300px] lg:justify-end">
                          <button className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-black text-emerald-700 hover:bg-emerald-100">
                            Marcar revisado
                          </button>

                          <button className="rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-xs font-black text-cyan-700 hover:bg-cyan-100">
                            Seguir por inbox
                          </button>

                          <button className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-700 hover:bg-slate-100">
                            Asignar admin
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-500">Comentarios a favor</p>
                    <p className="text-3xl font-black text-slate-950">{totals.positive}</p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-600">
                  Material útil para reputación, prueba social y mensajes promocionales.
                </p>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-500">Objeciones y dudas</p>
                    <p className="text-3xl font-black text-slate-950">
                      {COMMENTS.filter((c) => ['objection', 'question'].includes(c.intent)).length}
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-600">
                  Sirven para detectar fricciones y mejorar el discurso comercial.
                </p>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-700">
                    <XCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-500">En contra</p>
                    <p className="text-3xl font-black text-slate-950">{totals.negative}</p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-600">
                  Alertas reputacionales que conviene responder rápido.
                </p>
              </div>
            </div>

            <div className="rounded-[32px] bg-slate-950 p-6 text-white shadow-[0_24px_70px_rgba(2,6,23,0.24)]">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-4xl">
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.24em] text-cyan-300">
                    <TrendingUp className="h-3.5 w-3.5" />
                    Visión de negocio
                  </div>

                  <h3 className="text-3xl font-black tracking-tight text-white">
                    ManosYA puede vender este panel como servicio de inteligencia de marca
                  </h3>

                  <p className="mt-4 text-sm leading-7 text-slate-300 md:text-base">
                    No sirve solo para contar likes. Sirve para medir crecimiento,
                    reputación, intención, objeciones, calidad de respuesta,
                    oportunidades comerciales y comportamiento de audiencia.
                  </p>
                </div>

                <button className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-4 text-sm font-black text-slate-950 transition hover:translate-x-[1px]">
                  Continuar integración
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}