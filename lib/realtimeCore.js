// /lib/realtimeCore.js
import { getSupabase } from './supabase';

let channels = [];
let reconnectTimer = null;
let pingTimer = null;
let visibilityHandler = null;
let lastStatusAt = Date.now();
let connected = false;

export async function startRealtimeCore(onUpdate, activeChatId = null) {
  const supabase = getSupabase();
  stopRealtimeCore();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const subscribeChannel = (name, config, handler) => {
    const ch = supabase.channel(name).on('postgres_changes', config, handler);

    ch.subscribe((status) => {
      lastStatusAt = Date.now();

      if (status === 'SUBSCRIBED') {
        connected = true;
        onUpdate?.('connected', { channel: name });
        return;
      }

      if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        connected = false;
        onUpdate?.('disconnected', { channel: name });
      }
    });

    channels.push(ch);
  };

  subscribeChannel(
    'core-jobs',
    { event: '*', schema: 'public', table: 'jobs' },
    (payload) =>
      onUpdate?.('job', {
        ...(payload.new || payload.old),
        __source: String(payload.eventType || '').toLowerCase(),
      })
  );

  if (user?.id) {
    subscribeChannel(
      `core-messages-${user.id}`,
      { event: 'INSERT', schema: 'public', table: 'messages' },
      (payload) => {
        const msg = payload.new;
        if (!msg) return;
        if (msg.receiver_id && msg.receiver_id !== user.id && msg.sender_id !== user.id) return;
        if (msg.sender_id === user.id) return;

        onUpdate?.('message', msg);
      }
    );

    subscribeChannel(
      `core-profiles-${user.id}`,
      { event: '*', schema: 'public', table: 'worker_profiles', filter: `user_id=eq.${user.id}` },
      (payload) => onUpdate?.('profile', payload.new)
    );
  }

  clearInterval(pingTimer);
  pingTimer = setInterval(() => {
    if (typeof document !== 'undefined' && document.hidden) return;
    if (!connected && Date.now() - lastStatusAt > 30000) {
      restartRealtimeCore(onUpdate, activeChatId);
    }
  }, 15000);

  if (typeof document !== 'undefined') {
    visibilityHandler = () => {
      if (!document.hidden && !connected) restartRealtimeCore(onUpdate, activeChatId);
    };
    document.addEventListener('visibilitychange', visibilityHandler);
  }
}

function restartRealtimeCore(onUpdate, activeChatId) {
  stopRealtimeCore();
  clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(() => startRealtimeCore(onUpdate, activeChatId), 2000);
}

export function stopRealtimeCore() {
  const supabase = getSupabase();

  channels.forEach((ch) => {
    try {
      supabase.removeChannel(ch);
    } catch (err) {
      console.warn('Error cerrando canal:', err.message);
    }
  });

  channels = [];
  connected = false;
  clearInterval(pingTimer);
  clearTimeout(reconnectTimer);

  if (visibilityHandler && typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', visibilityHandler);
    visibilityHandler = null;
  }
}
