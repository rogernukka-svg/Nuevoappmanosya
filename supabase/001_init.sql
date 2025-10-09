-- Enable extensions
create extension if not exists postgis;
create extension if not exists pgcrypto;

-- Roles & helpers
create or replace function public.is_auth() returns boolean
language sql stable as $$
  select auth.uid() is not null;
$$;

-- Profiles --------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'client' check (role in ('client','worker','admin')),
  photo_url text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS: profiles
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select using (true);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Worker profiles ------------------------------------------
create table if not exists public.worker_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  bio text,
  is_active boolean not null default true,
  is_verified boolean not null default false,
  service_radius_km numeric not null default 5,
  geog geography(Point, 4326),
  updated_at timestamptz not null default now()
);
alter table public.worker_profiles enable row level security;

-- RLS: worker_profiles
drop policy if exists "wp_select_all" on public.worker_profiles;
create policy "wp_select_all" on public.worker_profiles
  for select using (true);

drop policy if exists "wp_modify_own" on public.worker_profiles;
create policy "wp_modify_own" on public.worker_profiles
  for insert with check (auth.uid() = user_id);

create policy "wp_update_own" on public.worker_profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Skills ----------------------------------------------------
create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  category text
);
alter table public.skills enable row level security;
drop policy if exists "skills_select" on public.skills;
create policy "skills_select" on public.skills for select using (true);

insert into public.skills (slug, name, category) values
  ('plomeria','Plomería','hogar'),
  ('jardineria','Jardinería','hogar'),
  ('pintura','Pintura','hogar'),
  ('mudanza','Mudanza','hogar'),
  ('electricidad','Electricidad','hogar'),
  ('auxilio','Auxilio vehicular','vehicular')
on conflict (slug) do nothing;

-- Worker skills (many-to-many) -----------------------------
create table if not exists public.worker_skills (
  worker_id uuid references public.profiles(id) on delete cascade,
  skill_id uuid references public.skills(id) on delete cascade,
  primary key (worker_id, skill_id)
);
alter table public.worker_skills enable row level security;

drop policy if exists "ws_select_all" on public.worker_skills;
create policy "ws_select_all" on public.worker_skills
  for select using (true);

drop policy if exists "ws_modify_own" on public.worker_skills;
create policy "ws_modify_own" on public.worker_skills
  for insert with check (auth.uid() = worker_id);

create policy "ws_delete_own" on public.worker_skills
  for delete using (auth.uid() = worker_id);

-- Helper view (worker_skills -> slugs) ---------------------
create or replace view public.worker_skills_view as
select ws.worker_id, s.slug as skill_slug
from public.worker_skills ws
join public.skills s on s.id = ws.skill_id;

-- Jobs ------------------------------------------------------
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  skill_id uuid not null references public.skills(id),
  title text not null,
  description text,
  price_offer int,
  address_text text,
  status text not null default 'open' check (status in ('open','assigned','in_progress','completed','cancelled')),
  assigned_worker uuid references public.profiles(id),
  location_geog geography(Point, 4326),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.jobs enable row level security;

-- RLS: jobs
drop policy if exists "jobs_insert_own" on public.jobs;
create policy "jobs_insert_own" on public.jobs
  for insert with check (auth.uid() = client_id);

drop policy if exists "jobs_select_open_or_participant" on public.jobs;
create policy "jobs_select_open_or_participant" on public.jobs
  for select using (
    status = 'open'
    or auth.uid() = client_id
    or auth.uid() = assigned_worker
  );

drop policy if exists "jobs_update_owner_or_assigned" on public.jobs;
create policy "jobs_update_owner_or_assigned" on public.jobs
  for update using (
    auth.uid() = client_id or auth.uid() = assigned_worker
  )
  with check (
    auth.uid() = client_id or auth.uid() = assigned_worker
  );

drop policy if exists "jobs_delete_owner_open" on public.jobs;
create policy "jobs_delete_owner_open" on public.jobs
  for delete using (auth.uid() = client_id and status = 'open');

-- Ratings (simple) -----------------------------------------
create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  rater_id uuid not null references public.profiles(id) on delete cascade,
  ratee_id uuid not null references public.profiles(id) on delete cascade,
  stars int not null check (stars between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);
alter table public.ratings enable row level security;
drop policy if exists "ratings_select_all" on public.ratings;
create policy "ratings_select_all" on public.ratings for select using (true);
drop policy if exists "ratings_insert_self" on public.ratings;
create policy "ratings_insert_self" on public.ratings
  for insert with check (auth.uid() = rater_id);

-- RPCs -----------------------------------------------------

-- Create job (client-side friendly, accepts lon/lat)
create or replace function public.create_job(
  title text,
  description text,
  skill_slug text,
  lon double precision,
  lat double precision,
  price_offer int,
  address_text text
) returns uuid
language plpgsql
as $$
declare
  v_skill uuid;
  v_job uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select id into v_skill from public.skills where slug = skill_slug;
  if v_skill is null then
    raise exception 'skill not found';
  end if;

  insert into public.jobs (
    client_id, skill_id, title, description, price_offer, address_text, location_geog
  ) values (
    auth.uid(), v_skill, title, description, price_offer, address_text,
    ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography
  ) returning id into v_job;

  return v_job;
end;
$$;

-- Set worker location
create or replace function public.set_my_worker_location(
  lon double precision, lat double precision
) returns void
language plpgsql as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  update public.worker_profiles
    set geog = ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography,
        updated_at = now()
  where user_id = auth.uid();
end;
$$;

-- Replace worker skills by slugs array
create or replace function public.set_worker_skills(skill_slugs text[])
returns void
language plpgsql as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  delete from public.worker_skills where worker_id = auth.uid();
  insert into public.worker_skills (worker_id, skill_id)
  select auth.uid(), s.id
  from public.skills s
  where s.slug = any(skill_slugs);
end;
$$;

-- Find nearby jobs for workers
create or replace function public.fn_find_nearby_jobs(
  lon double precision,
  lat double precision,
  radius_km numeric,
  skill_slug text
)
returns table (
  job_id uuid,
  title text,
  description text,
  price_offer int,
  address_text text,
  distance_km numeric
)
language sql stable as $$
  with c as (
    select ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography as g
  )
  select j.id as job_id, j.title, j.description, j.price_offer, j.address_text,
         round( (ST_Distance(j.location_geog, c.g) / 1000.0)::numeric, 2) as distance_km
  from public.jobs j
  join public.skills s on s.id = j.skill_id
  cross join c
  where j.status = 'open'
    and s.slug = skill_slug
    and j.location_geog is not null
    and ST_DWithin(j.location_geog, c.g, (radius_km * 1000.0));
$$;

-- Find nearby workers for clients (optional)
create or replace function public.fn_find_nearby_workers(
  lon double precision,
  lat double precision,
  radius_km numeric,
  skill_slug text
)
returns table (
  worker_id uuid,
  email text,
  distance_km numeric
)
language sql stable as $$
  with c as (
    select ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography as g
  )
  select w.user_id as worker_id, p.email,
         round( (ST_Distance(w.geog, c.g) / 1000.0)::numeric, 2) as distance_km
  from public.worker_profiles w
  join public.profiles p on p.id = w.user_id
  join public.worker_skills ws on ws.worker_id = w.user_id
  join public.skills s on s.id = ws.skill_id
  cross join c
  where w.is_active = true
    and w.geog is not null
    and s.slug = skill_slug
    and ST_DWithin(w.geog, c.g, (radius_km * 1000.0));
$$;