-- ManosYA job acceptance compatibility
-- Keeps old take_job(job_id) calls working and adds accept_job(p_job_id, p_status)
-- for the newer worker_id-based app screens.

create or replace function public.accept_job(p_job_id uuid, p_status text default 'accepted')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  next_status text;
  has_accepted_at boolean;
  has_worker_id boolean;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  next_status := coalesce(nullif(trim(p_status), ''), 'accepted');

  if next_status not in ('accepted', 'assigned', 'scheduled') then
    raise exception 'invalid job status';
  end if;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'jobs'
      and column_name = 'accepted_at'
  ) into has_accepted_at;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'jobs'
      and column_name = 'worker_id'
  ) into has_worker_id;

  if not has_worker_id then
    raise exception 'jobs.worker_id column is required';
  end if;

  if has_accepted_at then
    execute '
      update public.jobs
      set worker_id = auth.uid(),
          status = $1,
          accepted_at = now(),
          updated_at = now()
      where id = $2
        and status = ''open''
    ' using next_status, p_job_id;
  else
    execute '
      update public.jobs
      set worker_id = auth.uid(),
          status = $1,
          updated_at = now()
      where id = $2
        and status = ''open''
    ' using next_status, p_job_id;
  end if;

  if not found then
    raise exception 'job not open';
  end if;
end;
$$;

grant execute on function public.accept_job(uuid, text) to authenticated;

drop function if exists public.take_job(uuid);

create or replace function public.take_job(job_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.accept_job(job_id, 'assigned');
end;
$$;

grant execute on function public.take_job(uuid) to authenticated;
