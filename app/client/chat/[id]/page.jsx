'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { getSupabase } from '@/lib/supabase';
import {
  AudioLines,
  ChevronLeft,
  SendHorizontal,
  Sparkles,
  MapPin,
  Mic,
  ShieldCheck,
  MessageCircle,
  BriefcaseBusiness,
  WalletCards,
  Wrench,
} from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { canAttemptAction, inspectTextSafety, safeExternalUrl } from '@/lib/security';
import {
  getServiceLabel,
  normalizeServiceSlug,
  readServiceIntent,
  saveServiceIntent,
  workerIntentSummary,
  workerServiceSlugs,
} from '@/lib/services';
import { useVoiceDictation } from '@/lib/useVoiceDictation';
import { useAudioRecorder } from '@/lib/useAudioRecorder';
import {
  hydrateAudioMessage,
  hydrateAudioMessages,
  normalizeAudioMessage,
  uploadChatAudio,
} from '@/lib/chatAudio';

const supabase = getSupabase();

const CHAT_SERVICE_WATERMARKS = [
  'Taxi', 'Chofer', 'Plomeria', 'Electricidad', 'Limpieza', 'Jardineria', 'Pintura', 'Albanileria',
  'Carpinteria', 'Cerrajeria', 'Mecanica', 'Refrigeracion', 'Mudanza', 'Fletes', 'Parrillero', 'Cocina',
  'Niñera', 'Cuidador', 'Enfermeria', 'Belleza', 'Maquillaje', 'Peluqueria', 'Masajes', 'Costura',
  'Tecnico PC', 'Celulares', 'Internet', 'Camara CCTV', 'Soldadura', 'Herreria', 'Vidrieria', 'Tapiceria',
  'Piscina', 'Fumigacion', 'Lavadero', 'Delivery', 'Mensajeria', 'Eventos', 'Fotografia', 'Video',
  'DJ', 'Musica', 'Profesor', 'Traduccion', 'Contabilidad', 'Abogacia', 'Arquitectura', 'Diseño',
  'Veterinaria', 'Mascotas', 'Seguridad', 'Servicio general',
];

function ChatServicePattern() {
  const icons = [Wrench, BriefcaseBusiness, WalletCards, Sparkles, MapPin, ShieldCheck];

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.16]"
        style={{
          backgroundImage: `
            radial-gradient(circle at 16px 16px, rgba(255,255,255,.58) 1.2px, transparent 1.4px),
            linear-gradient(135deg, transparent 0 44%, rgba(255,255,255,.25) 45% 46%, transparent 47% 100%)
          `,
          backgroundSize: '82px 82px, 118px 118px',
        }}
      />
      <div className="absolute inset-0 grid grid-cols-4 content-start gap-x-8 gap-y-9 p-6 text-white/20 sm:grid-cols-6">
        {CHAT_SERVICE_WATERMARKS.map((service, index) => {
          const Icon = icons[index % icons.length];
          return (
            <div key={`${service}-${index}`} className="flex -rotate-[18deg] flex-col items-center gap-1">
              <Icon size={22 + (index % 3) * 5} strokeWidth={2.4} />
              <span className="max-w-[74px] truncate text-[8px] font-black uppercase tracking-wide">{service}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function normalizeSlug(value) {
  return normalizeServiceSlug(value);
}

function splitWorkerServices(worker) {
  return workerServiceSlugs(worker);
}

function serviceLabelForWorker(worker) {
  return workerIntentSummary(worker).primaryLabel;
}

function formatTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function normalizeMessageRecord(message) {
  return normalizeAudioMessage(message);
}

function TypingBubble() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-1 rounded-[18px] rounded-tl-[4px] bg-[#dff7f5] px-4 py-3 shadow-sm">
        {[0, 1, 2].map((item) => (
          <span
            key={item}
            className="h-2 w-2 animate-bounce rounded-full bg-[#1e7f7a]"
            style={{ animationDelay: `${item * 120}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

function AudioMessage({ message }) {
  const src = message?.media_url || '';

  if (!src) {
    return <div className="font-semibold text-[#123437]/70">Audio no disponible</div>;
  }

  return (
    <audio
      controls
      preload="metadata"
      src={src}
      className="h-10 w-[220px] max-w-full"
    />
  );
}

export default function ChatPage() {
  const router = useRouter();
  const params = useParams();
  const chatId = params?.id;

  const [user, setUser] = useState(null);
  const [chatMeta, setChatMeta] = useState(null);
  const [workerProfile, setWorkerProfile] = useState(null);
  const [workerUserProfile, setWorkerUserProfile] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sendingAudio, setSendingAudio] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [counterpartTyping, setCounterpartTyping] = useState(false);
  const [activeJob, setActiveJob] = useState(null);
  const [requesting, setRequesting] = useState(false);
  const [sharingLocation, setSharingLocation] = useState(false);
  const [viewportHeight, setViewportHeight] = useState('100dvh');
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  const messagesWrapRef = useRef(null);
  const inputRef = useRef(null);
  const typingChannelRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const typingReadyRef = useRef(false);
  const lastTypingSentRef = useRef(0);
  const {
    isRecording,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useAudioRecorder();

  const {
    isListening,
    speechError,
    startDictation,
    stopDictation,
  } = useVoiceDictation({
    onTextChange: (nextText) => {
      setInput(nextText);
      broadcastTyping(nextText);
    },
  });

  useEffect(() => {
    if (speechError) toast.error(speechError);
  }, [speechError]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setUser(data.user);
      else router.replace('/auth/login');
    });
  }, [router]);

  useEffect(() => {
    if (!chatId || !user?.id) return;

    let alive = true;

    async function loadContext() {
      try {
        const { data: chat, error: chatError } = await supabase
          .from('chats')
          .select('*')
          .eq('id', chatId)
          .maybeSingle();

        if (chatError) throw chatError;
        if (!alive) return;

        if (!chat?.id) {
          toast.error('No encontramos este chat');
          router.replace('/client');
          return;
        }

        if (String(chat?.client_id || '') !== String(user.id)) {
          router.replace('/client');
          return;
        }

        setChatMeta(chat || null);

        if (chat?.worker_id) {
          const { data: worker } = await supabase
            .from('map_workers_view')
.select('*')
            .eq('user_id', chat.worker_id)
            .maybeSingle();

          const { data: workerExtra } = await supabase
            .from('worker_profiles')
            .select('*')
            .eq('user_id', chat.worker_id)
            .maybeSingle();

if (alive) setWorkerProfile({ ...(workerExtra || {}), ...(worker || {}) });

const { data: userProfile } = await supabase
  .from('profiles')
  .select('full_name, avatar_url')
  .eq('id', chat.worker_id)
  .maybeSingle();

if (alive) {
  setWorkerUserProfile(userProfile || null);
}

          let jobForChat = null;

          if (chat?.job_id) {
            const { data: linkedJob } = await supabase
              .from('jobs')
              .select('*')
              .eq('id', chat.job_id)
              .maybeSingle();

            jobForChat = linkedJob || null;
          }

          if (!jobForChat) {
            const { data: jobs } = await supabase
              .from('jobs')
              .select('*')
              .eq('client_id', user.id)
              .eq('worker_id', chat.worker_id)
              .in('status', [
                'open',
                'scheduled',
                'accepted',
                'assigned',
              ])
              .order('created_at', { ascending: false })
              .limit(1);

            jobForChat = jobs?.[0] || null;
          }

          if (alive) setActiveJob(jobForChat);
        }
      } catch (err) {
        console.error(err);
        toast.error('No pudimos cargar el chat');
      }
    }

    loadContext();

    return () => {
      alive = false;
    };
  }, [chatId, user?.id]);

  useEffect(() => {
    if (!chatId || !user?.id) return;

    let alive = true;

    async function loadMessages() {
      try {
        setLoadingMessages(true);

        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('chat_id', chatId)
          .order('created_at', { ascending: true });

        if (error) throw error;
        if (alive) {
          const hydrated = await hydrateAudioMessages({ supabase, messages: data || [] });
          setMessages(hydrated);
        }
      } catch (err) {
        console.error(err);
        toast.error('No pudimos cargar mensajes');
      } finally {
        if (alive) setLoadingMessages(false);
      }
    }

    loadMessages();

    const channel = supabase
      .channel(`chat-room-${chatId}`, {
        config: {
          broadcast: { self: false },
        },
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          const nextMessage = normalizeMessageRecord(payload.new);
          hydrateAudioMessage({ supabase, message: nextMessage }).then((readyMessage) => {
            if (!readyMessage) return;
            setMessages((prev) => {
              if (prev.some((m) => m.id === readyMessage.id)) return prev;
              return [...prev, readyMessage];
            });
          });
        }
      )
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (!payload?.user_id || String(payload.user_id) === String(user.id)) return;

        setCounterpartTyping(true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          setCounterpartTyping(false);
          typingTimeoutRef.current = null;
        }, 2200);
      })
      .subscribe((status) => {
        typingReadyRef.current = status === 'SUBSCRIBED';
      });

    typingChannelRef.current = channel;

    return () => {
      alive = false;
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
      typingReadyRef.current = false;
      typingChannelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [chatId, user?.id]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncViewport = () => {
      const visualViewport = window.visualViewport;
      const height = Math.round(visualViewport?.height || window.innerHeight);
      const offset = Math.max(
        0,
        Math.round(window.innerHeight - height - (visualViewport?.offsetTop || 0))
      );

      setViewportHeight(`${height}px`);
      setKeyboardOffset(offset);
    };

    syncViewport();
    window.addEventListener('resize', syncViewport);
    window.visualViewport?.addEventListener('resize', syncViewport);
    window.visualViewport?.addEventListener('scroll', syncViewport);

    return () => {
      window.removeEventListener('resize', syncViewport);
      window.visualViewport?.removeEventListener('resize', syncViewport);
      window.visualViewport?.removeEventListener('scroll', syncViewport);
    };
  }, []);

  useEffect(() => {
    const wrap = messagesWrapRef.current;
    if (!wrap) return;

    wrap.scrollTo({
      top: wrap.scrollHeight,
      behavior: keyboardOffset > 40 ? 'auto' : 'smooth',
    });
  }, [messages, counterpartTyping, keyboardOffset]);

  const workerName =
  workerUserProfile?.full_name ||
  workerProfile?.full_name ||
  'Trabajador';
 const workerAvatar =
  workerProfile?.avatar_url ||
  workerProfile?.profile_photo_url ||
  workerProfile?.photo_url ||
  workerUserProfile?.avatar_url ||
  '/avatar-fallback.png';
  const chatServiceSlug = normalizeSlug(
    activeJob?.service_type ||
    chatMeta?.service_type ||
    readServiceIntent()?.serviceSlug ||
    ''
  );
  const workerService = String(
    chatServiceSlug
      ? getServiceLabel(chatServiceSlug)
      : serviceLabelForWorker(workerProfile) || 'Servicio general'
  );

  const suggestionChips = useMemo(
    () => [
      `Hola, ¿seguís disponible para ${workerService.toLowerCase()}?`,
      'Necesito este servicio hoy',
      '¿Cuánto tardás en llegar?',
    ],
    [workerService]
  );

function broadcastTyping(nextValue) {
  if (!user?.id || !chatId || !nextValue.trim()) return;

  const now = Date.now();
  if (now - lastTypingSentRef.current < 1200) return;
  lastTypingSentRef.current = now;

  if (!typingReadyRef.current || !typingChannelRef.current) return;

  typingChannelRef.current.send({
    type: 'broadcast',
    event: 'typing',
    payload: {
      user_id: user.id,
      chat_id: chatId,
      at: now,
    },
  });
}

function toggleVoiceDictation() {
  if (isListening) {
    stopDictation();
    return;
  }

  startDictation({ currentText: input });
  setTimeout(() => inputRef.current?.focus(), 80);
}

async function postChatMessage(text) {
  const { data, error } = await supabase.rpc('post_chat_message', {
    p_chat_id: chatId,
    p_text: text,
  });

  if (error) throw error;
  return normalizeMessageRecord(Array.isArray(data) ? data[0] : data);
}

async function sendMessage(e) {
  e.preventDefault();

  const safety = inspectTextSafety(input);
  if (!safety.ok || !user?.id || !chatId) {
    if (safety.error) toast.error(safety.error);
    return;
  }

  const attempt = canAttemptAction(`client-chat:${chatId}:${user.id}`, { limit: 8, windowMs: 60_000 });
  if (!attempt.allowed) {
    toast.warning('Estás enviando muy rápido. Esperá unos segundos.');
    return;
  }

  try {
    setSending(true);

    const data = await postChatMessage(safety.text);

    setMessages((prev) => {
      if (!data || prev.some((m) => m.id === data.id)) return prev;
      return [...prev, data];
    });

    setInput('');
  } catch (err) {
    console.error('Error enviando mensaje:', err);
    toast.error('Error enviando mensaje');
  } finally {
    setSending(false);
  }
}

async function sendAudioMessage(blob, durationMs = 0) {
  if (!user?.id || !chatId || !blob || sendingAudio) return;

  try {
    setSendingAudio(true);

    const audio = await uploadChatAudio({
      supabase,
      chatId,
      userId: user.id,
      blob,
      durationMs,
    });

    const { data, error } = await supabase
      .from('messages')
      .insert({
        chat_id: chatId,
        sender_id: user.id,
        text: '[audio]',
        content: '[audio]',
        body: '[audio]',
        message_type: 'audio',
        media_path: audio.mediaPath,
        media_url: audio.mediaUrl,
        metadata: audio.metadata,
      })
      .select('*')
      .single();

    if (error) throw error;

    const saved = await hydrateAudioMessage({ supabase, message: data });
    if (saved?.id) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === saved.id)) return prev;
        return [...prev, saved];
      });
    }
  } catch (err) {
    console.error('Error enviando audio:', err);
    toast.error(err?.message || 'Error enviando audio');
  } finally {
    setSendingAudio(false);
  }
}

async function toggleAudioRecording() {
  if (sendingAudio) return;

  if (isRecording) {
    try {
      const result = await stopRecording();
      if (!result?.blob?.size) {
        toast.error('No se grabo audio');
        return;
      }

      await sendAudioMessage(result.blob, result.durationMs);
    } catch (err) {
      console.error('Error deteniendo audio:', err);
      toast.error(err?.message || 'No se pudo enviar el audio');
      cancelRecording();
    }
    return;
  }

  try {
    await startRecording();
    toast.message('Grabando audio. Toca de nuevo para enviar.');
  } catch (err) {
    console.error('Error iniciando audio:', err);
    toast.error(err?.message || 'No se pudo iniciar la grabacion');
  }
}
async function shareClientLocation() {
  if (!user?.id || !chatId) return;

  if (!navigator.geolocation) {
    toast.error('Tu navegador no permite compartir ubicación');
    return;
  }

  try {
    setSharingLocation(true);

    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: 12000,
        maximumAge: 15000,
      });
    });

    const lat = position.coords.latitude;
    const lng = position.coords.longitude;

    let job = activeJob;

    if (!job?.id) {
      await requestWorkerFromChat('Te comparto mi ubicación para que puedas venir.');
      return;
    }

    const { error: jobError } = await supabase
  .from('jobs')
  .update({
    client_lat: lat,
    client_lng: lng,
  })
  .eq('id', job.id);

    if (jobError) throw jobError;

    await postChatMessage('Te comparti mi ubicacion.');

    setActiveJob((prev) =>
      prev
        ? {
            ...prev,
            client_lat: lat,
            client_lng: lng,
          }
        : prev
    );

    toast.success('Ubicación compartida con el trabajador');
  } catch (err) {
    console.error('Error compartiendo ubicación:', err);
    toast.error('No pudimos compartir tu ubicación');
  } finally {
    setSharingLocation(false);
  }
}

function openSharedLocationFromChat() {
  const lat = activeJob?.client_lat;
  const lng = activeJob?.client_lng;

  if (lat == null || lng == null) {
    toast.error('Ubicación no disponible todavía');
    return;
  }

  const mapUrl = safeExternalUrl(
    `https://www.google.com/maps/search/?api=1&query=${Number(lat)},${Number(lng)}`,
    { allowedHosts: ['google.com'] }
  );
  if (!mapUrl) return;

  window.open(mapUrl, '_blank', 'noopener,noreferrer');
}
async function requestWorkerFromChat(customText = '') {
  if (!user?.id || !chatMeta?.worker_id || !chatId) return;

  if (
    activeJob &&
    ['open', 'scheduled', 'accepted', 'assigned'].includes(
      String(activeJob.status || '').toLowerCase()
    )
  ) {
    toast.info('Ya tenés una solicitud activa con este trabajador');
    return;
  }

  try {
    setRequesting(true);

    const chosenService = normalizeSlug(
      activeJob?.service_type ||
      chatServiceSlug ||
      readServiceIntent()?.serviceSlug ||
      splitWorkerServices(workerProfile)[0] ||
      workerProfile?.service_type ||
      ''
    );

    const serviceLabel = getServiceLabel(chosenService, workerService || serviceLabelForWorker(workerProfile));

    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert([
        {
          client_id: user.id,
          worker_id: chatMeta.worker_id,
          service_type: chosenService || null,
          status: 'open',
          description: `Servicio: ${serviceLabel} · Solicitado desde chat`,
        },
      ])
      .select('*')
      .single();

    if (jobError) throw jobError;

    const { error: chatError } = await supabase
      .from('chats')
      .update({ job_id: job.id })
      .eq('id', chatId);

    if (chatError) throw chatError;

    const customMessage = typeof customText === 'string' ? customText : '';
    const finalText =
      customMessage ||
      `Hola, quiero solicitar tu servicio de ${String(serviceLabel).toLowerCase()}.`;
    const requestSafety = inspectTextSafety(finalText, { maxLength: 500 });
    if (!requestSafety.ok) throw new Error(requestSafety.error);

    await postChatMessage(requestSafety.text);

    try {
      localStorage.setItem(
        'activeJobChat',
        JSON.stringify({
          jid: job.id,
          jstatus: job.status,
          cid: chatId,
          selectedWorker: workerProfile || null,
          serviceIntent: {
            serviceSlug: chosenService || null,
            serviceName: serviceLabel,
          },
        })
      );
    } catch {}

    saveServiceIntent({
      role: 'client',
      serviceSlug: chosenService,
      serviceName: serviceLabel,
      source: 'client_chat_request',
    });

    setActiveJob(job);
    setInput('');
    toast.success('Solicitud enviada al trabajador');
  } catch (err) {
    console.error('requestWorkerFromChat error', err);
    toast.error(err?.message || 'No pudimos solicitar');
  } finally {
    setRequesting(false);
  }
}

 return (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="h-[100dvh] overflow-hidden bg-[#63c0ba] text-[#123437]"
    style={{ height: viewportHeight }}
  >
    <div className="mx-auto flex h-full max-w-3xl flex-col bg-[#63c0ba]">
      <header className="z-20 border-b border-white/35 bg-[#63c0ba]/95 px-3 py-2 shadow-[0_10px_28px_rgba(18,52,55,0.10)] backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/18 text-white active:bg-white/28"
          >
            <ChevronLeft size={24} />
          </button>

          <img
            src={workerAvatar}
            onError={(e) => {
              e.currentTarget.src = '/avatar-fallback.png';
            }}
            alt={workerName}
            className="h-11 w-11 rounded-full border-2 border-white object-cover"
          />

          <div className="min-w-0 flex-1">
            <div className="truncate text-[17px] font-black text-white">
              {workerName}
            </div>

            <div className="mt-0.5 flex min-w-0 items-center gap-2 text-[12px] font-bold text-white/82">
              <span className="truncate">{chatServiceSlug ? `Consulta por ${workerService}` : workerService}</span>

              {workerProfile?._distKm != null && (
                <span className="inline-flex shrink-0 items-center gap-1">
                  <MapPin size={11} />
                  {Number(workerProfile._distKm).toFixed(1)} km
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={requestWorkerFromChat}
            disabled={requesting}
            className="rounded-full bg-white px-4 py-2 text-[12px] font-black text-[#1e4e53] shadow-[0_10px_24px_rgba(18,52,55,0.12)] disabled:opacity-60"
          >
            {activeJob ? 'Ver pedido' : 'Solicitar'}
          </button>
        </div>
      </header>

      <main
        ref={messagesWrapRef}
        className="relative flex-1 overflow-y-auto px-3 py-4"
      >
        <ChatServicePattern />

        <div className="relative z-10 pb-24">
          <div className="mx-auto mb-4 w-fit rounded-lg bg-white/28 px-3 py-1 text-[12px] font-black text-[#1e4e53] backdrop-blur-md">
            Hoy
          </div>

          {!loadingMessages && messages.length > 0 && (
            <div className="mx-auto mb-5 max-w-[330px] rounded-xl bg-white/72 px-4 py-3 text-center text-[12px] font-bold leading-5 text-[#1e4e53] shadow-sm backdrop-blur-md">
              <ShieldCheck size={14} className="mb-1 inline text-[#1e4e53]" /> Los mensajes están protegidos dentro de ManosYA. Solicitá cuando ya te cierre el trabajo.
            </div>
          )}

          {loadingMessages ? (
            <div className="flex h-[60vh] items-center justify-center text-sm font-black text-white/85">
              Cargando conversación...
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-[60vh] flex-col items-center justify-center text-center text-white/90">
              <div className="rounded-full bg-white/22 p-4">
                <MessageCircle size={28} />
              </div>
              <div className="mt-4 text-lg font-black text-white">
                Arrancá la conversación
              </div>
              <div className="mt-2 max-w-[280px] text-sm font-semibold text-white/80">
                Preguntá disponibilidad, precio o tiempo antes de solicitar.
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {messages.map((m) => {
                const mine = m.sender_id === user?.id;
                const messageText = String(m.text || m.content || '');
                const isAudio = m.message_type === 'audio';

                return (
                  <div
                    key={m.id || `${m.sender_id || 'message'}-${m.created_at || messageText}`}
                    className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`relative max-w-[82%] rounded-[18px] px-3 py-2 text-[14px] leading-5 shadow-sm ${
                        mine
                          ? 'rounded-tr-[4px] bg-white text-[#123437]'
                          : 'rounded-tl-[4px] bg-[#dff7f5] text-[#123437]'
                      }`}
                    >
                    {String(m.text || '').includes('📍 Te compartí mi ubicación.') ? (
  <button
    type="button"
    onClick={openSharedLocationFromChat}
    className="
      w-[260px] overflow-hidden
      rounded-[22px]
      bg-white
      text-left
      shadow-[0_10px_28px_rgba(15,23,42,0.10)]
      transition-all
      active:scale-[0.98]
    "
  >
    <div className="relative h-[118px] overflow-hidden bg-[#dff7f5]">
      <div
        className="absolute inset-0 opacity-80"
        style={{
          backgroundImage: `
            linear-gradient(90deg, rgba(24,184,170,.18) 1px, transparent 1px),
            linear-gradient(rgba(24,184,170,.18) 1px, transparent 1px)
          `,
          backgroundSize: '26px 26px',
        }}
      />

      <div className="absolute left-[-18px] top-8 h-7 w-[130%] rotate-[-10deg] rounded-full bg-white/70" />
      <div className="absolute left-[-22px] top-14 h-6 w-[130%] rotate-[16deg] rounded-full bg-white/80" />

      <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
        <div className="relative">
          <img
            src={workerAvatar || '/avatar-fallback.png'}
            onError={(e) => {
              e.currentTarget.src = '/avatar-fallback.png';
            }}
            alt={workerName || 'Trabajador'}
            className="h-16 w-16 rounded-full border-[4px] border-white object-cover shadow-[0_12px_30px_rgba(15,23,42,0.25)]"
          />

          <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-[3px] border-white bg-[#18b8aa] text-white shadow-md">
            <MapPin size={14} />
          </span>
        </div>
      </div>

      <div className="absolute bottom-2 left-2 rounded-full bg-white/92 px-2.5 py-1 text-[10px] font-black text-[#123437] shadow-sm">
        Mapa compartido
      </div>
    </div>

    <div className="p-3">
      <div className="text-[14px] font-black text-[#123437]">
        Ubicación compartida
      </div>

      <div className="mt-1 text-[12px] font-semibold text-[#123437]/60">
        Tocá la tarjeta para abrir el mapa
      </div>

      <div className="mt-3 flex items-center justify-center gap-2 rounded-full bg-[#18b8aa] px-3 py-2.5 text-[12px] font-black text-white shadow-[0_10px_24px_rgba(24,184,170,0.24)]">
        <MapPin size={14} />
        Ver ubicación
      </div>
    </div>
  </button>
) : isAudio ? (
  <AudioMessage message={m} />
) : (
  <div className="whitespace-pre-wrap break-words font-semibold">
    {m.text || ''}
  </div>
)}

                      <div className="mt-1 text-right text-[10px] font-bold text-[#1e4e53]/55">
                        {formatTime(m.created_at)}
                      </div>
                    </div>
                  </div>
                );
              })}

              {counterpartTyping ? <TypingBubble /> : null}
            </div>
          )}
        </div>
      </main>

      {!messages.length && !loadingMessages && (
        <div className="bg-[#63c0ba] px-3 pb-2">
          <div className="flex gap-2 rounded-xl bg-white/28 p-3 text-[12px] font-bold leading-5 text-[#1e4e53] backdrop-blur-md">
            <ShieldCheck size={15} className="mt-0.5 shrink-0 text-[#1e4e53]" />
            Primero conversá. Cuando ya esté claro el trabajo, tocá Solicitar.
          </div>
        </div>
      )}

      <form
        onSubmit={sendMessage}
        className="border-t border-white/30 bg-[#63c0ba] px-3 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-2"
      >
        <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
  {suggestionChips.map((chip) => {
    const isRequestChip = normalizeText(chip).includes('necesito este servicio');

    return (
      <button
        key={chip}
        type="button"
        onClick={() => {
         if (isRequestChip) {
  setInput(chip);
  broadcastTyping(chip);
  return;
}

          setInput(chip);
          broadcastTyping(chip);
        }}
        disabled={requesting}
        className="whitespace-nowrap rounded-full bg-white/28 px-3 py-2 text-[11px] font-black text-[#1e4e53] backdrop-blur-md active:bg-white/45 disabled:opacity-60"
      >
        {chip}
      </button>
    );
  })}
</div>

        {isListening ? (
          <div className="mb-2 px-2 text-[11px] font-black text-[#123437]/75">
            Escuchando...
          </div>
        ) : null}

        <div className="flex items-end gap-2">
  <button
    type="button"
    onClick={shareClientLocation}
    disabled={sharingLocation}
    className="
      flex h-12 w-12 shrink-0 items-center justify-center
      rounded-full bg-white/38 text-[#1e4e53]
      shadow-[0_10px_26px_rgba(18,52,55,0.14)]
      backdrop-blur-md active:scale-95
      disabled:opacity-50
    "
  >
    <MapPin size={20} strokeWidth={2.7} />
  </button>

  <div className="flex min-h-[48px] flex-1 items-center rounded-[24px] bg-white/38 px-4 shadow-[0_10px_28px_rgba(18,52,55,0.10)] backdrop-blur-md">
    <input
      ref={inputRef}
      value={input}
      onChange={(e) => {
        setInput(e.target.value);
        broadcastTyping(e.target.value);
      }}
      onFocus={() => {
        setTimeout(() => {
          const wrap = messagesWrapRef.current;
          if (!wrap) return;
          wrap.scrollTo({ top: wrap.scrollHeight, behavior: 'auto' });
        }, 80);
      }}
      placeholder="Escribí un mensaje"
      className="h-12 flex-1 bg-transparent text-[15px] font-bold text-[#123437] outline-none placeholder:text-[#1e4e53]/55"
    />
  </div>

  <button
    type="button"
    onClick={toggleVoiceDictation}
    className={[
      'flex h-12 w-12 shrink-0 items-center justify-center rounded-full shadow-[0_10px_26px_rgba(18,52,55,0.14)] backdrop-blur-md transition active:scale-95',
      isListening
        ? 'animate-pulse bg-[#123437] text-white'
        : 'bg-white/38 text-[#1e4e53]',
    ].join(' ')}
    aria-label={isListening ? 'Detener dictado' : 'Dictar mensaje'}
  >
    <Mic size={20} strokeWidth={2.7} />
  </button>

  {!input.trim() ? (
    <button
      type="button"
      onClick={toggleAudioRecording}
      disabled={sendingAudio}
      className={[
        'flex h-12 w-12 shrink-0 items-center justify-center rounded-full shadow-[0_10px_26px_rgba(18,52,55,0.14)] backdrop-blur-md transition active:scale-95 disabled:opacity-45',
        isRecording ? 'animate-pulse bg-[#123437] text-white' : 'bg-white/38 text-[#1e4e53]',
      ].join(' ')}
      aria-label={isRecording ? 'Enviar audio' : 'Grabar audio'}
    >
      {sendingAudio ? (
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#1e4e53] border-t-transparent" />
      ) : (
        <AudioLines size={20} strokeWidth={2.7} />
      )}
    </button>
  ) : null}

  <button
    type="submit"
    disabled={sending || !input.trim()}
    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-[#1e4e53] shadow-[0_10px_26px_rgba(18,52,55,0.16)] disabled:opacity-45"
  >
    <SendHorizontal size={19} strokeWidth={2.7} />
  </button>
</div>
      </form>
    </div>
  </motion.div>
);
}
