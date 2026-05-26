'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { getSupabase } from '@/lib/supabase';
import {
  ChevronLeft,
  SendHorizontal,
  Sparkles,
  MapPin,
  ShieldCheck,
  MessageCircle,
  BriefcaseBusiness,
  WalletCards,
  Wrench,
} from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

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
  return normalizeText(value)
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function splitWorkerServices(worker) {
  const raw = [];

  if (Array.isArray(worker?.skills)) raw.push(...worker.skills);
  else if (typeof worker?.skills === 'string') raw.push(...worker.skills.split(','));

  if (worker?.main_skill) raw.push(worker.main_skill);
  if (worker?.service_type) raw.push(worker.service_type);

  return raw.map((v) => String(v || '').trim()).filter(Boolean);
}

function serviceLabelForWorker(worker) {
  return splitWorkerServices(worker)[0] || 'Servicio general';
}

function formatTime(value) {
  if (!value) return '';
  return new Date(value).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
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
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [activeJob, setActiveJob] = useState(null);
  const [requesting, setRequesting] = useState(false);
  const [sharingLocation, setSharingLocation] = useState(false);

  const messagesWrapRef = useRef(null);

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
          .single();

        if (chatError) throw chatError;
        if (!alive) return;

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
            .select('full_name, avatar_url, profile_photo_url, service_type, main_skill, skills')
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

          if (alive) setActiveJob(jobs?.[0] || null);
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
        if (alive) setMessages(data || []);
      } catch (err) {
        console.error(err);
        toast.error('No pudimos cargar mensajes');
      } finally {
        if (alive) setLoadingMessages(false);
      }
    }

    loadMessages();

    const channel = supabase
      .channel(`client-chat-${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
        }
      )
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(channel);
    };
  }, [chatId, user?.id]);

  useEffect(() => {
    messagesWrapRef.current?.scrollTo({
      top: messagesWrapRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages]);

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
  const workerService = serviceLabelForWorker(workerProfile);

  const suggestionChips = useMemo(
    () => [
      `Hola, ¿seguís disponible para ${workerService.toLowerCase()}?`,
      'Necesito este servicio hoy',
      '¿Cuánto tardás en llegar?',
    ],
    [workerService]
  );

async function sendMessage(e) {
  e.preventDefault();

  const text = input.trim();
  if (!text || !user?.id || !chatId) return;

  try {
    setSending(true);

    const { data, error } = await supabase
      .from('messages')
      .insert([
        {
          chat_id: chatId,
          sender_id: user.id,
          text,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    setMessages((prev) => {
      if (prev.some((m) => m.id === data.id)) return prev;
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
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
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

    await supabase.from('messages').insert([
      {
        chat_id: chatId,
        sender_id: user.id,
        text: '📍 Te compartí mi ubicación.',
      },
    ]);

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

  window.open(
    `https://www.google.com/maps/search/?api=1&query=${Number(lat)},${Number(lng)}`,
    '_blank'
  );
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
      splitWorkerServices(workerProfile)[0] || workerProfile?.service_type || ''
    );

    const serviceLabel = workerService || serviceLabelForWorker(workerProfile);

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

    const finalText =
      customText ||
      `Hola, quiero solicitar tu servicio de ${String(serviceLabel).toLowerCase()}.`;

    await supabase.from('messages').insert([
      {
        chat_id: chatId,
        sender_id: user.id,
        text: finalText,
      },
    ]);

    try {
      localStorage.setItem(
        'activeJobChat',
        JSON.stringify({
          jid: job.id,
          jstatus: job.status,
          cid: chatId,
          selectedWorker: workerProfile || null,
        })
      );
    } catch {}

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
              <span className="truncate">{workerService}</span>

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

        <div className="relative z-10">
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

                return (
                  <div
                    key={m.id}
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
  return;
}

          setInput(chip);
        }}
        disabled={requesting}
        className="whitespace-nowrap rounded-full bg-white/28 px-3 py-2 text-[11px] font-black text-[#1e4e53] backdrop-blur-md active:bg-white/45 disabled:opacity-60"
      >
        {chip}
      </button>
    );
  })}
</div>

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
      value={input}
      onChange={(e) => setInput(e.target.value)}
      placeholder="Escribí un mensaje"
      className="h-12 flex-1 bg-transparent text-[15px] font-bold text-[#123437] outline-none placeholder:text-[#1e4e53]/55"
    />
  </div>

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
