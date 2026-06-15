-- ManosYA realtime messages
-- Enables realtime delivery for chat messages only.
-- App listeners filter by chat_id, so clients do not subscribe to the full firehose.

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and exists (
      select 1
      from information_schema.tables
      where table_schema = 'public'
        and table_name = 'messages'
    )
    and not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'messages'
    ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;
