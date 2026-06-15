'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { AudioLines, CheckCircle, MapPin, Mic } from 'lucide-react';
import { canAttemptAction, inspectTextSafety } from '@/lib/security';
import { useVoiceDictation } from '@/lib/useVoiceDictation';
import { useAudioRecorder } from '@/lib/useAudioRecorder';
import { hydrateAudioMessage, hydrateAudioMessages, uploadChatAudio } from '@/lib/chatAudio';

function TypingBubble() {
  return (
    <div className="my-2 flex justify-start">
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-zinc-700 px-4 py-3 shadow-sm">
        {[0, 1, 2].map((item) => (
          <span
            key={item}
            className="h-2 w-2 animate-bounce rounded-full bg-emerald-300"
            style={{ animationDelay: `${item * 120}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

function AudioMessage({ message }) {
  const src = message?.media_url || '';

  if (!src) return <span>Audio no disponible</span>;

  return <audio controls preload="metadata" src={src} className="h-10 w-[220px] max-w-full" />;
}

export default function DMPage() {
  const { id: otherId } = useParams();
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [user, setUser] = useState(null);
  const [err, setErr] = useState(null);
  const [completedCount, setCompletedCount] = useState(0);
  const [sendingAudio, setSendingAudio] = useState(false);
  const [counterpartTyping, setCounterpartTyping] = useState(false);
  const [viewportHeight, setViewportHeight] = useState('100dvh');
  const [keyboardOffset, setKeyboardOffset] = useState(0);
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
      setNewMsg(nextText);
      broadcastTyping(nextText);
    },
  });

  useEffect(() => {
    if (speechError) setErr(speechError);
  }, [speechError]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data?.user ?? null);
      if (data?.user) loadCompletedJobs(data.user.id);
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;

    const updateViewport = () => {
      const viewport = window.visualViewport;
      setViewportHeight(`${viewport.height}px`);
      setKeyboardOffset(Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop));
    };

    updateViewport();
    window.visualViewport.addEventListener('resize', updateViewport);
    window.visualViewport.addEventListener('scroll', updateViewport);

    return () => {
      window.visualViewport.removeEventListener('resize', updateViewport);
      window.visualViewport.removeEventListener('scroll', updateViewport);
    };
  }, []);

  useEffect(() => {
    const wrap = messagesWrapRef.current;
    if (!wrap) return;

    wrap.scrollTo({
      top: wrap.scrollHeight,
      behavior: keyboardOffset > 40 ? 'auto' : 'smooth',
    });
  }, [messages.length, counterpartTyping, keyboardOffset]);

  async function loadMessages() {
    if (!user || !otherId) return;

    const { data, error } = await supabase
      .from('dm_messages')
      .select('*')
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${user.id})`
      )
      .order('created_at', { ascending: true });

    if (error) {
      setErr(error.message);
      return;
    }

    const hydrated = await hydrateAudioMessages({ supabase, messages: data || [] });
    setMessages(hydrated);
  }

  async function loadCompletedJobs(workerId) {
    const { count } = await supabase
      .from('jobs')
      .select('id', { count: 'exact', head: true })
      .eq('worker_id', workerId)
      .eq('status', 'completed');

    setCompletedCount(count || 0);
  }

  useEffect(() => {
    if (!user || !otherId) return;
    loadMessages();

    const channel = supabase
      .channel(`dm_messages_${user.id}_${otherId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'dm_messages',
        filter: `receiver_id=eq.${user.id}`,
      }, (payload) => {
        const msg = payload.new;
        if (
          msg.sender_id === otherId &&
          msg.receiver_id === user.id
        ) {
          hydrateAudioMessage({ supabase, message: msg }).then((readyMessage) => {
            if (!readyMessage) return;
            setMessages((prev) => {
              if (prev.some((item) => item.id === readyMessage.id)) return prev;
              return [...prev, readyMessage];
            });
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, otherId]);

  useEffect(() => {
    if (!user?.id || !otherId) return;

    const sortedIds = [String(user.id), String(otherId)].sort().join('-');
    const channel = supabase
      .channel(`dm-typing-${sortedIds}`, {
        config: {
          broadcast: { self: false },
        },
      })
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
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
      typingReadyRef.current = false;
      typingChannelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [user?.id, otherId]);

  function broadcastTyping(nextValue) {
    if (!user?.id || !otherId || !nextValue.trim()) return;

    const now = Date.now();
    if (now - lastTypingSentRef.current < 1200) return;
    lastTypingSentRef.current = now;

    if (!typingReadyRef.current || !typingChannelRef.current) return;

    typingChannelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        user_id: user.id,
        other_id: otherId,
        at: now,
      },
    });
  }

  function toggleVoiceDictation() {
    if (isListening) {
      stopDictation();
      return;
    }

    startDictation({ currentText: newMsg });
  }

  async function sendMessage(content) {
    const safety = inspectTextSafety(content);
    if (!safety.ok || !user || !otherId) {
      if (safety.error) setErr(safety.error);
      return;
    }

    const attempt = canAttemptAction(`dm:${otherId}:${user.id}`, { limit: 8, windowMs: 60_000 });
    if (!attempt.allowed) {
      setErr('Estás enviando muy rápido. Esperá unos segundos.');
      return;
    }

    const { data, error } = await supabase
      .from('dm_messages')
      .insert({
        sender_id: user.id,
        receiver_id: otherId,
        content: safety.text,
      })
      .select()
      .single();

    if (error) {
      setErr(error.message);
      return;
    }

    setMessages((prev) => (prev.some((item) => item.id === data.id) ? prev : [...prev, data]));
    setNewMsg('');
  }

  async function sendAudioMessage(blob, durationMs = 0) {
    if (!user?.id || !otherId || !blob || sendingAudio) return;

    const folderId = [String(user.id), String(otherId)].sort().join('-');

    try {
      setSendingAudio(true);

      const audio = await uploadChatAudio({
        supabase,
        chatId: `dm-${folderId}`,
        userId: user.id,
        blob,
        durationMs,
      });

      const { data, error } = await supabase
        .from('dm_messages')
        .insert({
          sender_id: user.id,
          receiver_id: otherId,
          content: '[audio]',
          message_type: 'audio',
          media_path: audio.mediaPath,
          media_url: audio.mediaUrl,
          metadata: audio.metadata,
        })
        .select()
        .single();

      if (error) throw error;

      const saved = await hydrateAudioMessage({ supabase, message: data });
      setMessages((prev) => (prev.some((item) => item.id === saved.id) ? prev : [...prev, saved]));
    } catch (error) {
      setErr(error?.message || 'No se pudo enviar el audio');
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
          setErr('No se grabo audio');
          return;
        }

        await sendAudioMessage(result.blob, result.durationMs);
      } catch (error) {
        setErr(error?.message || 'No se pudo enviar el audio');
        cancelRecording();
      }
      return;
    }

    try {
      await startRecording();
    } catch (error) {
      setErr(error?.message || 'No se pudo iniciar la grabacion');
    }
  }

  async function sendLocation() {
    if (!navigator.geolocation) {
      alert('Tu dispositivo no soporta geolocalizacion');
      return;
    }

    if (!user || !otherId) return;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const { data, error } = await supabase
          .from('dm_messages')
          .insert({
            sender_id: user.id,
            receiver_id: otherId,
            content: 'Ubicacion compartida',
            lat: latitude,
            lng: longitude,
          })
          .select()
          .single();

        if (error) setErr(error.message);
        else setMessages((prev) => (prev.some((item) => item.id === data.id) ? prev : [...prev, data]));
      },
      () => alert('No pudimos obtener tu ubicacion. Revisa permisos o GPS.'),
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 30000 }
    );
  }

  async function sendArrived() {
    await sendMessage('El trabajador ha llegado al destino');
  }

  async function sendCompleted() {
    await sendMessage('Trabajo finalizado');
    if (user) loadCompletedJobs(user.id);
  }

  return (
    <div
      className="mx-auto flex max-w-lg flex-col overflow-hidden p-4"
      style={{ height: viewportHeight }}
    >
      <h1 className="mb-4 text-xl font-bold">Chat</h1>

      {err ? (
        <div className="mb-3 rounded-lg border border-red-300 bg-red-50 p-2 text-sm font-semibold text-red-700">
          {err}
        </div>
      ) : null}

      <div className="mb-3 rounded-lg border border-emerald-400/40 bg-emerald-600/20 p-2 text-center text-sm text-emerald-300">
        Trabajos completados: {completedCount}
      </div>

      <div
        ref={messagesWrapRef}
        className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-white/10 bg-black/40 p-3 pb-24"
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={`my-2 w-fit max-w-[78%] rounded-lg p-2 ${
              message.sender_id === user?.id ? 'ml-auto bg-emerald-600' : 'mr-auto bg-zinc-700'
            }`}
          >
            {message.message_type === 'audio' ? (
              <AudioMessage message={message} />
            ) : message.lat && message.lng ? (
              <a
                href={`https://www.google.com/maps?q=${message.lat},${message.lng}`}
                target="_blank"
                rel="noreferrer"
                className="underline text-blue-200"
              >
                Ver ubicacion en Google Maps
              </a>
            ) : (
              message.content
            )}
          </div>
        ))}

        {counterpartTyping ? <TypingBubble /> : null}
      </div>

      <form
        className="mt-3 flex items-center gap-2 pb-[env(safe-area-inset-bottom)]"
        onSubmit={(event) => {
          event.preventDefault();
          sendMessage(newMsg);
        }}
      >
        <input
          type="text"
          value={newMsg}
          onChange={(event) => {
            setNewMsg(event.target.value);
            broadcastTyping(event.target.value);
          }}
          onFocus={() => {
            setTimeout(() => {
              const wrap = messagesWrapRef.current;
              wrap?.scrollTo({ top: wrap.scrollHeight, behavior: 'auto' });
            }, 120);
          }}
          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-zinc-800 px-3 py-2"
          placeholder="Escribi un mensaje..."
        />

        <motion.button
          whileTap={{ scale: 0.85 }}
          type="button"
          onClick={toggleVoiceDictation}
          className={[
            'rounded-full p-2 text-white',
            isListening ? 'animate-pulse bg-emerald-500' : 'bg-zinc-700',
          ].join(' ')}
          aria-label={isListening ? 'Detener dictado' : 'Dictar mensaje'}
        >
          <Mic size={20} />
        </motion.button>

        {!newMsg.trim() ? (
          <motion.button
            whileTap={{ scale: 0.85 }}
            type="button"
            onClick={toggleAudioRecording}
            disabled={sendingAudio}
            className={[
              'rounded-full p-2 text-white disabled:opacity-50',
              isRecording ? 'animate-pulse bg-emerald-500' : 'bg-zinc-700',
            ].join(' ')}
            aria-label={isRecording ? 'Enviar audio' : 'Grabar audio'}
          >
            {sendingAudio ? (
              <span className="block h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <AudioLines size={20} />
            )}
          </motion.button>
        ) : null}

        <button type="submit" className="btn btn-primary">
          Enviar
        </button>

        <motion.button whileTap={{ scale: 0.85 }} type="button" onClick={sendLocation} className="rounded-full bg-pink-600 p-2 text-white">
          <MapPin size={20} />
        </motion.button>
        <motion.button whileTap={{ scale: 0.85 }} type="button" onClick={sendArrived} className="rounded-full bg-green-600 p-2 text-white">
          OK
        </motion.button>
        <motion.button whileTap={{ scale: 0.85 }} type="button" onClick={sendCompleted} className="rounded-full bg-blue-600 p-2 text-white">
          <CheckCircle size={20} />
        </motion.button>
      </form>
      {isListening ? (
        <div className="pt-1 text-center text-xs font-bold text-emerald-300">
          Escuchando...
        </div>
      ) : null}
    </div>
  );
}
