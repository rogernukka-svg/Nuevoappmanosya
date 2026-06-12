-- Connection hardening for the three pillars: client, worker and supplier.
-- Keeps the schema aligned with the app routes that already use these fields.

alter table public.worker_profiles
  add column if not exists status text not null default 'available',
  add column if not exists skills text[] not null default '{}',
  add column if not exists service_type text,
  add column if not exists main_skill text,
  add column if not exists full_name text,
  add column if not exists avatar_url text,
  add column if not exists profile_photo_url text,
  add column if not exists lat numeric,
  add column if not exists lng numeric,
  add column if not exists last_lat numeric,
  add column if not exists last_lon numeric,
  add column if not exists radius_km numeric not null default 5,
  add column if not exists busy_until timestamptz;

create index if not exists worker_profiles_status_active_idx
  on public.worker_profiles (status, is_active, updated_at desc);

create index if not exists worker_profiles_location_idx
  on public.worker_profiles (lat, lng)
  where lat is not null and lng is not null;

create table if not exists public.worker_locations (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  lat numeric not null,
  lng numeric not null,
  updated_at timestamptz not null default now()
);

alter table public.worker_locations enable row level security;

drop policy if exists worker_locations_select_authenticated on public.worker_locations;
create policy worker_locations_select_authenticated on public.worker_locations
  for select using (auth.uid() is not null);

drop policy if exists worker_locations_upsert_own on public.worker_locations;
create policy worker_locations_upsert_own on public.worker_locations
  for insert with check (auth.uid() = user_id);

drop policy if exists worker_locations_update_own on public.worker_locations;
create policy worker_locations_update_own on public.worker_locations
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists worker_locations_updated_idx
  on public.worker_locations (updated_at desc);

alter table public.worker_comments
  add column if not exists post_id uuid references public.worker_posts(id) on delete cascade;

create index if not exists worker_comments_post_idx
  on public.worker_comments (post_id, created_at desc);

create index if not exists worker_comments_worker_post_idx
  on public.worker_comments (worker_id, post_id, created_at desc);

create or replace view public.map_workers_view as
select
  p.id as user_id,
  p.id,
  coalesce(w.full_name, p.full_name, p.email) as full_name,
  p.email,
  coalesce(w.avatar_url, w.profile_photo_url, p.avatar_url) as avatar_url,
  p.role,
  w.bio,
  w.cover_url,
  w.is_active,
  w.is_verified,
  w.status,
  w.skills,
  w.service_type,
  w.main_skill,
  coalesce(w.radius_km, w.service_radius_km, 5) as radius_km,
  coalesce(w.lat, wl.lat, case when w.geog is null then null else st_y(w.geog::geometry)::numeric end) as lat,
  coalesce(w.lng, wl.lng, case when w.geog is null then null else st_x(w.geog::geometry)::numeric end) as lng,
  greatest(
    coalesce(w.updated_at, 'epoch'::timestamptz),
    coalesce(wl.updated_at, 'epoch'::timestamptz)
  ) as updated_at
from public.profiles p
join public.worker_profiles w on w.user_id = p.id
left join public.worker_locations wl on wl.user_id = p.id
where coalesce(p.role, 'worker') = 'worker';

create or replace view public.worker_posts_public as
select
  wp.id,
  wp.id as post_id,
  wp.worker_id,
  wp.media_url,
  wp.media_url as thumbnail_url,
  wp.media_type,
  wp.caption,
  wp.text_overlay,
  wp.service_type,
  wp.music_url,
  wp.created_at,
  p.full_name,
  p.avatar_url
from public.worker_posts wp
left join public.profiles p on p.id = wp.worker_id;

create or replace function public.post_message(p_job_id uuid, p_body text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
  clean_body text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  clean_body := public.sanitize_public_text(p_body, 1200);
  if char_length(clean_body) < 1 then
    raise exception 'empty message';
  end if;

  select client_id, assigned_worker, worker_id into rec
  from public.jobs
  where id = p_job_id;

  if not found then
    raise exception 'job not found';
  end if;

  if auth.uid() is distinct from rec.client_id
    and auth.uid() is distinct from rec.assigned_worker
    and auth.uid() is distinct from rec.worker_id then
    raise exception 'not a participant';
  end if;

  insert into public.messages(job_id, sender_id, body, text, content)
  values (p_job_id, auth.uid(), clean_body, clean_body, clean_body);
end;
$$;

grant execute on function public.post_message(uuid, text) to authenticated;

do $$
declare
  rel_name text;
  realtime_tables text[] := array[
    'jobs',
    'chats',
    'messages',
    'dm_messages',
    'worker_profiles',
    'worker_locations',
    'worker_posts',
    'worker_likes',
    'worker_comments',
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
