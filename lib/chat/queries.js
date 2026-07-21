export const MESSAGE_SELECT = `
  id,
  chat_id,
  sender_id,
  body,
  text,
  content,
  media_url,
  media_type,
  read_at,
  created_at
`;

export async function fetchMessages(supabase, chatId) {
  if (!supabase || !chatId) return [];

  const { data, error } = await supabase
    .from("messages")
    .select(MESSAGE_SELECT)
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function sendMessage(supabase, payload) {
  if (!supabase) throw new Error("Supabase no configurado.");

  const { data, error } = await supabase
    .from("messages")
    .insert(payload)
    .select(MESSAGE_SELECT)
    .single();

  if (error) throw error;
  return data;
}
