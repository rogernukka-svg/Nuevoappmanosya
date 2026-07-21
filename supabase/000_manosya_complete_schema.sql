-- ManosYA 2.0 - esquema completo Supabase
-- Ejecutar en un proyecto Supabase nuevo o con backup.
-- No borra auth.users. Crea tablas public, triggers, vistas, RPCs, RLS y buckets.

create extension if not exists "pgcrypto";

do $$ begin
  create type public.app_role as enum ('client', 'worker', 'supplier', 'admin', 'cashier');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.job_status as enum ('open', 'assigned', 'accepted', 'scheduled', 'in_progress', 'arrived', 'completed', 'done', 'cancelled', 'canceled', 'rejected');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.verification_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.media_kind as enum ('text', 'image', 'video', 'audio', 'file');
exception when duplicate_object then null;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  phone text,
  avatar_url text,
  role public.app_role not null default 'client',
  admin_role text,
  city text,
  address text,
  lat double precision,
  lng double precision,
  bio text,
  is_verified boolean not null default false,
  onboarding_completed boolean not null default false,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.service_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  icon text,
  parent_slug text,
  is_active boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now()
);

create table if not exists public.worker_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  headline text,
  bio text,
  skills text[] not null default '{}',
  service_slugs text[] not null default '{}',
  city text,
  address text,
  lat double precision,
  lng double precision,
  last_lat double precision,
  last_lon double precision,
  radius_km numeric(6,2) not null default 12,
  years_experience integer not null default 0,
  rating numeric(3,2) not null default 0,
  rating_count integer not null default 0,
  completed_jobs integer not null default 0,
  response_minutes integer,
  verification_status public.verification_status not null default 'pending',
  is_active boolean not null default false,
  active boolean not null default false,
  is_available boolean not null default false,
  cover_url text,
  intro_video_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.supplier_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  business_name text,
  category text,
  city text,
  phone text,
  logo_url text,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  worker_id uuid references public.profiles(id) on delete set null,
  assigned_worker uuid references public.profiles(id) on delete set null,
  service_slug text,
  service_type text,
  skill_id text,
  title text not null,
  description text,
  status public.job_status not null default 'open',
  urgency text not null default 'normal',
  city text,
  address text,
  lat double precision,
  lng double precision,
  budget_min numeric(12,2),
  budget_max numeric(12,2),
  scheduled_at timestamptz,
  accepted_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.business_jobs (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.jobs(id) on delete cascade,
  client_id uuid references public.profiles(id) on delete cascade,
  company_name text,
  contact_name text,
  phone text,
  service_slug text,
  description text,
  city text,
  status text not null default 'open',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
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
  title text,
  last_read_by_client timestamptz,
  last_read_by_worker timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text,
  text text,
  content text,
  media_url text,
  media_type public.media_kind not null default 'text',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.dm_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  body text,
  media_url text,
  media_type public.media_kind not null default 'text',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.worker_posts (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.profiles(id) on delete cascade,
  caption text,
  media_url text,
  media_type public.media_kind not null default 'image',
  service_slug text,
  city text,
  lat double precision,
  lng double precision,
  is_public boolean not null default true,
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
  updated_at timestamptz not null default now(),
  unique(requester_id, addressee_id),
  check (requester_id <> addressee_id)
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.jobs(id) on delete cascade,
  reviewer_id uuid references public.profiles(id) on delete set null,
  reviewee_id uuid references public.profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  body text,
  comment text,
  created_at timestamptz not null default now(),
  unique(job_id, reviewer_id, reviewee_id)
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  doc_type text not null,
  doc_number text,
  front_url text,
  back_url text,
  file_url text,
  status public.verification_status not null default 'pending',
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bank_accounts (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  bank_name text,
  account_type text,
  account_number text,
  holder_name text,
  holder_document text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.worker_locations (
  worker_id uuid primary key references public.profiles(id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  accuracy_meters numeric(8,2),
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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
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
  data jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text,
  auth text,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  event_name text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.page_views (
  id uuid primary key default gen_random_uuid(),
  page text not null,
  user_id uuid references public.profiles(id) on delete set null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.worker_leads (
  id uuid primary key default gen_random_uuid(),
  full_name text,
  phone text,
  email text,
  city text,
  service_slug text,
  document_front_url text,
  document_back_url text,
  status text not null default 'new',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wallets (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  balance numeric(12,2) not null default 0,
  currency text not null default 'PYG',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_slug text not null,
  status text not null default 'active',
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  amount numeric(12,2) not null,
  currency text not null default 'PYG',
  type text not null default 'subscription',
  status text not null default 'paid',
  idempotency_key text unique,
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

create table if not exists public.admin_expenses (
  id uuid primary key default gen_random_uuid(),
  concept text not null,
  category text,
  vendor text,
  amount numeric(12,2) not null default 0,
  invoice_number text,
  issued_at date not null default current_date,
  status text not null default 'pending' check (status in ('pending', 'paid', 'cancelled')),
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_invoices (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  description text,
  amount numeric(12,2) not null default 0,
  invoice_number text,
  issued_at date not null default current_date,
  due_at date,
  status text not null default 'draft' check (status in ('draft', 'issued', 'paid', 'cancelled')),
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.incidents (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.jobs(id) on delete cascade,
  reporter_id uuid references public.profiles(id) on delete set null,
  reason text,
  details text,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.service_categories (slug, label, icon, sort_order) values
  ('plomero', 'Plomeria', 'wrench', 10),
  ('electricista', 'Electricista', 'zap', 20),
  ('limpieza', 'Limpieza', 'sparkles', 30),
  ('flete', 'Flete', 'truck', 40),
  ('jardinero', 'Jardineria', 'leaf', 50),
  ('pintor', 'Pintura', 'paintbrush', 60),
  ('auxilio', 'Auxilio', 'shield', 70),
  ('materiales', 'Materiales', 'package', 80)
on conflict (slug) do update set
  label = excluded.label,
  icon = excluded.icon,
  sort_order = excluded.sort_order,
  is_active = true;

create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_worker_profiles_active on public.worker_profiles(is_active, is_available);
create index if not exists idx_worker_profiles_skills on public.worker_profiles using gin(skills);
create index if not exists idx_jobs_client on public.jobs(client_id, created_at desc);
create index if not exists idx_jobs_worker on public.jobs(worker_id, created_at desc);
create index if not exists idx_jobs_assigned_worker on public.jobs(assigned_worker, created_at desc);
create index if not exists idx_jobs_status on public.jobs(status, created_at desc);
create index if not exists idx_chats_job on public.chats(job_id);
create index if not exists idx_messages_chat on public.messages(chat_id, created_at);
create index if not exists idx_dm_messages_pair on public.dm_messages(sender_id, receiver_id, created_at);
create index if not exists idx_worker_posts_worker on public.worker_posts(worker_id, created_at desc);
create index if not exists idx_reviews_reviewee on public.reviews(reviewee_id);
create index if not exists idx_notifications_user on public.notifications(user_id, read_at, created_at desc);

drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists trg_worker_profiles_updated on public.worker_profiles;
create trigger trg_worker_profiles_updated before update on public.worker_profiles for each row execute function public.set_updated_at();
drop trigger if exists trg_supplier_profiles_updated on public.supplier_profiles;
create trigger trg_supplier_profiles_updated before update on public.supplier_profiles for each row execute function public.set_updated_at();
drop trigger if exists trg_jobs_updated on public.jobs;
create trigger trg_jobs_updated before update on public.jobs for each row execute function public.set_updated_at();
drop trigger if exists trg_chats_updated on public.chats;
create trigger trg_chats_updated before update on public.chats for each row execute function public.set_updated_at();
drop trigger if exists trg_user_friendships_updated on public.user_friendships;
create trigger trg_user_friendships_updated before update on public.user_friendships for each row execute function public.set_updated_at();
drop trigger if exists trg_documents_updated on public.documents;
create trigger trg_documents_updated before update on public.documents for each row execute function public.set_updated_at();
drop trigger if exists trg_bank_accounts_updated on public.bank_accounts;
create trigger trg_bank_accounts_updated before update on public.bank_accounts for each row execute function public.set_updated_at();
drop trigger if exists trg_supplier_products_updated on public.supplier_products;
create trigger trg_supplier_products_updated before update on public.supplier_products for each row execute function public.set_updated_at();
drop trigger if exists trg_push_subscriptions_updated on public.push_subscriptions;
create trigger trg_push_subscriptions_updated before update on public.push_subscriptions for each row execute function public.set_updated_at();
drop trigger if exists trg_worker_leads_updated on public.worker_leads;
create trigger trg_worker_leads_updated before update on public.worker_leads for each row execute function public.set_updated_at();
drop trigger if exists trg_wallets_updated on public.wallets;
create trigger trg_wallets_updated before update on public.wallets for each row execute function public.set_updated_at();
drop trigger if exists trg_subscriptions_updated on public.subscriptions;
create trigger trg_subscriptions_updated before update on public.subscriptions for each row execute function public.set_updated_at();
drop trigger if exists trg_incidents_updated on public.incidents;
create trigger trg_incidents_updated before update on public.incidents for each row execute function public.set_updated_at();

create or replace function public.current_user_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role::text::public.app_role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin_or_cashier()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'cashier')
  );
$$;

create or replace function public.is_chat_participant(p_chat_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.chats c
    where c.id = p_chat_id
      and auth.uid() in (c.client_id, c.worker_id, c.supplier_id)
  ) or public.is_admin_or_cashier();
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text;
  safe_role public.app_role;
begin
  requested_role := coalesce(new.raw_user_meta_data->>'role', 'client');
  safe_role := case
    when requested_role in ('client', 'worker', 'supplier', 'admin', 'cashier')
      then requested_role::public.app_role
    else 'client'::public.app_role
  end;

  insert into public.profiles (id, email, full_name, phone, avatar_url, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'avatar_url',
    safe_role
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name),
    role = coalesce(public.profiles.role, excluded.role),
    updated_at = now();

  insert into public.wallets (user_id) values (new.id) on conflict (user_id) do nothing;

  if safe_role = 'worker' then
    insert into public.worker_profiles (user_id, is_active, active)
    values (new.id, false, false)
    on conflict (user_id) do nothing;
  elsif safe_role = 'supplier' then
    insert into public.supplier_profiles (user_id, is_active)
    values (new.id, false)
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.sync_review_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reviewee_id uuid;
begin
  v_reviewee_id := case when tg_op = 'DELETE' then old.reviewee_id else new.reviewee_id end;

  update public.worker_profiles wp
  set rating = coalesce(s.avg_rating, 0),
      rating_count = coalesce(s.count_rating, 0),
      updated_at = now()
  from (
    select reviewee_id, round(avg(rating)::numeric, 2) as avg_rating, count(*)::integer as count_rating
    from public.reviews
    where reviewee_id = v_reviewee_id
    group by reviewee_id
  ) s
  where wp.user_id = s.reviewee_id;

  if not found then
    update public.worker_profiles
    set rating = 0, rating_count = 0, updated_at = now()
    where user_id = v_reviewee_id;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_reviews_stats_insert on public.reviews;
create trigger trg_reviews_stats_insert after insert or update or delete on public.reviews
for each row execute function public.sync_review_stats();

drop view if exists public.v_job_unread cascade;
drop view if exists public.admin_workers_view cascade;
drop view if exists public.map_workers_view cascade;
drop view if exists public.worker_feed_view cascade;
drop view if exists public.worker_posts_public cascade;

create or replace view public.worker_posts_public as
select
  post.*,
  p.full_name,
  p.avatar_url,
  p.is_verified,
  wp.headline,
  wp.rating,
  wp.completed_jobs
from public.worker_posts post
join public.profiles p on p.id = post.worker_id
left join public.worker_profiles wp on wp.user_id = post.worker_id
where post.is_public = true;

create or replace view public.worker_feed_view as
select
  wp.user_id,
  p.full_name,
  p.email,
  p.phone,
  p.avatar_url,
  p.is_verified,
  wp.headline,
  wp.bio,
  wp.skills,
  wp.service_slugs,
  wp.city,
  coalesce(wl.lat, wp.lat, wp.last_lat) as lat,
  coalesce(wl.lng, wp.lng, wp.last_lon) as lng,
  wp.rating,
  wp.rating_count,
  wp.completed_jobs,
  wp.response_minutes,
  wp.is_available,
  wp.is_active,
  wp.active,
  wp.verification_status,
  wp.cover_url,
  latest_post.id as post_id,
  latest_post.caption,
  latest_post.media_url,
  latest_post.media_type,
  latest_post.created_at as post_created_at,
  coalesce(likes.total, 0) as likes_count,
  coalesce(comments.total, 0) as comments_count,
  wp.updated_at
from public.worker_profiles wp
join public.profiles p on p.id = wp.user_id
left join public.worker_locations wl on wl.worker_id = wp.user_id
left join lateral (
  select *
  from public.worker_posts post
  where post.worker_id = wp.user_id and post.is_public = true
  order by post.created_at desc
  limit 1
) latest_post on true
left join lateral (
  select count(*)::integer as total from public.worker_likes wl2 where wl2.worker_id = wp.user_id
) likes on true
left join lateral (
  select count(*)::integer as total from public.worker_comments wc where wc.worker_id = wp.user_id
) comments on true
where wp.is_active = true or wp.active = true;

create or replace view public.map_workers_view as
select
  user_id,
  full_name,
  avatar_url,
  headline,
  skills,
  city,
  lat,
  lng,
  rating,
  completed_jobs,
  response_minutes,
  is_available,
  media_url,
  media_type
from public.worker_feed_view
where lat is not null and lng is not null;

create or replace view public.admin_workers_view as
select
  wp.user_id,
  p.email,
  p.full_name,
  p.phone,
  p.avatar_url,
  p.city as profile_city,
  p.role,
  p.is_verified,
  wp.headline,
  wp.bio,
  wp.skills,
  wp.service_slugs,
  wp.city,
  wp.rating,
  wp.rating_count,
  wp.completed_jobs,
  wp.response_minutes,
  wp.verification_status,
  wp.is_active,
  wp.active,
  wp.is_available,
  wp.cover_url,
  coalesce(blocks.active_blocks, 0) as active_blocks,
  p.created_at,
  greatest(p.updated_at, wp.updated_at) as updated_at
from public.worker_profiles wp
join public.profiles p on p.id = wp.user_id
left join lateral (
  select count(*)::integer as active_blocks
  from public.worker_blocks wb
  where wb.worker_id = wp.user_id and wb.active = true
) blocks on true;

create or replace view public.v_job_unread as
select
  c.job_id,
  c.id as chat_id,
  count(m.id) filter (
    where m.sender_id <> auth.uid()
      and (
        (auth.uid() = c.client_id and (c.last_read_by_client is null or m.created_at > c.last_read_by_client))
        or (auth.uid() = c.worker_id and (c.last_read_by_worker is null or m.created_at > c.last_read_by_worker))
      )
  )::integer as unread,
  max(coalesce(m.body, m.text, m.content)) as last_message,
  max(m.created_at) as last_message_at
from public.chats c
left join public.messages m on m.chat_id = c.id
where auth.uid() in (c.client_id, c.worker_id, c.supplier_id)
group by c.job_id, c.id;

create or replace function public.ensure_worker_profile()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  insert into public.profiles (id, role)
  values (auth.uid(), 'worker')
  on conflict (id) do update set role = 'worker', updated_at = now();

  insert into public.worker_profiles (user_id)
  values (auth.uid())
  on conflict (user_id) do nothing;

  return auth.uid();
end;
$$;

create or replace function public.set_my_worker_skills(p_skill_slugs text[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.ensure_worker_profile();
  update public.worker_profiles
  set skills = coalesce(p_skill_slugs, '{}'),
      service_slugs = coalesce(p_skill_slugs, '{}'),
      updated_at = now()
  where user_id = auth.uid();
end;
$$;

create or replace function public.update_my_worker_profile(
  p_radius_km numeric default null,
  p_years_experience integer default null,
  p_active boolean default null,
  p_last_lat double precision default null,
  p_last_lon double precision default null,
  p_bio text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.ensure_worker_profile();
  update public.worker_profiles
  set radius_km = coalesce(p_radius_km, radius_km),
      years_experience = coalesce(p_years_experience, years_experience),
      active = coalesce(p_active, active),
      is_active = coalesce(p_active, is_active),
      is_available = coalesce(p_active, is_available),
      last_lat = coalesce(p_last_lat, last_lat),
      last_lon = coalesce(p_last_lon, last_lon),
      lat = coalesce(p_last_lat, lat),
      lng = coalesce(p_last_lon, lng),
      bio = coalesce(p_bio, bio),
      updated_at = now()
  where user_id = auth.uid();
end;
$$;

create or replace function public.onboard_worker(
  p_skill_slugs text[] default null,
  p_radius_km numeric default null,
  p_years_experience integer default null,
  p_active boolean default null,
  p_last_lat double precision default null,
  p_last_lon double precision default null,
  p_bio text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  worker_id uuid;
begin
  worker_id := public.ensure_worker_profile();
  perform public.set_my_worker_skills(p_skill_slugs);
  perform public.update_my_worker_profile(p_radius_km, p_years_experience, p_active, p_last_lat, p_last_lon, p_bio);
  update public.profiles set onboarding_completed = true, updated_at = now() where id = auth.uid();
  return worker_id;
end;
$$;

create or replace function public.set_my_worker_location(loc jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lat double precision;
  v_lng double precision;
begin
  v_lat := coalesce((loc->>'lat')::double precision, (loc->>'latitude')::double precision);
  v_lng := coalesce((loc->>'lng')::double precision, (loc->>'lon')::double precision, (loc->>'longitude')::double precision);
  insert into public.worker_locations(worker_id, lat, lng, accuracy_meters, updated_at)
  values (auth.uid(), v_lat, v_lng, nullif(loc->>'accuracy','')::numeric, now())
  on conflict (worker_id) do update set
    lat = excluded.lat,
    lng = excluded.lng,
    accuracy_meters = excluded.accuracy_meters,
    updated_at = now();

  update public.worker_profiles
  set lat = v_lat, lng = v_lng, last_lat = v_lat, last_lon = v_lng, updated_at = now()
  where user_id = auth.uid();
end;
$$;

create or replace function public.set_my_worker_location(lon double precision, lat double precision)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.ensure_worker_profile();

  insert into public.worker_locations(worker_id, lat, lng, updated_at)
  values (auth.uid(), set_my_worker_location.lat, set_my_worker_location.lon, now())
  on conflict (worker_id) do update set
    lat = excluded.lat,
    lng = excluded.lng,
    updated_at = now();

  update public.worker_profiles
  set lat = set_my_worker_location.lat,
      lng = set_my_worker_location.lon,
      last_lat = set_my_worker_location.lat,
      last_lon = set_my_worker_location.lon,
      updated_at = now()
  where user_id = auth.uid();
end;
$$;

create or replace function public.fn_find_nearby_jobs(p_lat double precision, p_lng double precision, p_radius_km numeric default 20)
returns setof public.jobs
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.jobs j
  where j.status = 'open'
    and j.lat is not null
    and j.lng is not null
    and (
      6371 * acos(
        least(1, greatest(-1,
          cos(radians(p_lat)) * cos(radians(j.lat)) * cos(radians(j.lng) - radians(p_lng)) +
          sin(radians(p_lat)) * sin(radians(j.lat))
        ))
      )
    ) <= p_radius_km
  order by j.created_at desc;
$$;

create or replace function public.fn_find_nearby_jobs(
  lon double precision,
  lat double precision,
  skill_slug text default null,
  max_km numeric default 20
)
returns setof public.jobs
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.jobs j
  where j.status = 'open'
    and (skill_slug is null or j.service_slug = skill_slug or j.service_type = skill_slug or j.skill_id = skill_slug)
    and j.lat is not null
    and j.lng is not null
    and (
      6371 * acos(
        least(1, greatest(-1,
          cos(radians(fn_find_nearby_jobs.lat)) * cos(radians(j.lat)) * cos(radians(j.lng) - radians(fn_find_nearby_jobs.lon)) +
          sin(radians(fn_find_nearby_jobs.lat)) * sin(radians(j.lat))
        ))
      )
    ) <= max_km
  order by j.created_at desc;
$$;

create or replace function public.fn_my_jobs()
returns setof public.jobs
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.jobs
  where client_id = auth.uid()
     or worker_id = auth.uid()
     or assigned_worker = auth.uid()
  order by created_at desc;
$$;

create or replace function public.post_chat_message(
  p_chat_id uuid,
  p_body text,
  p_media_url text default null,
  p_media_type text default 'text'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_media public.media_kind;
begin
  if not public.is_chat_participant(p_chat_id) then
    raise exception 'not_chat_participant';
  end if;

  v_media := case
    when p_media_type in ('text','image','video','audio','file') then p_media_type::public.media_kind
    else 'text'::public.media_kind
  end;

  insert into public.messages(chat_id, sender_id, body, text, content, media_url, media_type)
  values (p_chat_id, auth.uid(), p_body, p_body, p_body, p_media_url, v_media)
  returning id into v_id;

  update public.chats set updated_at = now() where id = p_chat_id;
  return v_id;
end;
$$;

create or replace function public.post_message(
  p_chat_id uuid,
  p_body text,
  p_media_url text default null,
  p_media_type text default 'text'
)
returns uuid
language sql
security definer
set search_path = public
as $$
  select public.post_chat_message(p_chat_id, p_body, p_media_url, p_media_type);
$$;

create or replace function public.request_friend(target_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if target_id = auth.uid() then raise exception 'cannot_friend_self'; end if;

  insert into public.user_friendships(requester_id, addressee_id, status)
  values (auth.uid(), target_id, 'pending')
  on conflict (requester_id, addressee_id) do update set updated_at = now()
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.admin_approve_worker(p_worker_id uuid, p_approve boolean, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin_or_cashier() then raise exception 'not_admin'; end if;

  update public.profiles
  set is_verified = p_approve, role = 'worker', updated_at = now()
  where id = p_worker_id;

  update public.worker_profiles
  set is_active = p_approve,
      active = p_approve,
      verification_status = case when p_approve then 'approved'::public.verification_status else 'rejected'::public.verification_status end,
      updated_at = now()
  where user_id = p_worker_id;

  insert into public.admin_worker_history(worker_id, admin_id, action, detail)
  values (p_worker_id, auth.uid(), case when p_approve then 'approve' else 'reject' end, p_note);
end;
$$;

create or replace function public.add_review_if_valid(
  p_job_id uuid,
  p_reviewee_id uuid,
  p_rating integer,
  p_body text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not exists (
    select 1 from public.jobs
    where id = p_job_id
      and auth.uid() in (client_id, worker_id, assigned_worker)
      and status in ('completed', 'done')
  ) then
    raise exception 'review_not_allowed';
  end if;

  insert into public.reviews(job_id, reviewer_id, reviewee_id, rating, body, comment)
  values (p_job_id, auth.uid(), p_reviewee_id, p_rating, p_body, p_body)
  on conflict (job_id, reviewer_id, reviewee_id) do update set
    rating = excluded.rating,
    body = excluded.body,
    comment = excluded.comment
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.add_review_if_valid(
  p_job_id uuid,
  p_worker_id uuid,
  p_client_id uuid,
  p_rating integer,
  p_comment text default null
)
returns uuid
language sql
security definer
set search_path = public
as $$
  select public.add_review_if_valid(p_job_id, p_worker_id, p_rating, p_comment);
$$;

create or replace function public.reassign_worker_if_needed(p_job_id uuid, p_worker_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.jobs
  set worker_id = p_worker_id,
      assigned_worker = p_worker_id,
      status = 'assigned',
      updated_at = now()
  where id = p_job_id
    and (client_id = auth.uid() or public.is_admin_or_cashier());
end;
$$;

create or replace function public.reassign_worker_if_needed(p_job_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_worker_id uuid;
begin
  select user_id into v_worker_id
  from public.worker_profiles
  where is_active = true or active = true
  order by rating desc nulls last, completed_jobs desc nulls last, updated_at desc
  limit 1;

  if v_worker_id is null then
    raise exception 'no_worker_available';
  end if;

  perform public.reassign_worker_if_needed(p_job_id, v_worker_id);
end;
$$;

create or replace function public.cancel_job(job_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.jobs
  set status = 'cancelled', cancelled_at = now(), updated_at = now()
  where id = cancel_job.job_id
    and (client_id = auth.uid() or worker_id = auth.uid() or assigned_worker = auth.uid() or public.is_admin_or_cashier());
end;
$$;

create or replace function public.accept_job(job_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.jobs
  set worker_id = auth.uid(), assigned_worker = auth.uid(), status = 'accepted', accepted_at = now(), updated_at = now()
  where id = accept_job.job_id and status in ('open', 'assigned');
end;
$$;

create or replace function public.complete_job(job_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.jobs
  set status = 'completed', completed_at = now(), updated_at = now()
  where id = complete_job.job_id and (worker_id = auth.uid() or assigned_worker = auth.uid() or client_id = auth.uid());
end;
$$;

create or replace function public.unread_total()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(unread), 0)::integer from public.v_job_unread;
$$;

create or replace function public.mark_job_read(p_job_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.chats
  set last_read_by_client = case when client_id = auth.uid() then now() else last_read_by_client end,
      last_read_by_worker = case when worker_id = auth.uid() then now() else last_read_by_worker end,
      updated_at = now()
  where job_id = p_job_id and auth.uid() in (client_id, worker_id, supplier_id);
end;
$$;

create or replace function public.pay_subscription(plan_slug text, idempotency_key text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_amount numeric(12,2);
  v_subscription uuid;
  v_tx uuid;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  v_amount := case plan_slug when 'worker_basic' then 49000 when 'worker_pro' then 99000 else 0 end;

  insert into public.subscriptions(user_id, plan_slug, status, ends_at)
  values (auth.uid(), plan_slug, 'active', now() + interval '30 days')
  returning id into v_subscription;

  insert into public.transactions(user_id, subscription_id, amount, idempotency_key)
  values (auth.uid(), v_subscription, v_amount, idempotency_key)
  on conflict (idempotency_key) do update set idempotency_key = excluded.idempotency_key
  returning id into v_tx;

  return v_tx;
end;
$$;

alter table public.profiles enable row level security;
alter table public.service_categories enable row level security;
alter table public.worker_profiles enable row level security;
alter table public.supplier_profiles enable row level security;
alter table public.jobs enable row level security;
alter table public.business_jobs enable row level security;
alter table public.job_photos enable row level security;
alter table public.chats enable row level security;
alter table public.messages enable row level security;
alter table public.dm_messages enable row level security;
alter table public.worker_posts enable row level security;
alter table public.worker_likes enable row level security;
alter table public.worker_comments enable row level security;
alter table public.user_friendships enable row level security;
alter table public.reviews enable row level security;
alter table public.documents enable row level security;
alter table public.bank_accounts enable row level security;
alter table public.worker_locations enable row level security;
alter table public.supplier_profiles enable row level security;
alter table public.supplier_products enable row level security;
alter table public.supplier_contacts enable row level security;
alter table public.notifications enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.user_events enable row level security;
alter table public.page_views enable row level security;
alter table public.worker_leads enable row level security;
alter table public.wallets enable row level security;
alter table public.subscriptions enable row level security;
alter table public.transactions enable row level security;
alter table public.admin_worker_notes enable row level security;
alter table public.admin_worker_history enable row level security;
alter table public.worker_blocks enable row level security;
alter table public.admin_expenses enable row level security;
alter table public.admin_invoices enable row level security;
alter table public.incidents enable row level security;

drop policy if exists "service_categories_read" on public.service_categories;
create policy "service_categories_read" on public.service_categories for select using (is_active = true or public.is_admin_or_cashier());

drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles for select using (
  id = auth.uid() or role in ('worker', 'supplier') or public.is_admin_or_cashier()
);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert with check (id = auth.uid() or public.is_admin_or_cashier());
drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin" on public.profiles for update using (id = auth.uid() or public.is_admin_or_cashier()) with check (id = auth.uid() or public.is_admin_or_cashier());

drop policy if exists "worker_profiles_select" on public.worker_profiles;
create policy "worker_profiles_select" on public.worker_profiles for select using (is_active = true or active = true or user_id = auth.uid() or public.is_admin_or_cashier());
drop policy if exists "worker_profiles_write" on public.worker_profiles;
create policy "worker_profiles_write" on public.worker_profiles for all using (user_id = auth.uid() or public.is_admin_or_cashier()) with check (user_id = auth.uid() or public.is_admin_or_cashier());

drop policy if exists "supplier_profiles_select" on public.supplier_profiles;
create policy "supplier_profiles_select" on public.supplier_profiles for select using (is_active = true or user_id = auth.uid() or public.is_admin_or_cashier());
drop policy if exists "supplier_profiles_write" on public.supplier_profiles;
create policy "supplier_profiles_write" on public.supplier_profiles for all using (user_id = auth.uid() or public.is_admin_or_cashier()) with check (user_id = auth.uid() or public.is_admin_or_cashier());

drop policy if exists "jobs_select" on public.jobs;
create policy "jobs_select" on public.jobs for select using (
  status = 'open' or client_id = auth.uid() or worker_id = auth.uid() or assigned_worker = auth.uid() or public.is_admin_or_cashier()
);
drop policy if exists "jobs_insert_client" on public.jobs;
create policy "jobs_insert_client" on public.jobs for insert with check (client_id = auth.uid() or public.is_admin_or_cashier());
drop policy if exists "jobs_update_participants" on public.jobs;
create policy "jobs_update_participants" on public.jobs for update using (
  client_id = auth.uid() or worker_id = auth.uid() or assigned_worker = auth.uid() or public.is_admin_or_cashier()
) with check (
  client_id = auth.uid() or worker_id = auth.uid() or assigned_worker = auth.uid() or public.is_admin_or_cashier()
);

drop policy if exists "business_jobs_owner_admin" on public.business_jobs;
create policy "business_jobs_owner_admin" on public.business_jobs for all using (client_id = auth.uid() or public.is_admin_or_cashier()) with check (client_id = auth.uid() or public.is_admin_or_cashier());

drop policy if exists "job_photos_participants" on public.job_photos;
create policy "job_photos_participants" on public.job_photos for all using (
  public.is_admin_or_cashier() or exists (
    select 1 from public.jobs j where j.id = job_id and auth.uid() in (j.client_id, j.worker_id, j.assigned_worker)
  )
) with check (
  public.is_admin_or_cashier() or exists (
    select 1 from public.jobs j where j.id = job_id and auth.uid() in (j.client_id, j.worker_id, j.assigned_worker)
  )
);

drop policy if exists "chats_participants" on public.chats;
create policy "chats_participants" on public.chats for all using (
  auth.uid() in (client_id, worker_id, supplier_id) or public.is_admin_or_cashier()
) with check (
  auth.uid() in (client_id, worker_id, supplier_id) or public.is_admin_or_cashier()
);

drop policy if exists "messages_participants_select" on public.messages;
create policy "messages_participants_select" on public.messages for select using (public.is_chat_participant(chat_id));
drop policy if exists "messages_participants_insert" on public.messages;
create policy "messages_participants_insert" on public.messages for insert with check (sender_id = auth.uid() and public.is_chat_participant(chat_id));
drop policy if exists "messages_sender_update" on public.messages;
create policy "messages_sender_update" on public.messages for update using (sender_id = auth.uid() or public.is_admin_or_cashier()) with check (sender_id = auth.uid() or public.is_admin_or_cashier());

drop policy if exists "dm_messages_pair" on public.dm_messages;
create policy "dm_messages_pair" on public.dm_messages for all using (auth.uid() in (sender_id, receiver_id) or public.is_admin_or_cashier()) with check (sender_id = auth.uid() or public.is_admin_or_cashier());

drop policy if exists "worker_posts_public_read" on public.worker_posts;
create policy "worker_posts_public_read" on public.worker_posts for select using (is_public = true or worker_id = auth.uid() or public.is_admin_or_cashier());
drop policy if exists "worker_posts_owner_write" on public.worker_posts;
create policy "worker_posts_owner_write" on public.worker_posts for all using (worker_id = auth.uid() or public.is_admin_or_cashier()) with check (worker_id = auth.uid() or public.is_admin_or_cashier());

drop policy if exists "worker_likes_auth" on public.worker_likes;
create policy "worker_likes_auth" on public.worker_likes for all using (client_id = auth.uid() or worker_id = auth.uid() or public.is_admin_or_cashier()) with check (client_id = auth.uid() or public.is_admin_or_cashier());

drop policy if exists "worker_comments_read" on public.worker_comments;
create policy "worker_comments_read" on public.worker_comments for select using (true);
drop policy if exists "worker_comments_write" on public.worker_comments;
create policy "worker_comments_write" on public.worker_comments for all using (author_id = auth.uid() or public.is_admin_or_cashier()) with check (author_id = auth.uid() or public.is_admin_or_cashier());

drop policy if exists "friendships_related" on public.user_friendships;
create policy "friendships_related" on public.user_friendships for all using (auth.uid() in (requester_id, addressee_id) or public.is_admin_or_cashier()) with check (auth.uid() in (requester_id, addressee_id) or public.is_admin_or_cashier());

drop policy if exists "reviews_read" on public.reviews;
create policy "reviews_read" on public.reviews for select using (true);
drop policy if exists "reviews_insert_auth" on public.reviews;
create policy "reviews_insert_auth" on public.reviews for insert with check (reviewer_id = auth.uid() or public.is_admin_or_cashier());

drop policy if exists "documents_owner_admin" on public.documents;
create policy "documents_owner_admin" on public.documents for all using (user_id = auth.uid() or public.is_admin_or_cashier()) with check (user_id = auth.uid() or public.is_admin_or_cashier());

drop policy if exists "bank_accounts_owner_admin" on public.bank_accounts;
create policy "bank_accounts_owner_admin" on public.bank_accounts for all using (user_id = auth.uid() or public.is_admin_or_cashier()) with check (user_id = auth.uid() or public.is_admin_or_cashier());

drop policy if exists "worker_locations_read" on public.worker_locations;
create policy "worker_locations_read" on public.worker_locations for select using (true);
drop policy if exists "worker_locations_owner_write" on public.worker_locations;
create policy "worker_locations_owner_write" on public.worker_locations for all using (worker_id = auth.uid() or public.is_admin_or_cashier()) with check (worker_id = auth.uid() or public.is_admin_or_cashier());

drop policy if exists "supplier_products_read" on public.supplier_products;
create policy "supplier_products_read" on public.supplier_products for select using (is_active = true or supplier_id = auth.uid() or public.is_admin_or_cashier());
drop policy if exists "supplier_products_write" on public.supplier_products;
create policy "supplier_products_write" on public.supplier_products for all using (supplier_id = auth.uid() or public.is_admin_or_cashier()) with check (supplier_id = auth.uid() or public.is_admin_or_cashier());

drop policy if exists "supplier_contacts_related" on public.supplier_contacts;
create policy "supplier_contacts_related" on public.supplier_contacts for all using (supplier_id = auth.uid() or user_id = auth.uid() or public.is_admin_or_cashier()) with check (user_id = auth.uid() or public.is_admin_or_cashier());

drop policy if exists "notifications_owner" on public.notifications;
create policy "notifications_owner" on public.notifications for all using (user_id = auth.uid() or public.is_admin_or_cashier()) with check (user_id = auth.uid() or public.is_admin_or_cashier());

drop policy if exists "push_subscriptions_owner" on public.push_subscriptions;
create policy "push_subscriptions_owner" on public.push_subscriptions for all using (user_id = auth.uid() or public.is_admin_or_cashier()) with check (user_id = auth.uid() or public.is_admin_or_cashier());

drop policy if exists "user_events_insert_auth" on public.user_events;
create policy "user_events_insert_auth" on public.user_events for insert with check (user_id = auth.uid() or user_id is null);
drop policy if exists "user_events_admin_read" on public.user_events;
create policy "user_events_admin_read" on public.user_events for select using (public.is_admin_or_cashier());

drop policy if exists "page_views_insert_any" on public.page_views;
create policy "page_views_insert_any" on public.page_views for insert with check (true);
drop policy if exists "page_views_admin_read" on public.page_views;
create policy "page_views_admin_read" on public.page_views for select using (public.is_admin_or_cashier());

drop policy if exists "worker_leads_insert_any" on public.worker_leads;
create policy "worker_leads_insert_any" on public.worker_leads for insert with check (true);
drop policy if exists "worker_leads_admin_read" on public.worker_leads;
create policy "worker_leads_admin_read" on public.worker_leads for select using (public.is_admin_or_cashier());
drop policy if exists "worker_leads_admin_update" on public.worker_leads;
create policy "worker_leads_admin_update" on public.worker_leads for update using (public.is_admin_or_cashier()) with check (public.is_admin_or_cashier());

drop policy if exists "wallets_owner" on public.wallets;
create policy "wallets_owner" on public.wallets for all using (user_id = auth.uid() or public.is_admin_or_cashier()) with check (user_id = auth.uid() or public.is_admin_or_cashier());
drop policy if exists "subscriptions_owner" on public.subscriptions;
create policy "subscriptions_owner" on public.subscriptions for all using (user_id = auth.uid() or public.is_admin_or_cashier()) with check (user_id = auth.uid() or public.is_admin_or_cashier());
drop policy if exists "transactions_owner" on public.transactions;
create policy "transactions_owner" on public.transactions for all using (user_id = auth.uid() or public.is_admin_or_cashier()) with check (user_id = auth.uid() or public.is_admin_or_cashier());

drop policy if exists "admin_worker_notes_admin" on public.admin_worker_notes;
create policy "admin_worker_notes_admin" on public.admin_worker_notes for all using (public.is_admin_or_cashier()) with check (public.is_admin_or_cashier());
drop policy if exists "admin_worker_history_admin" on public.admin_worker_history;
create policy "admin_worker_history_admin" on public.admin_worker_history for all using (public.is_admin_or_cashier()) with check (public.is_admin_or_cashier());
drop policy if exists "worker_blocks_admin" on public.worker_blocks;
create policy "worker_blocks_admin" on public.worker_blocks for all using (public.is_admin_or_cashier()) with check (public.is_admin_or_cashier());
drop policy if exists "admin_expenses_admin" on public.admin_expenses;
create policy "admin_expenses_admin" on public.admin_expenses for all using (public.is_admin_or_cashier()) with check (public.is_admin_or_cashier());
drop policy if exists "admin_invoices_admin" on public.admin_invoices;
create policy "admin_invoices_admin" on public.admin_invoices for all using (public.is_admin_or_cashier()) with check (public.is_admin_or_cashier());

drop policy if exists "incidents_related" on public.incidents;
create policy "incidents_related" on public.incidents for all using (
  reporter_id = auth.uid() or public.is_admin_or_cashier() or exists (
    select 1 from public.jobs j where j.id = job_id and auth.uid() in (j.client_id, j.worker_id, j.assigned_worker)
  )
) with check (
  reporter_id = auth.uid() or public.is_admin_or_cashier() or exists (
    select 1 from public.jobs j where j.id = job_id and auth.uid() in (j.client_id, j.worker_id, j.assigned_worker)
  )
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 5242880, array['image/png','image/jpeg','image/webp']),
  ('worker-media', 'worker-media', true, 104857600, array['image/png','image/jpeg','image/webp','video/mp4','video/webm']),
  ('supplier-media', 'supplier-media', true, 52428800, array['image/png','image/jpeg','image/webp','video/mp4','video/webm']),
  ('job-photos', 'job-photos', true, 20971520, array['image/png','image/jpeg','image/webp']),
  ('worker-docs', 'worker-docs', false, 20971520, array['image/png','image/jpeg','image/webp','application/pdf']),
  ('chat-media', 'chat-media', false, 52428800, array['image/png','image/jpeg','image/webp','video/mp4','video/webm','application/pdf']),
  ('chat-audio', 'chat-audio', false, 20971520, array['audio/mpeg','audio/mp4','audio/webm','audio/wav','audio/ogg'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public_assets_read" on storage.objects;
create policy "public_assets_read" on storage.objects for select using (
  bucket_id in ('avatars', 'worker-media', 'supplier-media', 'job-photos')
);

drop policy if exists "avatars_owner_write" on storage.objects;
create policy "avatars_owner_write" on storage.objects for all using (
  bucket_id = 'avatars' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin_or_cashier())
) with check (
  bucket_id = 'avatars' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin_or_cashier())
);

drop policy if exists "worker_media_owner_write" on storage.objects;
create policy "worker_media_owner_write" on storage.objects for all using (
  bucket_id = 'worker-media' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin_or_cashier())
) with check (
  bucket_id = 'worker-media' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin_or_cashier())
);

drop policy if exists "supplier_media_owner_write" on storage.objects;
create policy "supplier_media_owner_write" on storage.objects for all using (
  bucket_id = 'supplier-media' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin_or_cashier())
) with check (
  bucket_id = 'supplier-media' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin_or_cashier())
);

drop policy if exists "job_photos_auth_write" on storage.objects;
create policy "job_photos_auth_write" on storage.objects for all using (
  bucket_id = 'job-photos' and auth.role() = 'authenticated'
) with check (
  bucket_id = 'job-photos' and auth.role() = 'authenticated'
);

drop policy if exists "worker_docs_private" on storage.objects;
create policy "worker_docs_private" on storage.objects for all using (
  bucket_id = 'worker-docs' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin_or_cashier())
) with check (
  bucket_id = 'worker-docs' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin_or_cashier())
);

drop policy if exists "chat_media_private" on storage.objects;
create policy "chat_media_private" on storage.objects for all using (
  bucket_id in ('chat-media', 'chat-audio') and auth.role() = 'authenticated'
) with check (
  bucket_id in ('chat-media', 'chat-audio') and auth.role() = 'authenticated'
);

grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon;
grant insert on public.page_views, public.worker_leads to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on all functions in schema public to authenticated;
