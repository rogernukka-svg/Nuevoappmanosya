'use client';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { canAttemptAction, inspectTextSafety } from '@/lib/security';

export default function JobChat() {
  const { id } = useParams();
  const [msgs, setMsgs] = useState([]);
  const [me, setMe] = useState(null);
  const [body, setBody] = useState('');
  const [viewportHeight, setViewportHeight] = useState('100dvh');
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const bottomRef = useRef(null);
  const messagesWrapRef = useRef(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      setMe(user ?? null);

      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('job_id', id)
        .order('created_at', { ascending: true });

      setMsgs(data ?? []);
    }
    load();

    const ch = supabase
      .channel('msg-' + id)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `job_id=eq.${id}` },
        payload => {
          setMsgs(m => {
            if (m.some((message) => message.id === payload.new.id)) return m;
            return [...m, payload.new];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [id]);

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
  }, [msgs.length, keyboardOffset]);


  async function send(e) {
    e.preventDefault();
    const safety = inspectTextSafety(body);
    if (!safety.ok) {
      alert(safety.error);
      return;
    }

    const attempt = canAttemptAction(`job-chat:${id}:${me?.id || 'anon'}`, { limit: 8, windowMs: 60_000 });
    if (!attempt.allowed) {
      alert('Estás enviando muy rápido. Esperá unos segundos.');
      return;
    }

    // 👇 Usamos los nombres de parámetros correctos según la función SQL
    const { error } = await supabase.rpc('post_message', {
      p_job_id: id,
      p_body: safety.text
    });

    if (!error) {
      setBody('');
    } else {
      console.error('Error al enviar mensaje:', error);
      alert('No se pudo enviar el mensaje');
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col overflow-hidden card" style={{ height: viewportHeight }}>
      <h1>Chat del trabajo</h1>
      <div ref={messagesWrapRef} className="mt-3 min-h-0 flex-1 overflow-auto space-y-2 bg-black/20 p-3 rounded-xl">
        {msgs.map(m => (
          <div
            key={m.id}
            className={`max-w-[80%] px-3 py-2 rounded-xl ${
              m.sender_id === me?.id ? 'ml-auto bg-sky-500/20' : 'bg-white/10'
            }`}
          >
            <div className="text-xs opacity-60">
              {new Date(m.created_at).toLocaleString()}
            </div>
            <div>{m.body}</div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={send} className="mt-3 flex gap-2">
        <input
          className="flex-1 rounded-lg p-2 text-black"
          value={body}
          onChange={e => setBody(e.target.value)}
          onFocus={() => {
            setTimeout(() => {
              const wrap = messagesWrapRef.current;
              if (!wrap) return;
              wrap.scrollTo({ top: wrap.scrollHeight, behavior: 'auto' });
            }, 80);
          }}
          placeholder="Escribí un mensaje..."
        />
        <button className="btn">Enviar</button>
      </form>
    </div>
  );
}
