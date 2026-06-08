-- === Social conversational assistant: Facebook Messenger messages ===

create table if not exists public.social_messages (
  id uuid primary key default gen_random_uuid(),
  platform text not null default 'facebook',
  sender_id text not null,
  sender_name text,
  message_text text,
  ai_response text,
  intent text,
  lead_type text,
  city text,
  profession text,
  interests text[],
  needs_human boolean default false,
  status text default 'received',
  raw_event jsonb,
  meta_message_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.social_messages
add column if not exists meta_message_id text;

create index if not exists idx_social_messages_sender_id
on public.social_messages(sender_id);

create index if not exists idx_social_messages_lead_type
on public.social_messages(lead_type);

create index if not exists idx_social_messages_created_at
on public.social_messages(created_at desc);

create unique index if not exists idx_social_messages_meta_message_id
on public.social_messages(meta_message_id)
where meta_message_id is not null;

create or replace function public.set_social_messages_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_social_messages_updated_at on public.social_messages;
create trigger trg_social_messages_updated_at
before update on public.social_messages
for each row
execute function public.set_social_messages_updated_at();
