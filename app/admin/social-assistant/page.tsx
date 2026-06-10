'use client';

import { useMemo, useState } from 'react';
import {
  Clipboard,
  Copy,
  Loader2,
  MessageCircle,
  Send,
  ShieldCheck,
  Sparkles,
  UserRoundSearch,
} from 'lucide-react';
import { toast } from 'sonner';
import RequireAdmin from '@/components/RequireAdmin';
import { getSupabase } from '@/lib/supabase';
import type {
  SocialAssistantContext,
  SocialAssistantResponse,
} from '@/lib/social-assistant/types';

const CONTEXT_OPTIONS: Array<{
  value: SocialAssistantContext;
  label: string;
  hint: string;
}> = [
  { value: 'private_message', label: 'Mensaje privado', hint: 'Inbox personal copiado manualmente.' },
  { value: 'friend_request', label: 'Solicitud de amistad', hint: 'Para iniciar conversación después de revisar el perfil.' },
  { value: 'public_comment', label: 'Comentario público', hint: 'Respuesta breve para una publicación.' },
  { value: 'story_reply', label: 'Respuesta a historia', hint: 'Seguir la charla de forma liviana.' },
  { value: 'unknown', label: 'No sé todavía', hint: 'La IA detecta la intención sin asumir demasiado.' },
  { value: 'user', label: 'Usuario que busca servicio', hint: 'Persona que podría necesitar ayuda.' },
  { value: 'worker', label: 'Trabajador/oficio', hint: 'Persona que ofrece un servicio.' },
  { value: 'supplier', label: 'Proveedor/comercio', hint: 'Negocio, local o venta de productos.' },
  { value: 'curious', label: 'Curioso', hint: 'Interés general, todavía sin intención clara.' },
  { value: 'flirty', label: 'Coqueteo', hint: 'Responder con humor suave y redirigir.' },
  { value: 'support', label: 'Reclamo/soporte', hint: 'Pedir ciudad y resumen corto.' },
];

const EMPTY_RESULT: SocialAssistantResponse = {
  shortReply: '',
  naturalReply: '',
  warmReply: '',
  detectedLeadType: 'CURIOUS_LEAD',
  suggestedNextStep: '',
};

function leadLabel(value: string) {
  switch (value) {
    case 'USER_LEAD':
      return 'Usuario';
    case 'WORKER_LEAD':
      return 'Trabajador';
    case 'SUPPLIER_LEAD':
      return 'Proveedor';
    case 'FLIRTY_LEAD':
      return 'Coqueteo';
    case 'UNSAFE_LEAD':
      return 'Límite';
    default:
      return 'Curioso';
  }
}

async function copyReply(text: string) {
  if (!text.trim()) return;
  await navigator.clipboard.writeText(text);
  toast.success('Respuesta copiada');
}

function ReplyCard({
  title,
  description,
  text,
  tone,
}: {
  title: string;
  description: string;
  text: string;
  tone: 'short' | 'natural' | 'warm';
}) {
  const toneClass = {
    short: 'from-slate-950 to-slate-800',
    natural: 'from-[#18b8aa] to-cyan-500',
    warm: 'from-emerald-600 to-teal-500',
  }[tone];

  return (
    <article className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_16px_42px_rgba(15,23,42,0.07)]">
      <div className={`bg-gradient-to-r ${toneClass} px-5 py-4 text-white`}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-black">{title}</h3>
            <p className="mt-1 text-sm font-semibold text-white/75">{description}</p>
          </div>

          <button
            type="button"
            onClick={() => copyReply(text)}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/18 text-white transition active:scale-95"
            aria-label={`Copiar respuesta ${title}`}
          >
            <Copy size={19} />
          </button>
        </div>
      </div>

      <div className="p-5">
        <pre className="min-h-[156px] whitespace-pre-wrap break-words rounded-[22px] border border-slate-100 bg-slate-50 p-4 font-sans text-[15px] font-semibold leading-7 text-slate-800">
          {text || 'La respuesta aparecerá acá.'}
        </pre>
      </div>
    </article>
  );
}

function SocialAssistantPageContent() {
  const [message, setMessage] = useState('');
  const [context, setContext] = useState<SocialAssistantContext>('unknown');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SocialAssistantResponse>(EMPTY_RESULT);

  const selectedContext = useMemo(
    () => CONTEXT_OPTIONS.find((item) => item.value === context) || CONTEXT_OPTIONS[0],
    [context]
  );

  async function generateReply() {
    const cleanMessage = message.trim();

    if (!cleanMessage) {
      toast.warning('Pegá un mensaje primero');
      return;
    }

    setLoading(true);

    try {
      const supabase = getSupabase();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        toast.error('Tu sesión expiró. Volvé a iniciar sesión.');
        return;
      }

      const response = await fetch('/api/admin/social-assistant', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: cleanMessage,
          context,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'No se pudo generar la respuesta');
      }

      setResult(data);
      toast.success('Respuestas generadas');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo generar la respuesta');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_14%_0%,rgba(98,191,185,0.24),transparent_34%),linear-gradient(180deg,#f7fffd_0%,#f8fafc_54%,#eef8f7_100%)] px-4 py-5 text-slate-950 md:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <section className="overflow-hidden rounded-[32px] bg-slate-950 p-5 text-white shadow-[0_24px_70px_rgba(15,23,42,0.20)] md:p-7">
          <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:items-center">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#62bfb9]/25 bg-[#62bfb9]/10 px-3 py-2 text-xs font-black uppercase tracking-[0.22em] text-[#9af7ef]">
                <ShieldCheck size={15} />
                Copiloto manual
              </div>

              <h1 className="max-w-3xl text-3xl font-black leading-tight tracking-tight md:text-5xl">
                Respuestas humanas para Facebook personal
              </h1>

              <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-white/68 md:text-base">
                Pegá mensajes, solicitudes, comentarios o respuestas a historias.
                La IA prepara opciones y Roger mantiene el control: copia y responde manualmente.
              </p>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/8 p-5 backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#18b8aa] text-white">
                  <UserRoundSearch size={23} />
                </div>
                <div>
                  <div className="text-sm font-black uppercase tracking-[0.16em] text-white/48">
                    Contexto actual
                  </div>
                  <div className="mt-1 text-xl font-black">{selectedContext.label}</div>
                </div>
              </div>

              <p className="mt-4 text-sm font-semibold leading-6 text-white/60">
                {selectedContext.hint}
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[390px_minmax(0,1fr)]">
          <div className="space-y-5">
            <div className="rounded-[30px] border border-amber-200 bg-amber-50 p-5 shadow-[0_16px_42px_rgba(180,83,9,0.08)]">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h2 className="text-base font-black text-amber-950">Modo seguro para perfil personal</h2>
                  <p className="mt-1 text-sm font-semibold leading-6 text-amber-800/80">
                    Esta herramienta no entra a Facebook, no acepta solicitudes y no envía mensajes.
                    Solo prepara respuestas para copiar manualmente.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_16px_42px_rgba(15,23,42,0.06)]">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#62bfb9]/12 text-[#18b8aa]">
                  <Clipboard size={21} />
                </div>
                <div>
                  <h2 className="text-xl font-black">Mensaje recibido</h2>
                  <p className="text-sm font-semibold text-slate-500">Pegado manual desde Facebook personal.</p>
                </div>
              </div>

              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Pegá acá el mensaje que recibió Roger..."
                className="min-h-[220px] w-full resize-none rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-[15px] font-semibold leading-7 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#18b8aa] focus:bg-white"
                maxLength={3000}
              />

              <div className="mt-2 text-right text-xs font-bold text-slate-400">
                {message.length}/3000
              </div>
            </div>

            <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_16px_42px_rgba(15,23,42,0.06)]">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#62bfb9]/12 text-[#18b8aa]">
                  <MessageCircle size={21} />
                </div>
                <div>
                  <h2 className="text-xl font-black">Contexto</h2>
                  <p className="text-sm font-semibold text-slate-500">Opcional, ayuda a orientar el tono.</p>
                </div>
              </div>

              <div className="grid gap-2">
                {CONTEXT_OPTIONS.map((option) => {
                  const active = option.value === context;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setContext(option.value)}
                      className={`rounded-[20px] border px-4 py-3 text-left transition active:scale-[0.99] ${
                        active
                          ? 'border-[#18b8aa] bg-[#62bfb9]/12 text-slate-950 shadow-[0_10px_24px_rgba(24,184,170,0.10)]'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white'
                      }`}
                    >
                      <div className="text-sm font-black">{option.label}</div>
                      <div className="mt-0.5 text-xs font-semibold text-slate-500">{option.hint}</div>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={generateReply}
                disabled={loading}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#18b8aa] px-5 py-4 text-[15px] font-black text-white shadow-[0_16px_34px_rgba(24,184,170,0.26)] transition active:scale-[0.98] disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles size={19} />}
                Generar respuesta
              </button>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_16px_42px_rgba(15,23,42,0.06)]">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-2xl font-black">Resultado</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    Tres variantes listas para copiar manualmente.
                  </p>
                </div>

                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#62bfb9]/25 bg-[#62bfb9]/10 px-3 py-2 text-xs font-black text-[#128f86]">
                  <Send size={14} />
                  {leadLabel(result.detectedLeadType)}
                </div>
              </div>

              {result.suggestedNextStep && (
                <div className="mt-4 rounded-[22px] border border-slate-200 bg-slate-50 p-4 text-sm font-semibold leading-6 text-slate-600">
                  <span className="font-black text-slate-900">Siguiente paso sugerido: </span>
                  {result.suggestedNextStep}
                </div>
              )}
            </div>

            <div className="grid gap-5 xl:grid-cols-3">
              <ReplyCard
                title="Corta"
                description="Para responder rápido"
                text={result.shortReply}
                tone="short"
              />

              <ReplyCard
                title="Natural"
                description="Equilibrada y clara"
                text={result.naturalReply}
                tone="natural"
              />

              <ReplyCard
                title="Más humana"
                description="Cercana y cálida"
                text={result.warmReply}
                tone="warm"
              />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function AdminSocialAssistantPage() {
  return (
    <RequireAdmin>
      <SocialAssistantPageContent />
    </RequireAdmin>
  );
}
