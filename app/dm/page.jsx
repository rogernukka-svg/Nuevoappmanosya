'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function DMPage() {
  const { id: otherId } = useParams(); // el destinatario
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [other, setOther] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const bottomRef = useRef(null);

  // Sesión
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data?.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) =>
      setUser(s?.user ?? null)
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  // Cargar destinatario + mensajes
  useEffect(() => {
    if (!otherId) return;
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        // Perfil del otro
        const { data: pr } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .eq('id', otherId)
          .maybeSingle();
        setOther(pr);

        // Mensajes iniciales
        const { data: msgs, error: e2 } = await supabase
          .from('dm_messages')
          .select('*')
          .or(`sender.eq.${user?.id},receiver.eq.${user?.id}`)
          .or(`sender.eq.${otherId},receiver.eq.${otherId}`)
          .order('created_at', { ascending: true });
        if (e2) throw e2;
        setMessages(msgs || []);
      } catch (e) {
        setErr(e.message || String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [otherId, user?.id]);

  // Realtime
  useEffect(() => {
    if (!otherId || !user) return;
    const channel = supabase
      .channel(`dm_${user.id}_${otherId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'dm_messages' },
        (payload) => {
          const m = payload.new;
          if (
            (m.sender === user.id && m.receiver === otherId) ||
            (m.sender === otherId && m.receiver === user.id)
          ) {
            setMessages((prev) => [...prev, m]);
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user, otherId]);

  async function sendMessage(e) {
    e?.preventDefault?.();
    const content = text.trim();
    if (!content || !user) return;
    setText('');
    const row = { sender: user.id, receiver: otherId, content };
    const { error } = await supabase.from('dm_messages').insert(row);
    if (error) {
      setText(content);
      alert(error.message);
    }
  }

  if (loading) return <div className="container p-5">Cargando chat…</div>;
  if (err) return <div className="container p-5 text-red-400">Error: {err}</div>;

  return (
    <div className="container">
      {/* Header */}
      <section className="card p-4 mt-6 flex items-center gap-3">
        <button className="btn btn-ghost" onClick={() => router.back()}>← Volver</button>
        {other && (
          <>
            <img
              src={other.avatar_url || '/avatar-fallback.png'}
              alt=""
              style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent)' }}
            />
            <div className="text-white/90 font-semibold">{other.full_name}</div>
          </>
        )}
      </section>

      {/* Mensajes */}
      <section className="card p-4 mt-4" style={{ minHeight: 420 }}>
        <div className="flex flex-col gap-2">
          {messages.map((m) => {
            const mine = m.sender === user?.id;
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className="px-3 py-2 rounded-2xl text-sm max-w-[78%]"
                  style={{
                    background: mine ? 'var(--accent)' : 'rgba(255,255,255,0.08)',
                    color: mine ? '#0B0D0F' : '#fff'
                  }}
                  title={new Date(m.created_at).toLocaleString()}
                >
                  {m.content}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </section>

      {/* Composer */}
      <section className="card p-3 mt-3">
        <form onSubmit={sendMessage} className="flex gap-2">
          <input
            className="input"
            placeholder="Escribí un mensaje…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button className="btn btn-primary" type="submit">Enviar</button>
        </form>
      </section>
    </div>
  );
}
