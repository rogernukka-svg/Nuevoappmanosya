// /lib/realtimeCore.js
import { getSupabase } from './supabase';

let channels = [];
let reconnectTimer = null;
let pingTimer = null;
let lastPing = Date.now();
let connected = false;

/**
 * 🌐 RealtimeCore robusto con autoreconexión y logs
 */
export function startRealtimeCore(onUpdate) {
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
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
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
subscribeChannel(
  'core-messages',
  { event: 'INSERT', schema: 'public', table: 'messages' },
  (payload) => {
    console.log('💬 Evento de mensaje realtime recibido:', payload.new); // 👈 pegá esto
    onUpdate?.('message', payload.new);
  }
);


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
      restartRealtimeCore(onUpdate);
      return;
    }

    console.log('🔄 Ping Realtime OK');
    lastPing = Date.now();
  }, 15000);
}

/**
 * 🔁 Reinicia todo el sistema realtime
 */
function restartRealtimeCore(onUpdate) {
  stopRealtimeCore();
  clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(() => startRealtimeCore(onUpdate), 2000);
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
