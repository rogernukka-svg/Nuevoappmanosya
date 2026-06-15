-- ManosYA supplier/direct-message audio compatibility
-- Adds media fields to dm_messages without changing existing text/location logic.

alter table public.dm_messages
  add column if not exists message_type text not null default 'text',
  add column if not exists media_url text,
  add column if not exists media_path text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists dm_messages_media_created_idx
  on public.dm_messages (sender_id, receiver_id, created_at);

notify pgrst, 'reload schema';
