-- ManosYA chat message compatibility
-- Server-compatible version based on the current production schema.
-- Messaging is a consultation bridge: it does not accept jobs or mark workers busy.

alter table public.messages
  add column if not exists chat_id uuid references public.chats(id) on delete cascade,
  add column if not exists text text,
  add column if not exists content text,
  add column if not exists body text,
  add column if not exists message_type text not null default 'text',
  add column if not exists media_url text,
  add column if not exists media_path text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'messages'
      and column_name = 'job_id'
  ) then
    alter table public.messages alter column job_id drop not null;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'messages'
      and column_name = 'body'
  ) then
    alter table public.messages alter column body drop not null;
  end if;
end $$;

update public.messages
set
  text = coalesce(text, content, body),
  content = coalesce(content, text, body),
  body = coalesce(body, text, content)
where text is null
   or content is null
   or body is null;

create index if not exists messages_chat_created_idx
  on public.messages (chat_id, created_at);

drop policy if exists "msg_select_participants" on public.messages;
drop policy if exists "msg_insert_participants" on public.messages;
drop policy if exists "msg visible to participants" on public.messages;
drop policy if exists "msg insert by participant" on public.messages;
drop policy if exists "msg_participants" on public.messages;
drop policy if exists "permitir_leer_mensajes_chat" on public.messages;
drop policy if exists "permitir_insertar_mensajes_chat" on public.messages;
drop policy if exists "permitir_realtime_mensajes_filtrado" on public.messages;

create policy "msg_select_participants" on public.messages
  for select using (
    exists (
      select 1
      from public.chats c
      where c.id = messages.chat_id
        and (auth.uid() = c.client_id or auth.uid() = c.worker_id)
    )
  );

create policy "msg_insert_participants" on public.messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1
      from public.chats c
      where c.id = messages.chat_id
        and (auth.uid() = c.client_id or auth.uid() = c.worker_id)
    )
  );

create or replace function public.post_chat_message(p_chat_id uuid, p_text text)
returns public.messages
language plpgsql
security definer
set search_path = public
as $$
declare
  v_text text;
  v_message public.messages;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  v_text := left(btrim(regexp_replace(coalesce(p_text, ''), '[[:cntrl:]]', '', 'g')), 1200);

  if char_length(v_text) < 1 then
    raise exception 'empty message';
  end if;

  if v_text ~* '(javascript:|data:text/html|vbscript:|<\s*/?\s*(script|iframe|object|embed|link|meta|style)\b|\bon[a-z]+\s*=)' then
    raise exception 'unsafe message';
  end if;

  if not exists (
    select 1
    from public.chats c
    where c.id = p_chat_id
      and (c.client_id = auth.uid() or c.worker_id = auth.uid())
  ) then
    raise exception 'not a participant';
  end if;

  insert into public.messages(chat_id, sender_id, text, content, body)
  values (p_chat_id, auth.uid(), v_text, v_text, v_text)
  returning * into v_message;

  return v_message;
end;
$$;

grant execute on function public.post_chat_message(uuid, text) to authenticated;

notify pgrst, 'reload schema';
