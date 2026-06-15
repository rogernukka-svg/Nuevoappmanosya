-- ManosYA realtime surgical connections
-- Activates only low-volume, high-value operational tables.
-- Avoids feed/comment/location tables to prevent noisy realtime streams.

do $$
declare
  rel_name text;
  realtime_tables text[] := array[
    'chats',
    'messages',
    'supplier_contacts'
  ];
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach rel_name in array realtime_tables loop
      if exists (
        select 1
        from information_schema.tables
        where table_schema = 'public'
          and table_name = rel_name
      )
      and not exists (
        select 1
        from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = rel_name
      ) then
        execute format('alter publication supabase_realtime add table public.%I', rel_name);
      end if;
    end loop;
  end if;
end $$;
