import { getSupabase } from '@/lib/supabase';

const supabase = getSupabase();

export async function trackUserEvent(event) {
  try {
    const { data } = await supabase.auth.getUser();
    const user = data?.user;

    if (!user?.id) return;
    if (!event?.event_type || !event?.target_type) return;

    await supabase.from('user_events').insert([
      {
        user_id: user.id,
        event_type: event.event_type,
        target_type: event.target_type,
        target_id: event.target_id ? String(event.target_id) : null,
        service_slug: event.service_slug || null,
        metadata: event.metadata || {},
      },
    ]);
  } catch (error) {
    console.warn('trackUserEvent error:', error);
  }
}