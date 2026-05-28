-- ManosYA security and privacy hardening
-- Run after the existing schema migrations.

create extension if not exists pgcrypto;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role in ('admin', 'cashier')
        or coalesce(p.admin_role, '') in ('admin', 'superadmin', 'cashier')
      )
  );
$$;

grant execute on function public.is_platform_admin() to authenticated;

create table if not exists public.chats (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.jobs(id) on delete set null,
  client_id uuid not null references public.profiles(id) on delete cascade,
  worker_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.chats enable row level security;

drop policy if exists chats_select_participants on public.chats;
create policy chats_select_participants on public.chats
  for select using (
    auth.uid() = client_id
    or auth.uid() = worker_id
    or public.is_platform_admin()
  );

drop policy if exists chats_insert_participants on public.chats;
create policy chats_insert_participants on public.chats
  for insert with check (
    auth.uid() = client_id
    or auth.uid() = worker_id
  );

drop policy if exists chats_update_participants on public.chats;
create policy chats_update_participants on public.chats
  for update using (
    auth.uid() = client_id
    or auth.uid() = worker_id
    or public.is_platform_admin()
  )
  with check (
    auth.uid() = client_id
    or auth.uid() = worker_id
    or public.is_platform_admin()
  );

create index if not exists chats_client_worker_created_idx
  on public.chats (client_id, worker_id, created_at desc);

alter table public.messages
  alter column job_id drop not null,
  alter column body drop not null;

alter table public.messages
  add column if not exists chat_id uuid references public.chats(id) on delete cascade,
  add column if not exists text text,
  add column if not exists content text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'messages_safe_length'
      and conrelid = 'public.messages'::regclass
  ) then
    alter table public.messages
      add constraint messages_safe_length
      check (
        char_length(coalesce(text, '')) <= 1200
        and char_length(coalesce(content, '')) <= 1200
        and char_length(coalesce(body, '')) <= 1200
      ) not valid;
  end if;
end $$;

drop policy if exists "msg_select_participants" on public.messages;
create policy "msg_select_participants" on public.messages
  for select using (
    public.is_platform_admin()
    or exists (
      select 1
      from public.jobs j
      where j.id = messages.job_id
        and (auth.uid() = j.client_id or auth.uid() = j.assigned_worker or auth.uid() = j.worker_id)
    )
    or exists (
      select 1
      from public.chats c
      where c.id = messages.chat_id
        and (auth.uid() = c.client_id or auth.uid() = c.worker_id)
    )
  );

drop policy if exists "msg_insert_participants" on public.messages;
create policy "msg_insert_participants" on public.messages
  for insert with check (
    sender_id = auth.uid()
    and (
      exists (
        select 1
        from public.jobs j
        where j.id = messages.job_id
          and (auth.uid() = j.client_id or auth.uid() = j.assigned_worker or auth.uid() = j.worker_id)
      )
      or exists (
        select 1
        from public.chats c
        where c.id = messages.chat_id
          and (auth.uid() = c.client_id or auth.uid() = c.worker_id)
      )
    )
  );

create table if not exists public.dm_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  lat numeric,
  lng numeric,
  created_at timestamptz not null default now()
);

alter table public.dm_messages enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'dm_messages_safe_length'
      and conrelid = 'public.dm_messages'::regclass
  ) then
    alter table public.dm_messages
      add constraint dm_messages_safe_length
      check (char_length(content) <= 1200) not valid;
  end if;
end $$;

drop policy if exists dm_messages_select_participants on public.dm_messages;
create policy dm_messages_select_participants on public.dm_messages
  for select using (
    auth.uid() = sender_id
    or auth.uid() = receiver_id
    or public.is_platform_admin()
  );

drop policy if exists dm_messages_insert_sender on public.dm_messages;
create policy dm_messages_insert_sender on public.dm_messages
  for insert with check (auth.uid() = sender_id);

create table if not exists public.security_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  severity text not null default 'info',
  subject_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.security_events enable row level security;

drop policy if exists security_events_insert_own on public.security_events;
create policy security_events_insert_own on public.security_events
  for insert with check (auth.uid() = actor_id or actor_id is null);

drop policy if exists security_events_select_admin on public.security_events;
create policy security_events_select_admin on public.security_events
  for select using (public.is_platform_admin());

create table if not exists public.security_action_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id) on delete cascade,
  action text not null,
  subject text,
  created_at timestamptz not null default now()
);

alter table public.security_action_events enable row level security;

drop policy if exists security_action_events_select_admin on public.security_action_events;
create policy security_action_events_select_admin on public.security_action_events
  for select using (public.is_platform_admin());

create index if not exists security_action_actor_action_created_idx
  on public.security_action_events (actor_id, action, created_at desc);

create or replace function public.register_security_action(
  p_action text,
  p_subject text default null,
  p_limit int default 8,
  p_window_seconds int default 60
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  delete from public.security_action_events
  where created_at < now() - interval '1 day';

  select count(*) into v_count
  from public.security_action_events
  where actor_id = auth.uid()
    and action = p_action
    and created_at > now() - make_interval(secs => p_window_seconds);

  if v_count >= p_limit then
    insert into public.security_events(actor_id, event_type, severity, metadata)
    values (auth.uid(), 'rate_limit_blocked', 'medium', jsonb_build_object('action', p_action, 'subject', p_subject));
    return false;
  end if;

  insert into public.security_action_events(actor_id, action, subject)
  values (auth.uid(), p_action, p_subject);

  return true;
end;
$$;

grant execute on function public.register_security_action(text, text, int, int) to authenticated;

create or replace function public.sanitize_public_text(p_text text, p_max int default 1200)
returns text
language sql
immutable
as $$
  select left(
    btrim(regexp_replace(coalesce(p_text, ''), '[[:cntrl:]]', '', 'g')),
    greatest(1, p_max)
  );
$$;

grant execute on function public.sanitize_public_text(text, int) to authenticated;

create or replace function public.post_chat_message(p_chat_id uuid, p_text text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_text text;
  v_message_id uuid;
  v_allowed boolean;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  v_text := public.sanitize_public_text(p_text, 1200);
  if char_length(v_text) < 1 then
    raise exception 'empty message';
  end if;

  if v_text ~* '(javascript:|data:text/html|vbscript:|<\s*/?\s*(script|iframe|object|embed|link|meta|style)\b|\bon[a-z]+\s*=)' then
    insert into public.security_events(actor_id, event_type, severity, metadata)
    values (auth.uid(), 'dangerous_message_blocked', 'high', jsonb_build_object('chat_id', p_chat_id));
    raise exception 'unsafe message';
  end if;

  if not exists (
    select 1 from public.chats c
    where c.id = p_chat_id
      and (c.client_id = auth.uid() or c.worker_id = auth.uid())
  ) then
    raise exception 'not a participant';
  end if;

  v_allowed := public.register_security_action('chat_message', p_chat_id::text, 8, 60);
  if not v_allowed then
    raise exception 'rate limited';
  end if;

  insert into public.messages(chat_id, sender_id, text, content, body)
  values (p_chat_id, auth.uid(), v_text, v_text, v_text)
  returning id into v_message_id;

  return v_message_id;
end;
$$;

grant execute on function public.post_chat_message(uuid, text) to authenticated;

do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'supplier_profiles' and column_name = 'whatsapp_url') then
    alter table public.supplier_profiles
      add constraint supplier_profiles_safe_whatsapp
      check (
        whatsapp_url is null
        or whatsapp_url = ''
        or whatsapp_url ~* '^https://(wa\.me|([a-z0-9-]+\.)*whatsapp\.com)/'
      ) not valid;
  end if;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'supplier_products' and column_name = 'contact_url') then
    alter table public.supplier_products
      add constraint supplier_products_safe_contact_url
      check (
        contact_url is null
        or contact_url = ''
        or contact_url ~* '^https://'
      ) not valid;
  end if;
exception
  when duplicate_object then null;
end $$;
