-- ManosYA safe platform alignment
-- Keeps existing RLS policies intact. Adds only columns/indexes used by the app.

alter table public.profiles
  add column if not exists updated_at timestamptz default now(),
  add column if not exists is_verified boolean not null default false,
  add column if not exists admin_role text;

alter table public.jobs
  add column if not exists worker_id uuid references public.profiles(id) on delete set null,
  add column if not exists service_type text,
  add column if not exists client_lat numeric,
  add column if not exists client_lng numeric;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'jobs'
      and column_name = 'assigned_worker'
  ) then
    execute '
      update public.jobs
      set worker_id = assigned_worker
      where worker_id is null
        and assigned_worker is not null
    ';
  end if;
end $$;

alter table public.messages
  add column if not exists chat_id uuid references public.chats(id) on delete cascade,
  add column if not exists text text,
  add column if not exists content text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'messages'
      and column_name = 'body'
  ) then
    execute '
      update public.messages
      set text = coalesce(text, content, body),
          content = coalesce(content, text, body),
          body = coalesce(body, text, content)
      where text is null
         or content is null
         or body is null
    ';
  else
    execute '
      update public.messages
      set text = coalesce(text, content),
          content = coalesce(content, text)
      where text is null
         or content is null
    ';
  end if;
end $$;

create index if not exists chats_client_worker_idx
  on public.chats (client_id, worker_id);

create index if not exists messages_chat_created_idx
  on public.messages (chat_id, created_at);

create index if not exists jobs_worker_status_idx
  on public.jobs (worker_id, status, created_at desc);
