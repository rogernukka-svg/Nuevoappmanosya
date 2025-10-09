-- Messages --------------------------------------------------
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
alter table public.messages enable row level security;

-- RLS for messages: only job participants (client or assigned worker) can see/insert
drop policy if exists "msg_select_participants" on public.messages;
create policy "msg_select_participants" on public.messages
  for select using (
    exists (
      select 1 from public.jobs j
      where j.id = job_id
        and (auth.uid() = j.client_id or auth.uid() = j.assigned_worker)
    )
  );

drop policy if exists "msg_insert_participants" on public.messages;
create policy "msg_insert_participants" on public.messages
  for insert with check (
    sender_id = auth.uid() and exists (
      select 1 from public.jobs j
      where j.id = job_id
        and (auth.uid() = j.client_id or auth.uid() = j.assigned_worker)
    )
  );

-- RPC to post message
create or replace function public.post_message(job_id uuid, body text)
returns void language plpgsql as $$
declare rec record;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  select client_id, assigned_worker into rec from public.jobs where id = job_id;
  if rec is null then raise exception 'job not found'; end if;
  if auth.uid() <> rec.client_id and auth.uid() <> rec.assigned_worker then
    raise exception 'not a participant';
  end if;
  insert into public.messages(job_id, sender_id, body) values (job_id, auth.uid(), body);
end;
$$;

-- Job flow RPCs --------------------------------------------
create or replace function public.take_job(job_id uuid)
returns void language plpgsql as $$
declare j record;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select * into j from public.jobs where id = job_id for update;
  if j is null then raise exception 'job not found'; end if;
  if j.status <> 'open' then raise exception 'job not open'; end if;
  -- optional: check worker has profile active
  update public.jobs set assigned_worker = auth.uid(), status = 'assigned', updated_at = now() where id = job_id;
end;
$$;

create or replace function public.start_job(job_id uuid)
returns void language plpgsql as $$
declare j record;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select * into j from public.jobs where id = job_id;
  if j is null then raise exception 'job not found'; end if;
  if j.assigned_worker <> auth.uid() then raise exception 'not assigned worker'; end if;
  if j.status <> 'assigned' then raise exception 'invalid status'; end if;
  update public.jobs set status = 'in_progress', updated_at = now() where id = job_id;
end;
$$;

create or replace function public.complete_job(job_id uuid)
returns void language plpgsql as $$
declare j record;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select * into j from public.jobs where id = job_id;
  if j is null then raise exception 'job not found'; end if;
  if j.status <> 'in_progress' and j.status <> 'assigned' then raise exception 'invalid status'; end if;
  if auth.uid() <> j.client_id and auth.uid() <> j.assigned_worker then raise exception 'not participant'; end if;
  update public.jobs set status = 'completed', updated_at = now() where id = job_id;
end;
$$;

create or replace function public.cancel_job(job_id uuid)
returns void language plpgsql as $$
declare j record;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select * into j from public.jobs where id = job_id;
  if j is null then raise exception 'job not found'; end if;
  if auth.uid() <> j.client_id then raise exception 'only client can cancel'; end if;
  if j.status = 'completed' then raise exception 'already completed'; end if;
  update public.jobs set status = 'cancelled', updated_at = now() where id = job_id;
end;
$$;

-- Admin verification ---------------------------------------
create or replace function public.admin_toggle_verified(worker_id uuid, make_verified boolean)
returns void language plpgsql security definer set search_path = public as $$
declare r text;
begin
  -- check caller is admin
  select role into r from public.profiles where id = auth.uid();
  if r <> 'admin' then
    raise exception 'not admin';
  end if;
  update public.worker_profiles set is_verified = make_verified, updated_at = now() where user_id = worker_id;
end;
$$;

-- Extra: allow admins to update worker_profiles directly via policy too (optional)
drop policy if exists "wp_admin_update" on public.worker_profiles;
create policy "wp_admin_update" on public.worker_profiles
  for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role='admin')
  ) with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role='admin')
  );

-- Relationship helpers for UI ------------------------------
-- expose skill name via foreign key (for selects in Next.js)
alter table public.jobs drop constraint if exists jobs_skill_id_fkey;
alter table public.jobs add constraint jobs_skill_id_fkey foreign key (skill_id) references public.skills(id);

-- Make sure skills has unique slug for joins
create unique index if not exists idx_skills_slug on public.skills(slug);