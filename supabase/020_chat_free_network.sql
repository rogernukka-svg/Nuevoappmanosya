-- ManosYA chat freedom
-- ManosYA is a connection network, not a ride/task locker.
-- A job can be a context for a conversation, but it must not block future chats.

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.chats'::regclass
      and conname = 'chats_job_id_key'
  ) then
    alter table public.chats drop constraint chats_job_id_key;
  end if;
end $$;

drop index if exists public.chats_job_id_key;
drop index if exists public.chats_job_id_unique;
drop index if exists public.uniq_chats_job_id;

create index if not exists chats_job_created_idx
  on public.chats (job_id, created_at desc);

create index if not exists chats_participants_created_idx
  on public.chats (client_id, worker_id, created_at desc);

notify pgrst, 'reload schema';
