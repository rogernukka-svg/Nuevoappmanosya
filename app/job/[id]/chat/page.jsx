'use client';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function JobChat() {
  const { id } = useParams();
  const [msgs, setMsgs] = useState([]);
  const [me, setMe] = useState(null);
  const [body, setBody] = useState('');
  const bottomRef = useRef(null);

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
          setMsgs(m => [...m, payload.new]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs.length]);

  async function send(e) {
    e.preventDefault();
    if (!body.trim()) return;

    // 👇 Usamos los nombres de parámetros correctos según la función SQL
    const { error } = await supabase.rpc('post_message', {
      p_job_id: id,
      p_body: body
    });

    if (!error) {
      setBody('');
    } else {
      console.error('Error al enviar mensaje:', error);
      alert('No se pudo enviar el mensaje');
    }
  }

  return (
    <div className="max-w-2xl mx-auto card">
      <h1>Chat del trabajo</h1>
      <div className="mt-3 h-80 overflow-auto space-y-2 bg-black/20 p-3 rounded-xl">
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
          placeholder="Escribí un mensaje..."
        />
        <button className="btn">Enviar</button>
      </form>
    </div>
  );
}