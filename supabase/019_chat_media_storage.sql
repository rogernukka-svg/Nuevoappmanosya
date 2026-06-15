-- ManosYA chat media storage
-- Private bucket for chat photos/videos. Access is limited to chat participants.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-media',
  'chat-media',
  false,
  26214400,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime']
)
on conflict (id) do update
set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "chat_media_insert_participants" on storage.objects;
create policy "chat_media_insert_participants" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'chat-media'
    and (
      position(auth.uid()::text in name) > 0
      or exists (
        select 1
        from public.chats c
        where c.id::text = (storage.foldername(name))[1]
          and (c.client_id = auth.uid() or c.worker_id = auth.uid())
      )
    )
  );

drop policy if exists "chat_media_select_participants" on storage.objects;
create policy "chat_media_select_participants" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'chat-media'
    and exists (
      select 1
      from public.chats c
      where c.id::text = (storage.foldername(name))[1]
        and (c.client_id = auth.uid() or c.worker_id = auth.uid())
    )
  );
