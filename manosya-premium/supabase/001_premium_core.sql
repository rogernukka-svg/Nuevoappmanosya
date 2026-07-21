-- ManosYA Premium core schema.
-- Mantiene auth.users y crea tablas public limpias referenciando auth.users(id).

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  phone text,
  avatar_url text,
  role text not null default 'client' check (role in ('client', 'worker', 'supplier', 'admin', 'cashier')),
  admin_role text,
  city text,
  is_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.worker_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  headline text,
  bio text,
  skills text[] not null default '{}',
  city text,
  lat double precision,
  lng double precision,
  rating numeric(3,2) not null default 0,
  completed_jobs integer not null default 0,
  response_minutes integer,
  is_active boolean not null default false,
  is_available boolean not null default false,
  cover_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.supplier_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  business_name text,
  category text,
  city text,
  phone text,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  worker_id uuid references public.profiles(id) on delete set null,
  service_slug text not null,
  title text not null,
  description text,
  status text not null default 'open' check (status in ('open', 'assigned', 'accepted', 'scheduled', 'in_progress', 'completed', 'cancelled', 'rejected')),
  city text,
  address text,
  lat double precision,
  lng double precision,
  budget_min numeric(12,2),
  budget_max numeric(12,2),
  scheduled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.job_photos (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  path text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.chats (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.jobs(id) on delete cascade,
  client_id uuid references public.profiles(id) on delete cascade,
  worker_id uuid references public.profiles(id) on delete cascade,
  supplier_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text,
  media_url text,
  media_type text,
  created_at timestamptz not null default now()
);

create table if not exists public.dm_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  body text,
  media_url text,
  media_type text,
  created_at timestamptz not null default now()
);

create table if not exists public.worker_posts (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.profiles(id) on delete cascade,
  caption text,
  media_url text,
  media_type text not null default 'image',
  service_slug text,
  city text,
  created_at timestamptz not null default now()
);

create table if not exists public.worker_likes (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.profiles(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(worker_id, client_id)
);

create table if not exists public.worker_comments (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid references public.worker_posts(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.user_friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'blocked')),
  created_at timestamptz not null default now(),
  unique(requester_id, addressee_id)
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.jobs(id) on delete cascade,
  reviewer_id uuid references public.profiles(id) on delete set null,
  reviewee_id uuid references public.profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  body text,
  created_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  doc_type text not null,
  doc_number text,
  front_url text,
  back_url text,
  file_url text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.bank_accounts (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  bank_name text,
  account_type text,
  account_number text,
  holder_name text,
  holder_document text,
  created_at timestamptz not null default now()
);

create table if not exists public.worker_locations (
  worker_id uuid primary key references public.profiles(id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.supplier_products (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  price numeric(12,2),
  service_slug text,
  media_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.supplier_contacts (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.profiles(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  message text,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.user_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  event_name text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.admin_worker_notes (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.profiles(id) on delete cascade,
  admin_id uuid references public.profiles(id) on delete set null,
  note text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_worker_history (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid references public.profiles(id) on delete cascade,
  admin_id uuid references public.profiles(id) on delete set null,
  action text not null,
  detail text,
  extra jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.worker_blocks (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.profiles(id) on delete cascade,
  admin_id uuid references public.profiles(id) on delete set null,
  reason text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create or replace view public.worker_feed_view as
select
  wp.user_id,
  p.full_name,
  p.avatar_url,
  p.is_verified,
  wp.headline,
  wp.bio,
  wp.skills,
  wp.city,
  wp.lat,
  wp.lng,
  wp.rating,
  wp.completed_jobs,
  wp.response_minutes,
  wp.is_available,
  wp.cover_url,
  latest_post.id as post_id,
  latest_post.caption,
  latest_post.media_url,
  latest_post.media_type
from public.worker_profiles wp
join public.profiles p on p.id = wp.user_id
left join lateral (
  select *
  from public.worker_posts post
  where post.worker_id = wp.user_id
  order by post.created_at desc
  limit 1
) latest_post on true
where wp.is_active = true;

alter table public.profiles enable row level security;
alter table public.worker_profiles enable row level security;
alter table public.supplier_profiles enable row level security;
alter table public.jobs enable row level security;
alter table public.chats enable row level security;
alter table public.messages enable row level security;
alter table public.dm_messages enable row level security;

create policy "profiles_select_own_or_public_workers"
on public.profiles for select
using (
  auth.uid() = id
  or role in ('worker', 'supplier')
  or exists (select 1 from public.profiles admin where admin.id = auth.uid() and admin.role in ('admin', 'cashier'))
);

create policy "profiles_update_own"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "worker_profiles_public_read"
on public.worker_profiles for select
using (is_active = true or auth.uid() = user_id or exists (select 1 from public.profiles admin where admin.id = auth.uid() and admin.role in ('admin', 'cashier')));

create policy "worker_profiles_owner_write"
on public.worker_profiles for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "jobs_participants_read"
on public.jobs for select
using (
  auth.uid() = client_id
  or auth.uid() = worker_id
  or status = 'open'
  or exists (select 1 from public.profiles admin where admin.id = auth.uid() and admin.role in ('admin', 'cashier'))
);

create policy "jobs_client_insert"
on public.jobs for insert
with check (auth.uid() = client_id);

create policy "jobs_participants_update"
on public.jobs for update
using (
  auth.uid() = client_id
  or auth.uid() = worker_id
  or exists (select 1 from public.profiles admin where admin.id = auth.uid() and admin.role in ('admin', 'cashier'))
);

create policy "chats_participants_read"
on public.chats for select
using (
  auth.uid() = client_id
  or auth.uid() = worker_id
  or auth.uid() = supplier_id
  or exists (select 1 from public.profiles admin where admin.id = auth.uid() and admin.role in ('admin', 'cashier'))
);

create policy "messages_participants_read"
on public.messages for select
using (
  exists (
    select 1 from public.chats c
    where c.id = chat_id
    and (auth.uid() = c.client_id or auth.uid() = c.worker_id or auth.uid() = c.supplier_id)
  )
);

create policy "messages_sender_insert"
on public.messages for insert
with check (auth.uid() = sender_id);
