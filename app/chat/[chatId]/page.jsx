'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { getSupabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  BriefcaseBusiness,
  AudioLines,
  Camera,
  ChevronLeft,
  ImageIcon,
  MapPin,
  MessageCircle,
  Mic,
  Plus,
  SendHorizontal,
  ShieldCheck,
  Sparkles,
  WalletCards,
  Wrench,
} from 'lucide-react';
import { toast } from 'sonner';
import { canAttemptAction, inspectTextSafety } from '@/lib/security';
import { getServiceLabel, normalizeServiceSlug } from '@/lib/services';
import { useVoiceDictation } from '@/lib/useVoiceDictation';
import { useAudioRecorder } from '@/lib/useAudioRecorder';
import {
  hydrateAudioMessage,
  hydrateAudioMessages,
  normalizeAudioMessage,
  uploadChatAudio,
  uploadChatMedia,
} from '@/lib/chatAudio';
import { userFriendlyError } from '@/lib/userFacingErrors';

const supabase = getSupabase();
const WORKER_CHAT_SEEN_MAP_KEY = 'manosya_worker_chat_seen_map';

const CHAT_SERVICE_WATERMARKS = [
  'Taxi',
  'Chofer',
  'Plomeria',
  'Electricidad',
  'Limpieza',
  'Jardineria',
  'Pintura',
  'Albanileria',
  'Carpinteria',
  'Cerrajeria',
  'Mecanica',
  'Refrigeracion',
  'Mudanza',
  'Fletes',
  'Parrillero',
  'Cocina',
  'Ninera',
  'Cuidador',
  'Enfermeria',
  'Belleza',
  'Maquillaje',
  'Peluqueria',
  'Masajes',
  'Costura',
  'Tecnico PC',
  'Celulares',
  'Internet',
  'Camara CCTV',
  'Soldadura',
  'Herreria',
  'Vidrieria',
  'Tapiceria',
  'Piscina',
  'Fumigacion',
  'Lavadero',
  'Delivery',
  'Mensajeria',
  'Eventos',
  'Fotografia',
  'Video',
  'DJ',
  'Musica',
  'Profesor',
  'Traduccion',
  'Contabilidad',
  'Abogacia',
  'Arquitectura',
  'Diseno',
  'Veterinaria',
  'Mascotas',
  'Seguridad',
  'Servicio general',
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
              <span className="max-w-[74px] truncate text-[8px] font-black uppercase tracking-wide">
                {service}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function markWorkerChatRead(chatId) {
  if (typeof window === 'undefined' || !chatId) return;
  try {
    const raw = localStorage.getItem(WORKER_CHAT_SEEN_MAP_KEY);
    const seenMap = raw ? JSON.parse(raw) : {};
    seenMap[String(chatId)] = Date.now();
    localStorage.setItem(WORKER_CHAT_SEEN_MAP_KEY, JSON.stringify(seenMap));
  } catch {}
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

function serviceLabelFromJob(job) {
  const serviceSource =
    job?.service_type ||
    job?.service_slug ||
    job?.service ||
    job?.category ||
    job?.title ||
    job?.description ||
    '';

  const slug = normalizeServiceSlug(serviceSource);
  return getServiceLabel(slug || serviceSource, 'Consulta');
}

function profileDisplayName(profile, fallback) {
  return String(profile?.full_name || profile?.name || fallback || 'ManosYA').trim();
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

function ChatMediaMessage({ message }) {
  const src = message?.media_url || '';
  const type = message?.message_type || '';

  if (!src) {
    return <div className="font-semibold text-[#123437]/70">Archivo no disponible</div>;
  }

  if (type === 'image') {
    return (
      <img
        src={src}
        alt="Imagen enviada"
        className="max-h-[260px] w-full max-w-[260px] rounded-[16px] object-cover"
      />
    );
  }

  if (type === 'video') {
    return (
      <video
        controls
        preload="metadata"
        src={src}
        className="max-h-[260px] w-full max-w-[260px] rounded-[16px] bg-black"
      />
    );
  }

  return <AudioMessage message={message} />;
}

export default function ChatPage() {
  const params = useParams();
  const chatId = params?.chatId;
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [chatMeta, setChatMeta] = useState(null);
  const [counterpartProfile, setCounterpartProfile] = useState(null);
  const [activeJob, setActiveJob] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sendingAudio, setSendingAudio] = useState(false);
  const [sendingMedia, setSendingMedia] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [counterpartTyping, setCounterpartTyping] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [viewportHeight, setViewportHeight] = useState('100dvh');
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  const inputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const messagesWrapRef = useRef(null);
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
    let alive = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!alive) return;
      if (data?.user) setUser(data.user);
      else router.replace('/auth/login');
    });

    return () => {
      alive = false;
    };
  }, [router]);

  useEffect(() => {
    if (!chatId || !user?.id) return;

    let alive = true;

    async function loadContext() {
      try {
        const { data: chat, error: chatError } = await supabase
          .from('chats')
          .select('id, job_id, client_id, worker_id, created_at')
          .eq('id', chatId)
          .maybeSingle();

        if (chatError) throw chatError;

        if (!chat?.id) {
          const { data: chatByJob, error: chatByJobError } = await supabase
            .from('chats')
            .select('id, job_id, client_id, worker_id, created_at')
            .eq('job_id', chatId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (chatByJobError) throw chatByJobError;

          if (chatByJob?.id) {
            router.replace(`/chat/${chatByJob.id}`);
            return;
          }

          toast.error('No encontramos este chat');
          router.replace('/worker/feed');
          return;
        }

        const isParticipant =
          String(chat.client_id) === String(user.id) ||
          String(chat.worker_id) === String(user.id);

        if (!isParticipant) {
          router.replace('/role-selector');
          return;
        }

        const counterpartId =
          String(chat.worker_id) === String(user.id) ? chat.client_id : chat.worker_id;

        const [{ data: profile }, { data: linkedJob }] = await Promise.all([
          counterpartId
            ? supabase
                .from('profiles')
                .select('id, full_name, avatar_url, role')
                .eq('id', counterpartId)
                .maybeSingle()
            : Promise.resolve({ data: null }),
          chat.job_id
            ? supabase.from('jobs').select('*').eq('id', chat.job_id).maybeSingle()
            : Promise.resolve({ data: null }),
        ]);

        if (!alive) return;

        setChatMeta(chat);
        setCounterpartProfile(profile || null);
        setActiveJob(linkedJob || null);
        markWorkerChatRead(chatId);
      } catch (error) {
        console.error('No se pudo cargar el contexto del chat:', error);
        toast.error('No pudimos cargar este chat');
      }
    }

    loadContext();

    return () => {
      alive = false;
    };
  }, [chatId, router, user?.id]);

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
          markWorkerChatRead(chatId);
        }
      } catch (error) {
        console.error('No se pudieron cargar los mensajes:', error);
        toast.error('No pudimos cargar mensajes');
      } finally {
        if (alive) setLoadingMessages(false);
      }
    }

    loadMessages();

    return () => {
      alive = false;
    };
  }, [chatId, user?.id]);

  useEffect(() => {
    if (!chatId || !user?.id) return;

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
          const incoming = normalizeMessageRecord(payload.new);
          if (!incoming) return;

          hydrateAudioMessage({ supabase, message: incoming }).then((readyMessage) => {
            if (!readyMessage) return;
            setMessages((prev) => {
              if (prev.some((message) => message.id === readyMessage.id)) return prev;
              return [...prev, readyMessage];
            });
          });

          markWorkerChatRead(chatId);
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

        if (status === 'CHANNEL_ERROR') {
          console.warn('Realtime de mensajes no disponible para este chat');
        }
      });

    typingChannelRef.current = channel;

    return () => {
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

  const isWorker = Boolean(user?.id && chatMeta?.worker_id && String(chatMeta.worker_id) === String(user.id));
  const counterpartName = profileDisplayName(counterpartProfile, isWorker ? 'Cliente' : 'Trabajador');
  const counterpartAvatar = counterpartProfile?.avatar_url || '/avatar-fallback.png';
  const serviceLabel = serviceLabelFromJob(activeJob);

  const suggestionChips = useMemo(() => {
    if (isWorker) {
      return [
        'Hola, si estoy disponible',
        'Te paso el precio ahora',
        'Para que hora necesitas?',
      ];
    }

    return [
      `Hola, seguis disponible para ${serviceLabel.toLowerCase()}?`,
      'Necesito este servicio hoy',
      'Cuanto me saldria?',
    ];
  }, [isWorker, serviceLabel]);

  async function sendMessage(event) {
    event.preventDefault();

    if (!user?.id || !chatId || sending) return;

    const safety = inspectTextSafety(input);
    if (!safety.ok) {
      toast.error(safety.error || 'Revisa el mensaje');
      return;
    }

    const attempt = canAttemptAction(`chat:${chatId}:${user.id}`, {
      limit: 10,
      windowMs: 60_000,
    });

    if (!attempt.allowed) {
      toast.error('Espera un poquito antes de enviar otro mensaje');
      return;
    }

    try {
      setSending(true);

      const { data, error } = await supabase.rpc('post_chat_message', {
        p_chat_id: chatId,
        p_text: safety.text,
      });

      if (error) throw error;

      const saved = normalizeMessageRecord(data);
      if (saved?.id) {
        setMessages((prev) => {
          if (prev.some((message) => message.id === saved.id)) return prev;
          return [...prev, saved];
        });
      }

      setInput('');
      inputRef.current?.focus();
      markWorkerChatRead(chatId);
    } catch (error) {
      console.error('No se pudo enviar el mensaje:', error);
      toast.error(userFriendlyError(error, 'No pudimos enviar el mensaje. Proba de nuevo.'));
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
          if (prev.some((message) => message.id === saved.id)) return prev;
          return [...prev, saved];
        });
      }

      markWorkerChatRead(chatId);
    } catch (error) {
      console.error('No se pudo enviar el audio:', error);
      toast.error(userFriendlyError(error, 'No pudimos enviar el audio. Proba otra vez.'));
    } finally {
      setSendingAudio(false);
    }
  }

  async function sendMediaMessage(file) {
    if (!user?.id || !chatId || !file || sendingMedia) return;

    try {
      setSendingMedia(true);
      setAttachOpen(false);

      const media = await uploadChatMedia({
        supabase,
        chatId,
        userId: user.id,
        file,
      });

      const label = media.messageType === 'image' ? '[foto]' : '[video]';
      const { data, error } = await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          sender_id: user.id,
          text: label,
          content: label,
          body: label,
          message_type: media.messageType,
          media_path: media.mediaPath,
          media_url: media.mediaUrl,
          metadata: media.metadata,
        })
        .select('*')
        .single();

      if (error) throw error;

      const saved = await hydrateAudioMessage({ supabase, message: data });
      if (saved?.id) {
        setMessages((prev) => {
          if (prev.some((message) => message.id === saved.id)) return prev;
          return [...prev, saved];
        });
      }

      markWorkerChatRead(chatId);
    } catch (error) {
      console.error('No se pudo enviar el archivo:', error);
      toast.error(userFriendlyError(error, 'No pudimos enviar el archivo. Proba con otro.'));
    } finally {
      setSendingMedia(false);
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      if (galleryInputRef.current) galleryInputRef.current.value = '';
    }
  }

  function handleMediaInput(event) {
    const file = event.target.files?.[0];
    if (file) sendMediaMessage(file);
  }

  async function shareMyLocation() {
    if (!navigator.geolocation || !user?.id || !chatId) {
      toast.error('Tu navegador no permite compartir ubicacion');
      return;
    }

    try {
      setAttachOpen(false);

      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 12000,
          maximumAge: 15000,
        });
      });

      const lat = Number(position.coords.latitude).toFixed(6);
      const lng = Number(position.coords.longitude).toFixed(6);

      const { data, error } = await supabase.rpc('post_chat_message', {
        p_chat_id: chatId,
        p_text: `Te comparto mi ubicacion: https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
      });

      if (error) throw error;

      const saved = normalizeMessageRecord(data);
      if (saved?.id) {
        setMessages((prev) => {
          if (prev.some((message) => message.id === saved.id)) return prev;
          return [...prev, saved];
        });
      }
    } catch (error) {
      console.error('No se pudo compartir ubicacion:', error);
      toast.error(userFriendlyError(error, 'No pudimos compartir la ubicacion. Revisa permisos y proba otra vez.'));
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
      } catch (error) {
        console.error('No se pudo detener el audio:', error);
        toast.error(userFriendlyError(error, 'No pudimos enviar el audio. Revisa el microfono y proba otra vez.'));
        cancelRecording();
      }
      return;
    }

    try {
      await startRecording();
      toast.message('Grabando audio. Toca de nuevo para enviar.');
    } catch (error) {
      console.error('No se pudo iniciar la grabacion:', error);
      toast.error(userFriendlyError(error, 'No pudimos abrir el microfono. Revisa permisos y proba otra vez.'));
    }
  }

  function applySuggestion(text) {
    setInput(text);
    broadcastTyping(text);
    setTimeout(() => inputRef.current?.focus(), 40);
  }

  function toggleVoiceDictation() {
    if (isListening) {
      stopDictation();
      return;
    }

    startDictation({ currentText: input });
    setTimeout(() => inputRef.current?.focus(), 80);
  }

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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex h-[100dvh] flex-col overflow-hidden bg-[#63c0ba] text-[#123437]"
      style={{ height: viewportHeight }}
    >
      <header className="relative z-20 border-b border-white/35 bg-[#63c0ba]/95 px-3 py-2 shadow-[0_10px_28px_rgba(15,64,68,0.16)] backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition hover:bg-white/15 active:scale-95"
            aria-label="Volver"
          >
            <ChevronLeft size={27} strokeWidth={2.7} />
          </button>

          <img
            src={counterpartAvatar}
            alt={counterpartName}
            className="h-12 w-12 shrink-0 rounded-full border-2 border-white object-cover shadow-[0_8px_18px_rgba(7,55,59,0.22)]"
          />

          <div className="min-w-0 flex-1 text-left">
            <h1 className="truncate text-[18px] font-black leading-tight text-white drop-shadow-[0_2px_6px_rgba(7,55,59,0.16)]">
              {counterpartName}
            </h1>
            <p className="truncate text-[12px] font-black text-[#123437]">
              {isWorker ? 'Consulta por' : 'Chat por'} {serviceLabel}
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push(isWorker ? '/worker/feed' : '/client')}
            className="shrink-0 rounded-full bg-white px-4 py-2.5 text-[12px] font-black text-[#123437] shadow-[0_10px_22px_rgba(7,55,59,0.14)] transition active:scale-95"
          >
            {isWorker ? 'Pedidos' : 'Ver pedido'}
          </button>
        </div>
      </header>

      <div ref={messagesWrapRef} className="relative min-h-0 flex-1 overflow-y-auto px-3 py-4">
        <ChatServicePattern />

        <div className="relative z-10 mx-auto flex max-w-[430px] flex-col gap-3 pb-24">
          <div className="mx-auto mb-1 rounded-full bg-white/12 px-4 py-1.5 text-[12px] font-black text-[#123437]">
            Hoy
          </div>

          <div className="mb-2 rounded-[22px] bg-white/10 px-5 py-4 text-center text-[13px] font-black leading-relaxed text-[#1e4e53] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14)] backdrop-blur-sm">
            <ShieldCheck className="mx-auto mb-1 inline-block text-[#1e7f7a]" size={16} />
            <div>
              Los mensajes estan protegidos dentro de ManosYA. Coordinan por chat sin marcar ocupado al trabajador.
            </div>
          </div>

          {loadingMessages ? (
            <div className="py-12 text-center text-[14px] font-black text-white">
              Cargando mensajes...
            </div>
          ) : null}

          {!loadingMessages && messages.length === 0 ? (
            <div className="mx-auto mt-10 max-w-[280px] rounded-[26px] bg-white/16 px-6 py-6 text-center text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18)]">
              <MessageCircle className="mx-auto mb-2" size={28} />
              <div className="text-[15px] font-black">Todavia no hay mensajes</div>
              <div className="mt-1 text-[12px] font-bold text-white/78">
                Escribi para abrir la conversacion.
              </div>
            </div>
          ) : null}

          {messages.map((message) => {
            const mine = String(message.sender_id || '') === String(user?.id || '');
            const text = message.text || '';
            const isMedia = ['audio', 'image', 'video'].includes(message.message_type);

            return (
              <div key={message.id || `${message.created_at}-${text}`} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={[
                    'max-w-[82%] rounded-[18px] px-3 py-2 text-[14px] leading-5 shadow-sm',
                    mine
                      ? 'rounded-tr-[4px] bg-white text-[#123437]'
                      : 'rounded-tl-[4px] bg-[#dff7f5] text-[#123437]',
                  ].join(' ')}
                >
                  {isMedia ? (
                    <ChatMediaMessage message={message} />
                  ) : (
                    <div className="whitespace-pre-wrap break-words font-semibold">{text}</div>
                  )}
                  <div className="mt-1 text-right text-[10px] font-bold text-[#1e4e53]/55">
                    {formatTime(message.created_at)}
                  </div>
                </div>
              </div>
            );
          })}

          {counterpartTyping ? <TypingBubble /> : null}
        </div>
      </div>

      <form
        onSubmit={sendMessage}
        className="relative z-20 border-t border-white/30 bg-[#63c0ba] px-3 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-2 shadow-[0_-12px_30px_rgba(7,55,59,0.12)]"
      >
        <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
          {suggestionChips.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => applySuggestion(chip)}
              className="shrink-0 border-b-2 border-[#1e7f7a]/45 px-4 pb-2 text-[11px] font-black text-[#123437]"
            >
              {chip}
            </button>
          ))}
        </div>

        {isListening ? (
          <div className="mb-2 px-2 text-[11px] font-black text-[#123437]/75">
            Escuchando...
          </div>
        ) : null}

        <div className="flex items-center gap-2">
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setAttachOpen((prev) => !prev)}
              disabled={sendingMedia}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/16 text-[#1e7f7a] disabled:opacity-55"
              aria-label="Adjuntar"
            >
              <Plus size={22} strokeWidth={2.5} />
            </button>

            {attachOpen ? (
              <div className="absolute bottom-[58px] left-0 z-30 w-[218px] overflow-hidden rounded-[24px] border border-white/55 bg-white/92 p-2 text-[#123437] shadow-[0_22px_48px_rgba(7,55,59,0.22)] backdrop-blur-xl">
                <button
                  type="button"
                  onClick={shareMyLocation}
                  className="flex w-full items-center gap-3 rounded-[18px] px-3 py-3 text-left text-[13px] font-black active:bg-[#e8f7f6]"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#dff7f5] text-[#1e7f7a]">
                    <MapPin size={19} strokeWidth={2.6} />
                  </span>
                  Ubicacion
                </button>
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex w-full items-center gap-3 rounded-[18px] px-3 py-3 text-left text-[13px] font-black active:bg-[#e8f7f6]"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#dff7f5] text-[#1e7f7a]">
                    <Camera size={19} strokeWidth={2.6} />
                  </span>
                  Sacar foto
                </button>
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="flex w-full items-center gap-3 rounded-[18px] px-3 py-3 text-left text-[13px] font-black active:bg-[#e8f7f6]"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#dff7f5] text-[#1e7f7a]">
                    <ImageIcon size={19} strokeWidth={2.6} />
                  </span>
                  Enviar foto o video
                </button>
              </div>
            ) : null}

            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleMediaInput}
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={handleMediaInput}
            />
          </div>

          <div className="flex h-12 min-w-0 flex-1 items-center rounded-full bg-white/16 px-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.10)]">
            <input
              ref={inputRef}
              value={input}
              onChange={(event) => {
                setInput(event.target.value);
                broadcastTyping(event.target.value);
              }}
              onFocus={() => {
                setTimeout(() => {
                  const wrap = messagesWrapRef.current;
                  if (!wrap) return;
                  wrap.scrollTo({ top: wrap.scrollHeight, behavior: 'auto' });
                }, 80);
              }}
              type="text"
              placeholder="Escribi un mensaje"
              className="min-w-0 flex-1 bg-transparent text-[15px] font-black text-[#123437] outline-none placeholder:text-[#123437]/38"
            />
          </div>

          <button
            type="button"
            onClick={toggleVoiceDictation}
            className={[
              'flex h-12 w-12 shrink-0 items-center justify-center rounded-full shadow-[0_10px_22px_rgba(7,55,59,0.12)] transition active:scale-95',
              isListening
                ? 'animate-pulse bg-[#123437] text-white'
                : 'bg-white/18 text-[#1e7f7a]',
            ].join(' ')}
            aria-label={isListening ? 'Detener dictado' : 'Dictar mensaje'}
          >
            <Mic size={21} strokeWidth={2.6} />
          </button>

          {!input.trim() ? (
            <button
              type="button"
              onClick={toggleAudioRecording}
              disabled={sendingAudio}
              className={[
                'flex h-12 w-12 shrink-0 items-center justify-center rounded-full shadow-[0_10px_22px_rgba(7,55,59,0.12)] transition active:scale-95 disabled:opacity-55',
                isRecording
                  ? 'animate-pulse bg-[#123437] text-white'
                  : 'bg-white/18 text-[#1e7f7a]',
              ].join(' ')}
              aria-label={isRecording ? 'Enviar audio' : 'Grabar audio'}
            >
              {sendingAudio ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#1e7f7a] border-t-transparent" />
              ) : (
                <AudioLines size={22} strokeWidth={2.6} />
              )}
            </button>
          ) : null}

          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-[#1e7f7a] shadow-[0_10px_22px_rgba(7,55,59,0.15)] transition active:scale-95 disabled:opacity-55"
            aria-label="Enviar mensaje"
          >
            {sending ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#1e7f7a] border-t-transparent" />
            ) : (
              <SendHorizontal size={24} strokeWidth={2.5} />
            )}
          </button>
        </div>
      </form>
    </motion.div>
  );
}
