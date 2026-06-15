-- ManosYA chat audio storage
-- Private bucket for short chat audios. The app creates signed URLs per message.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-audios',
  'chat-audios',
  false,
  10485760,
  array['audio/webm', 'audio/mpeg', 'audio/mp4', 'audio/ogg']
)
on conflict (id) do update
set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists chat_audios_insert_participants on storage.objects;
create policy chat_audios_insert_participants on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'chat-audios'
    and (
      name like ('%' || auth.uid()::text || '%')
      or exists (
        select 1
        from public.chats c
        where c.id::text = (storage.foldername(name))[1]
          and (c.client_id = auth.uid() or c.worker_id = auth.uid())
      )
    )
  );

drop policy if exists chat_audios_select_participants on storage.objects;
create policy chat_audios_select_participants on storage.objects
  for select to authenticated
  using (
    bucket_id = 'chat-audios'
    and (
      name like ('%' || auth.uid()::text || '%')
      or exists (
        select 1
        from public.chats c
        where c.id::text = (storage.foldername(name))[1]
          and (c.client_id = auth.uid() or c.worker_id = auth.uid())
      )
    )
  );
