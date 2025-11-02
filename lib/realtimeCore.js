// /lib/realtimeCore.js
import { getSupabase } from './supabase';

let channels = [];
let reconnectTimer = null;
let pingTimer = null;
let lastPing = Date.now();
let connected = false;

/**
 * 🌐 RealtimeCore avanzado:
 * - Autoreconexión
 * - Ping de conexión
 * - Filtrado por usuario y chat_id
 */
export async function startRealtimeCore(onUpdate, activeChatId = null) {
  const supabase = getSupabase();
  console.log('⚙️ Iniciando RealtimeCore...');

  stopRealtimeCore();

  const subscribeChannel = (name, config, handler) => {
    const ch = supabase.channel(name).on('postgres_changes', config, handler);

    ch.subscribe((status) => {
      console.log(`📡 Canal ${name}:`, status);
      if (status === 'SUBSCRIBED') {
        connected = true;
        onUpdate?.('connected', { channel: name });
      } else if (
        status === 'CLOSED' ||
        status === 'CHANNEL_ERROR' ||
        status === 'TIMED_OUT'
      ) {
        connected = false;
        onUpdate?.('disconnected', { channel: name });
      }
    });

    channels.push(ch);
  };

  // === Jobs ===
  subscribeChannel(
    'core-jobs',
    { event: '*', schema: 'public', table: 'jobs' },
    (payload) => onUpdate?.('job', payload.new || payload.old)
  );

 // === Messages ===
(async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  subscribeChannel(
    `core-messages-${user.id}`,
    { event: 'INSERT', schema: 'public', table: 'messages' },
    (payload) => {
      const msg = payload.new;
      if (!msg) return;

      // 🧩 FILTRO MANUAL: solo si el mensaje es para este usuario
      if (msg.receiver_id !== user.id && msg.sender_id !== user.id) return;

      console.log('💬 Mensaje realtime recibido por usuario:', user.id, msg);

      // 🚫 Evitar eco del mismo usuario
      if (msg.sender_id === user.id) return;

      // 🔔 Notificación
      onUpdate?.('message', msg);
    }
  );
})();

  // === Worker profiles ===
  subscribeChannel(
    'core-profiles',
    { event: '*', schema: 'public', table: 'worker_profiles' },
    (payload) => onUpdate?.('profile', payload.new)
  );

  // ❤️ Ping cada 15s
  clearInterval(pingTimer);
  pingTimer = setInterval(() => {
    const diff = Date.now() - lastPing;
    if (diff > 30000) {
      console.warn('⚠️ Inactividad detectada, reconstruyendo RealtimeCore...');
      restartRealtimeCore(onUpdate, activeChatId);
      return;
    }

    console.log('🔄 Ping Realtime OK');
    lastPing = Date.now();
  }, 15000);
}

/**
 * 🔁 Reinicia el sistema realtime
 */
function restartRealtimeCore(onUpdate, activeChatId) {
  stopRealtimeCore();
  clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(() => startRealtimeCore(onUpdate, activeChatId), 2000);
}

/**
 * 🛑 Limpieza total
 */
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
  clearInterval(pingTimer);
  clearTimeout(reconnectTimer);
  console.log('🛑 RealtimeCore detenido');
}
