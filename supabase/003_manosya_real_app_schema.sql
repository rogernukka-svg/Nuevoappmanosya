-- ManosYA Real App Schema
-- Copiar y ejecutar completo en Supabase SQL Editor.
-- No borra auth.users. Prepara Auth, perfiles, feed, mapa, chat, documentos,
-- videos/fotos, proveedores, admin, RLS, Storage y Realtime.

create extension if not exists "pgcrypto";

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

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

do $$ begin
  alter type public.app_role add value if not exists 'client';
  alter type public.app_role add value if not exists 'worker';
  alter type public.app_role add value if not exists 'supplier';
  alter type public.app_role add value if not exists 'admin';
  alter type public.app_role add value if not exists 'cashier';
exception when others then null;
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
  verified boolean not null default false,
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
  bio text,
  city text,
  address text,
  lat double precision,
  lng double precision,
  phone text,
  logo_url text,
  cover_url text,
  is_active boolean not null default false,
  rating numeric(3,2) not null default 0,
  rating_count integer not null default 0,
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

create table if not exists public.job_photos (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  path text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.chats (
  id uuid primary key default gen_random_uuid(),
  chat_type text not null default 'direct',
  participant_a_id uuid references public.profiles(id) on delete cascade,
  participant_b_id uuid references public.profiles(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete cascade,
  client_id uuid references public.profiles(id) on delete cascade,
  worker_id uuid references public.profiles(id) on delete cascade,
  supplier_id uuid references public.profiles(id) on delete cascade,
  title text,
  last_message_at timestamptz,
  last_read_by_client timestamptz,
  last_read_by_worker timestamptz,
  last_read_by_supplier timestamptz,
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
  location_lat double precision,
  location_lng double precision,
  live_until timestamptz,
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
  status text not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.worker_likes (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.profiles(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid references public.worker_posts(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.worker_comments (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid references public.worker_posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.saved_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  worker_id uuid references public.profiles(id) on delete cascade,
  post_id uuid references public.worker_posts(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.video_shares (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  worker_id uuid references public.profiles(id) on delete cascade,
  post_id uuid references public.worker_posts(id) on delete cascade,
  channel text,
  created_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.jobs(id) on delete set null,
  worker_id uuid not null references public.profiles(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  doc_type text not null,
  front_url text,
  back_url text,
  file_url text,
  status public.verification_status not null default 'pending',
  rejection_reason text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.worker_locations (
  worker_id uuid primary key references public.profiles(id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  accuracy_meters numeric(8,2),
  is_live boolean not null default false,
  live_until timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.live_locations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  chat_id uuid references public.chats(id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  accuracy_meters numeric(8,2),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
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
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text,
  href text,
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

create table if not exists public.page_views (
  id uuid primary key default gen_random_uuid(),
  path text not null,
  referrer text,
  user_agent text,
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
  worker_id uuid not null references public.profiles(id) on delete cascade,
  admin_id uuid references public.profiles(id) on delete set null,
  action text not null,
  metadata jsonb not null default '{}',
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

-- Compatibilidad si ya ejecutaste SQL anterior incompleto.
alter table public.profiles add column if not exists verified boolean not null default false;
alter table public.profiles add column if not exists bio text;
alter table public.worker_profiles add column if not exists service_slugs text[] not null default '{}';
alter table public.worker_profiles add column if not exists is_available boolean not null default false;
alter table public.worker_profiles add column if not exists cover_url text;
alter table public.worker_profiles add column if not exists intro_video_url text;
alter table public.worker_profiles add column if not exists lat double precision;
alter table public.worker_profiles add column if not exists lng double precision;
alter table public.supplier_profiles add column if not exists bio text;
alter table public.supplier_profiles add column if not exists address text;
alter table public.supplier_profiles add column if not exists lat double precision;
alter table public.supplier_profiles add column if not exists lng double precision;
alter table public.supplier_profiles add column if not exists cover_url text;
alter table public.worker_posts add column if not exists status text not null default 'published';
alter table public.worker_posts add column if not exists updated_at timestamptz not null default now();
alter table public.worker_likes add column if not exists post_id uuid references public.worker_posts(id) on delete cascade;
alter table public.chats add column if not exists chat_type text not null default 'direct';
alter table public.chats add column if not exists participant_a_id uuid references public.profiles(id) on delete cascade;
alter table public.chats add column if not exists participant_b_id uuid references public.profiles(id) on delete cascade;
alter table public.chats add column if not exists supplier_id uuid references public.profiles(id) on delete cascade;
alter table public.chats add column if not exists last_message_at timestamptz;
alter table public.chats add column if not exists last_read_by_supplier timestamptz;
alter table public.messages add column if not exists text text;
alter table public.messages add column if not exists content text;
alter table public.messages add column if not exists media_url text;
alter table public.messages add column if not exists media_type public.media_kind not null default 'text';
alter table public.messages add column if not exists location_lat double precision;
alter table public.messages add column if not exists location_lng double precision;
alter table public.messages add column if not exists live_until timestamptz;

create unique index if not exists worker_likes_worker_client_idx on public.worker_likes(worker_id, client_id);
create unique index if not exists saved_posts_user_post_idx on public.saved_posts(user_id, post_id) where post_id is not null;
create unique index if not exists chats_direct_pair_idx on public.chats(participant_a_id, participant_b_id) where chat_type = 'direct' and participant_a_id is not null and participant_b_id is not null;
create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists worker_profiles_skills_idx on public.worker_profiles using gin(skills);
create index if not exists worker_profiles_service_slugs_idx on public.worker_profiles using gin(service_slugs);
create index if not exists worker_posts_worker_created_idx on public.worker_posts(worker_id, created_at desc);
create index if not exists worker_comments_post_created_idx on public.worker_comments(post_id, created_at desc);
create index if not exists messages_chat_created_idx on public.messages(chat_id, created_at);
create index if not exists jobs_client_created_idx on public.jobs(client_id, created_at desc);
create index if not exists jobs_worker_created_idx on public.jobs(worker_id, created_at desc);
create index if not exists supplier_products_supplier_created_idx on public.supplier_products(supplier_id, created_at desc);

insert into public.service_categories (slug, label, sort_order)
values
  ('plomeria', 'Plomeria', 10),
  ('electricidad', 'Electricidad', 20),
  ('limpieza', 'Limpieza', 30),
  ('flete', 'Fletes y mudanzas', 40),
  ('pintura', 'Pintura', 50),
  ('jardineria', 'Jardineria', 60),
  ('albanileria', 'Albanileria', 70),
  ('carpinteria', 'Carpinteria', 80),
  ('cerrajeria', 'Cerrajeria', 90),
  ('aire-acondicionado', 'Aire acondicionado', 100),
  ('insumos', 'Insumos', 200)
on conflict (slug) do update set
  label = excluded.label,
  sort_order = excluded.sort_order,
  is_active = true;

create or replace function private.is_admin_or_cashier()
returns boolean
language sql
security definer
set search_path = public, private
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('admin', 'cashier')
  );
$$;
revoke all on function private.is_admin_or_cashier() from public;
grant execute on function private.is_admin_or_cashier() to anon, authenticated;

create or replace function private.is_privileged_context()
returns boolean
language sql
stable
as $$
  select current_user in ('postgres', 'supabase_admin', 'service_role');
$$;
revoke all on function private.is_privileged_context() from public;

create or replace function private.protect_profile_trust_fields()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if private.is_privileged_context() or private.is_admin_or_cashier() then
    return new;
  end if;

  new.admin_role := old.admin_role;
  new.is_verified := old.is_verified;
  new.verified := old.verified;
  return new;
end;
$$;
revoke all on function private.protect_profile_trust_fields() from public;

create or replace function private.protect_worker_trust_fields()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if private.is_privileged_context() or private.is_admin_or_cashier() then
    return new;
  end if;

  new.rating := old.rating;
  new.rating_count := old.rating_count;
  new.completed_jobs := old.completed_jobs;
  new.verification_status := old.verification_status;
  return new;
end;
$$;
revoke all on function private.protect_worker_trust_fields() from public;

create or replace function private.protect_supplier_trust_fields()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if private.is_privileged_context() or private.is_admin_or_cashier() then
    return new;
  end if;

  new.rating := old.rating;
  new.rating_count := old.rating_count;
  return new;
end;
$$;
revoke all on function private.protect_supplier_trust_fields() from public;

create or replace function private.protect_document_review_fields()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if private.is_privileged_context() or private.is_admin_or_cashier() then
    if new.status <> old.status and new.status in ('approved', 'rejected') then
      new.reviewed_at := now();
      new.reviewed_by := coalesce((select auth.uid()), new.reviewed_by);
    end if;
    return new;
  end if;

  new.status := 'pending';
  new.rejection_reason := null;
  new.reviewed_by := null;
  new.reviewed_at := null;
  return new;
end;
$$;
revoke all on function private.protect_document_review_fields() from public;

create or replace function private.is_chat_participant(target_chat_id uuid)
returns boolean
language sql
security definer
set search_path = public, private
stable
as $$
  select exists (
    select 1
    from public.chats c
    where c.id = target_chat_id
      and (select auth.uid()) in (
        c.client_id,
        c.worker_id,
        c.supplier_id,
        c.participant_a_id,
        c.participant_b_id
      )
  ) or private.is_admin_or_cashier();
$$;
revoke all on function private.is_chat_participant(uuid) from public;
grant execute on function private.is_chat_participant(uuid) to authenticated;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  selected_role text;
  safe_role public.app_role;
begin
  selected_role := coalesce(new.raw_app_meta_data ->> 'role', new.raw_user_meta_data ->> 'role', 'client');
  if selected_role not in ('client', 'worker', 'supplier') then
    selected_role := 'client';
  end if;
  safe_role := selected_role::public.app_role;

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1), 'ManosYA'),
    safe_role
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    updated_at = now();

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
revoke all on function private.handle_new_user() from public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

insert into public.profiles (id, email, full_name, role)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data ->> 'full_name', split_part(u.email, '@', 1), 'ManosYA'),
  case
    when coalesce(u.raw_app_meta_data ->> 'role', u.raw_user_meta_data ->> 'role') in ('worker', 'supplier', 'client')
      then coalesce(u.raw_app_meta_data ->> 'role', u.raw_user_meta_data ->> 'role')::public.app_role
    else 'client'::public.app_role
  end
from auth.users u
on conflict (id) do nothing;

create or replace function private.ensure_role_profile()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if new.role = 'worker' then
    insert into public.worker_profiles (user_id)
    values (new.id)
    on conflict (user_id) do nothing;
  elsif new.role = 'supplier' then
    insert into public.supplier_profiles (user_id)
    values (new.id)
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;
revoke all on function private.ensure_role_profile() from public;

drop trigger if exists ensure_role_profile_trigger on public.profiles;
create trigger ensure_role_profile_trigger
after insert or update of role on public.profiles
for each row execute function private.ensure_role_profile();

create or replace function private.sync_worker_verification()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  target_user uuid;
  approved_count integer;
begin
  target_user := coalesce(new.user_id, old.user_id);
  select count(*)::integer
  into approved_count
  from public.documents d
  where d.user_id = target_user
    and d.doc_type in ('identity_front', 'identity_back', 'selfie_document')
    and d.status = 'approved';

  if approved_count = 3 then
    update public.worker_profiles
    set verification_status = 'approved', updated_at = now()
    where user_id = target_user;

    update public.profiles
    set is_verified = true, verified = true, updated_at = now()
    where id = target_user;
  else
    update public.worker_profiles
    set verification_status = 'pending', updated_at = now()
    where user_id = target_user and verification_status <> 'rejected';
  end if;

  return coalesce(new, old);
end;
$$;
revoke all on function private.sync_worker_verification() from public;

drop trigger if exists sync_worker_verification_trigger on public.documents;
create trigger sync_worker_verification_trigger
after insert or update of status on public.documents
for each row execute function private.sync_worker_verification();

create or replace function private.touch_chat_after_message()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  update public.chats
  set last_message_at = new.created_at, updated_at = now()
  where id = new.chat_id;
  return new;
end;
$$;
revoke all on function private.touch_chat_after_message() from public;

drop trigger if exists touch_chat_after_message_trigger on public.messages;
create trigger touch_chat_after_message_trigger
after insert on public.messages
for each row execute function private.touch_chat_after_message();

create or replace function public.get_or_create_direct_chat(target_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, private
as $$
declare
  me uuid := (select auth.uid());
  a uuid;
  b uuid;
  chat_id uuid;
  my_role public.app_role;
  target_role public.app_role;
begin
  if me is null then
    raise exception 'Inicia sesion para abrir el chat.';
  end if;
  if target_user_id is null or target_user_id = me then
    raise exception 'Contacto no valido.';
  end if;

  select role into my_role from public.profiles where id = me;
  select role into target_role from public.profiles where id = target_user_id;
  if target_role is null then
    raise exception 'Ese usuario no existe.';
  end if;

  a := least(me, target_user_id);
  b := greatest(me, target_user_id);

  select c.id into chat_id
  from public.chats c
  where c.chat_type = 'direct'
    and c.participant_a_id = a
    and c.participant_b_id = b
  limit 1;

  if chat_id is not null then
    return chat_id;
  end if;

  insert into public.chats (
    chat_type,
    participant_a_id,
    participant_b_id,
    client_id,
    worker_id,
    supplier_id,
    title
  )
  values (
    'direct',
    a,
    b,
    case when my_role = 'client' then me when target_role = 'client' then target_user_id else null end,
    case when my_role = 'worker' then me when target_role = 'worker' then target_user_id else null end,
    case when my_role = 'supplier' then me when target_role = 'supplier' then target_user_id else null end,
    'Mensaje directo'
  )
  returning id into chat_id;

  return chat_id;
end;
$$;
revoke all on function public.get_or_create_direct_chat(uuid) from public, anon;
grant execute on function public.get_or_create_direct_chat(uuid) to authenticated;

create or replace function public.mark_chat_read(target_chat_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  me uuid := (select auth.uid());
begin
  if me is null then return; end if;
  update public.chats
  set
    last_read_by_client = case when client_id = me then now() else last_read_by_client end,
    last_read_by_worker = case when worker_id = me then now() else last_read_by_worker end,
    last_read_by_supplier = case when supplier_id = me then now() else last_read_by_supplier end,
    updated_at = now()
  where id = target_chat_id
    and private.is_chat_participant(target_chat_id);
end;
$$;
grant execute on function public.mark_chat_read(uuid) to authenticated;

drop trigger if exists protect_profile_trust_fields_trigger on public.profiles;
create trigger protect_profile_trust_fields_trigger
before update on public.profiles
for each row execute function private.protect_profile_trust_fields();

drop trigger if exists protect_worker_trust_fields_trigger on public.worker_profiles;
create trigger protect_worker_trust_fields_trigger
before update on public.worker_profiles
for each row execute function private.protect_worker_trust_fields();

drop trigger if exists protect_supplier_trust_fields_trigger on public.supplier_profiles;
create trigger protect_supplier_trust_fields_trigger
before update on public.supplier_profiles
for each row execute function private.protect_supplier_trust_fields();

drop trigger if exists protect_document_review_fields_trigger on public.documents;
create trigger protect_document_review_fields_trigger
before update on public.documents
for each row execute function private.protect_document_review_fields();

drop trigger if exists set_updated_at_profiles on public.profiles;
create trigger set_updated_at_profiles before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at_worker_profiles on public.worker_profiles;
create trigger set_updated_at_worker_profiles before update on public.worker_profiles for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at_supplier_profiles on public.supplier_profiles;
create trigger set_updated_at_supplier_profiles before update on public.supplier_profiles for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at_jobs on public.jobs;
create trigger set_updated_at_jobs before update on public.jobs for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at_chats on public.chats;
create trigger set_updated_at_chats before update on public.chats for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at_worker_posts on public.worker_posts;
create trigger set_updated_at_worker_posts before update on public.worker_posts for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at_documents on public.documents;
create trigger set_updated_at_documents before update on public.documents for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at_supplier_products on public.supplier_products;
create trigger set_updated_at_supplier_products before update on public.supplier_products for each row execute function public.set_updated_at();

drop view if exists public.admin_workers_view cascade;
drop view if exists public.map_suppliers_view cascade;
drop view if exists public.map_workers_view cascade;
drop view if exists public.worker_feed_view cascade;
drop view if exists public.worker_posts_public cascade;

create view public.worker_posts_public
with (security_invoker = true)
as
select
  post.*,
  p.full_name,
  p.avatar_url,
  coalesce(p.is_verified, p.verified) as is_verified,
  wp.headline,
  wp.rating,
  wp.completed_jobs
from public.worker_posts post
join public.profiles p on p.id = post.worker_id
left join public.worker_profiles wp on wp.user_id = post.worker_id
where post.is_public = true and post.status = 'published';

create view public.worker_feed_view
with (security_invoker = true)
as
select
  wp.user_id,
  p.full_name,
  p.email,
  p.phone,
  p.avatar_url,
  coalesce(p.is_verified, p.verified) as is_verified,
  wp.headline,
  wp.bio,
  coalesce(nullif(wp.skills, '{}'), wp.service_slugs, '{}') as skills,
  wp.service_slugs,
  coalesce(wp.city, p.city) as city,
  coalesce(wl.lat, wp.lat, wp.last_lat, p.lat) as lat,
  coalesce(wl.lng, wp.lng, wp.last_lon, p.lng) as lng,
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
  greatest(wp.updated_at, p.updated_at) as updated_at
from public.worker_profiles wp
join public.profiles p on p.id = wp.user_id
left join public.worker_locations wl on wl.worker_id = wp.user_id
left join lateral (
  select post.*
  from public.worker_posts post
  where post.worker_id = wp.user_id
    and post.is_public = true
    and post.status = 'published'
  order by post.created_at desc
  limit 1
) latest_post on true
left join lateral (
  select count(*)::integer as total
  from public.worker_likes wl2
  where wl2.worker_id = wp.user_id
) likes on true
left join lateral (
  select count(*)::integer as total
  from public.worker_comments wc
  where wc.worker_id = wp.user_id
) comments on true
where p.role = 'worker'
  and (wp.is_active = true or wp.active = true or latest_post.id is not null);

create view public.map_workers_view
with (security_invoker = true)
as
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

create view public.map_suppliers_view
with (security_invoker = true)
as
select
  sp.user_id,
  coalesce(sp.business_name, p.full_name, 'Proveedor ManosYA') as business_name,
  sp.category,
  coalesce(sp.city, p.city) as city,
  coalesce(sp.address, p.address) as address,
  coalesce(sp.lat, p.lat) as lat,
  coalesce(sp.lng, p.lng) as lng,
  coalesce(sp.logo_url, p.avatar_url) as logo_url,
  product.title as product_title,
  product.description as product_description,
  product.media_url,
  product.price
from public.supplier_profiles sp
join public.profiles p on p.id = sp.user_id
left join lateral (
  select prod.*
  from public.supplier_products prod
  where prod.supplier_id = sp.user_id
    and prod.is_active = true
    and prod.service_slug is distinct from '__cover__'
  order by prod.created_at desc
  limit 1
) product on true
where p.role = 'supplier'
  and sp.is_active = true;

create view public.admin_workers_view
with (security_invoker = true)
as
select
  wp.user_id,
  p.email,
  p.full_name,
  p.phone,
  p.avatar_url,
  p.city as profile_city,
  p.role,
  coalesce(p.is_verified, p.verified) as is_verified,
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

alter table public.profiles enable row level security;
alter table public.service_categories enable row level security;
alter table public.worker_profiles enable row level security;
alter table public.supplier_profiles enable row level security;
alter table public.jobs enable row level security;
alter table public.job_photos enable row level security;
alter table public.chats enable row level security;
alter table public.messages enable row level security;
alter table public.dm_messages enable row level security;
alter table public.worker_posts enable row level security;
alter table public.worker_likes enable row level security;
alter table public.worker_comments enable row level security;
alter table public.saved_posts enable row level security;
alter table public.video_shares enable row level security;
alter table public.reviews enable row level security;
alter table public.documents enable row level security;
alter table public.worker_locations enable row level security;
alter table public.live_locations enable row level security;
alter table public.supplier_products enable row level security;
alter table public.supplier_contacts enable row level security;
alter table public.notifications enable row level security;
alter table public.user_events enable row level security;
alter table public.page_views enable row level security;
alter table public.admin_worker_notes enable row level security;
alter table public.admin_worker_history enable row level security;
alter table public.worker_blocks enable row level security;

drop policy if exists "profiles_read" on public.profiles;
create policy "profiles_read" on public.profiles for select to anon, authenticated
using (role in ('worker', 'supplier') or id = (select auth.uid()) or private.is_admin_or_cashier());
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert to authenticated
with check ((id = (select auth.uid()) and role in ('client', 'worker', 'supplier')) or private.is_admin_or_cashier());
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update to authenticated
using (id = (select auth.uid()) or private.is_admin_or_cashier())
with check ((id = (select auth.uid()) and role in ('client', 'worker', 'supplier')) or private.is_admin_or_cashier());

drop policy if exists "service_categories_read" on public.service_categories;
create policy "service_categories_read" on public.service_categories for select to anon, authenticated
using (is_active = true or private.is_admin_or_cashier());

drop policy if exists "worker_profiles_read" on public.worker_profiles;
create policy "worker_profiles_read" on public.worker_profiles for select to anon, authenticated
using (is_active = true or active = true or user_id = (select auth.uid()) or private.is_admin_or_cashier());
drop policy if exists "worker_profiles_insert_own" on public.worker_profiles;
create policy "worker_profiles_insert_own" on public.worker_profiles for insert to authenticated
with check (user_id = (select auth.uid()) or private.is_admin_or_cashier());
drop policy if exists "worker_profiles_update_own" on public.worker_profiles;
create policy "worker_profiles_update_own" on public.worker_profiles for update to authenticated
using (user_id = (select auth.uid()) or private.is_admin_or_cashier())
with check (user_id = (select auth.uid()) or private.is_admin_or_cashier());

drop policy if exists "supplier_profiles_read" on public.supplier_profiles;
create policy "supplier_profiles_read" on public.supplier_profiles for select to anon, authenticated
using (is_active = true or user_id = (select auth.uid()) or private.is_admin_or_cashier());
drop policy if exists "supplier_profiles_insert_own" on public.supplier_profiles;
create policy "supplier_profiles_insert_own" on public.supplier_profiles for insert to authenticated
with check (user_id = (select auth.uid()) or private.is_admin_or_cashier());
drop policy if exists "supplier_profiles_update_own" on public.supplier_profiles;
create policy "supplier_profiles_update_own" on public.supplier_profiles for update to authenticated
using (user_id = (select auth.uid()) or private.is_admin_or_cashier())
with check (user_id = (select auth.uid()) or private.is_admin_or_cashier());

drop policy if exists "jobs_read" on public.jobs;
create policy "jobs_read" on public.jobs for select to authenticated
using (
  client_id = (select auth.uid())
  or worker_id = (select auth.uid())
  or assigned_worker = (select auth.uid())
  or status = 'open'
  or private.is_admin_or_cashier()
);
drop policy if exists "jobs_insert_client" on public.jobs;
create policy "jobs_insert_client" on public.jobs for insert to authenticated
with check (client_id = (select auth.uid()) or private.is_admin_or_cashier());
drop policy if exists "jobs_update_participants" on public.jobs;
create policy "jobs_update_participants" on public.jobs for update to authenticated
using (client_id = (select auth.uid()) or worker_id = (select auth.uid()) or assigned_worker = (select auth.uid()) or private.is_admin_or_cashier())
with check (client_id = (select auth.uid()) or worker_id = (select auth.uid()) or assigned_worker = (select auth.uid()) or private.is_admin_or_cashier());

drop policy if exists "job_photos_participants" on public.job_photos;
create policy "job_photos_participants" on public.job_photos for all to authenticated
using (created_by = (select auth.uid()) or private.is_admin_or_cashier() or exists (
  select 1 from public.jobs j
  where j.id = job_photos.job_id
    and (select auth.uid()) in (j.client_id, j.worker_id, j.assigned_worker)
))
with check (created_by = (select auth.uid()) or private.is_admin_or_cashier());

drop policy if exists "chats_participants_read" on public.chats;
create policy "chats_participants_read" on public.chats for select to authenticated
using ((select auth.uid()) in (client_id, worker_id, supplier_id, participant_a_id, participant_b_id) or private.is_admin_or_cashier());
drop policy if exists "chats_participants_insert" on public.chats;
create policy "chats_participants_insert" on public.chats for insert to authenticated
with check ((select auth.uid()) in (client_id, worker_id, supplier_id, participant_a_id, participant_b_id) or private.is_admin_or_cashier());
drop policy if exists "chats_participants_update" on public.chats;
create policy "chats_participants_update" on public.chats for update to authenticated
using ((select auth.uid()) in (client_id, worker_id, supplier_id, participant_a_id, participant_b_id) or private.is_admin_or_cashier())
with check ((select auth.uid()) in (client_id, worker_id, supplier_id, participant_a_id, participant_b_id) or private.is_admin_or_cashier());

drop policy if exists "messages_participants_read" on public.messages;
create policy "messages_participants_read" on public.messages for select to authenticated
using (private.is_chat_participant(chat_id));
drop policy if exists "messages_sender_insert" on public.messages;
create policy "messages_sender_insert" on public.messages for insert to authenticated
with check (sender_id = (select auth.uid()) and private.is_chat_participant(chat_id));
drop policy if exists "messages_sender_update" on public.messages;
create policy "messages_sender_update" on public.messages for update to authenticated
using (sender_id = (select auth.uid()) or private.is_admin_or_cashier())
with check (sender_id = (select auth.uid()) or private.is_admin_or_cashier());

drop policy if exists "dm_messages_pair" on public.dm_messages;
create policy "dm_messages_pair" on public.dm_messages for all to authenticated
using ((select auth.uid()) in (sender_id, receiver_id) or private.is_admin_or_cashier())
with check (sender_id = (select auth.uid()) or private.is_admin_or_cashier());

drop policy if exists "worker_posts_read" on public.worker_posts;
create policy "worker_posts_read" on public.worker_posts for select to anon, authenticated
using (is_public = true or worker_id = (select auth.uid()) or private.is_admin_or_cashier());
drop policy if exists "worker_posts_insert_own" on public.worker_posts;
create policy "worker_posts_insert_own" on public.worker_posts for insert to authenticated
with check (worker_id = (select auth.uid()) or private.is_admin_or_cashier());
drop policy if exists "worker_posts_update_own" on public.worker_posts;
create policy "worker_posts_update_own" on public.worker_posts for update to authenticated
using (worker_id = (select auth.uid()) or private.is_admin_or_cashier())
with check (worker_id = (select auth.uid()) or private.is_admin_or_cashier());

drop policy if exists "worker_likes_read" on public.worker_likes;
create policy "worker_likes_read" on public.worker_likes for select to anon, authenticated using (true);
drop policy if exists "worker_likes_insert_own" on public.worker_likes;
create policy "worker_likes_insert_own" on public.worker_likes for insert to authenticated
with check (client_id = (select auth.uid()) or private.is_admin_or_cashier());
drop policy if exists "worker_likes_update_own" on public.worker_likes;
create policy "worker_likes_update_own" on public.worker_likes for update to authenticated
using (client_id = (select auth.uid()) or private.is_admin_or_cashier())
with check (client_id = (select auth.uid()) or private.is_admin_or_cashier());
drop policy if exists "worker_likes_delete_own" on public.worker_likes;
create policy "worker_likes_delete_own" on public.worker_likes for delete to authenticated
using (client_id = (select auth.uid()) or private.is_admin_or_cashier());

drop policy if exists "worker_comments_read" on public.worker_comments;
create policy "worker_comments_read" on public.worker_comments for select to anon, authenticated using (true);
drop policy if exists "worker_comments_insert_own" on public.worker_comments;
create policy "worker_comments_insert_own" on public.worker_comments for insert to authenticated
with check (author_id = (select auth.uid()) or private.is_admin_or_cashier());
drop policy if exists "worker_comments_update_own" on public.worker_comments;
create policy "worker_comments_update_own" on public.worker_comments for update to authenticated
using (author_id = (select auth.uid()) or private.is_admin_or_cashier())
with check (author_id = (select auth.uid()) or private.is_admin_or_cashier());

drop policy if exists "saved_posts_owner" on public.saved_posts;
create policy "saved_posts_owner" on public.saved_posts for all to authenticated
using (user_id = (select auth.uid()) or private.is_admin_or_cashier())
with check (user_id = (select auth.uid()) or private.is_admin_or_cashier());

drop policy if exists "video_shares_insert" on public.video_shares;
create policy "video_shares_insert" on public.video_shares for insert to anon, authenticated with check (true);
drop policy if exists "video_shares_admin_read" on public.video_shares;
create policy "video_shares_admin_read" on public.video_shares for select to authenticated using (private.is_admin_or_cashier());

drop policy if exists "reviews_read" on public.reviews;
create policy "reviews_read" on public.reviews for select to anon, authenticated using (true);
drop policy if exists "reviews_insert_own" on public.reviews;
create policy "reviews_insert_own" on public.reviews for insert to authenticated
with check (reviewer_id = (select auth.uid()) or private.is_admin_or_cashier());

drop policy if exists "documents_owner_admin" on public.documents;
create policy "documents_owner_admin" on public.documents for all to authenticated
using (user_id = (select auth.uid()) or private.is_admin_or_cashier())
with check (user_id = (select auth.uid()) or private.is_admin_or_cashier());

drop policy if exists "worker_locations_read" on public.worker_locations;
create policy "worker_locations_read" on public.worker_locations for select to anon, authenticated using (true);
drop policy if exists "worker_locations_owner_write" on public.worker_locations;
create policy "worker_locations_owner_write" on public.worker_locations for all to authenticated
using (worker_id = (select auth.uid()) or private.is_admin_or_cashier())
with check (worker_id = (select auth.uid()) or private.is_admin_or_cashier());

drop policy if exists "live_locations_participants" on public.live_locations;
create policy "live_locations_participants" on public.live_locations for all to authenticated
using (user_id = (select auth.uid()) or private.is_admin_or_cashier() or private.is_chat_participant(chat_id))
with check (user_id = (select auth.uid()) or private.is_admin_or_cashier());

drop policy if exists "supplier_products_read" on public.supplier_products;
create policy "supplier_products_read" on public.supplier_products for select to anon, authenticated
using (is_active = true or supplier_id = (select auth.uid()) or private.is_admin_or_cashier());
drop policy if exists "supplier_products_insert_own" on public.supplier_products;
create policy "supplier_products_insert_own" on public.supplier_products for insert to authenticated
with check (supplier_id = (select auth.uid()) or private.is_admin_or_cashier());
drop policy if exists "supplier_products_update_own" on public.supplier_products;
create policy "supplier_products_update_own" on public.supplier_products for update to authenticated
using (supplier_id = (select auth.uid()) or private.is_admin_or_cashier())
with check (supplier_id = (select auth.uid()) or private.is_admin_or_cashier());

drop policy if exists "supplier_contacts_related" on public.supplier_contacts;
create policy "supplier_contacts_related" on public.supplier_contacts for all to authenticated
using (supplier_id = (select auth.uid()) or user_id = (select auth.uid()) or private.is_admin_or_cashier())
with check (user_id = (select auth.uid()) or private.is_admin_or_cashier());

drop policy if exists "notifications_owner" on public.notifications;
create policy "notifications_owner" on public.notifications for all to authenticated
using (user_id = (select auth.uid()) or private.is_admin_or_cashier())
with check (user_id = (select auth.uid()) or private.is_admin_or_cashier());

drop policy if exists "user_events_insert" on public.user_events;
create policy "user_events_insert" on public.user_events for insert to anon, authenticated with check (true);
drop policy if exists "user_events_admin_read" on public.user_events;
create policy "user_events_admin_read" on public.user_events for select to authenticated using (private.is_admin_or_cashier());

drop policy if exists "page_views_insert" on public.page_views;
create policy "page_views_insert" on public.page_views for insert to anon, authenticated with check (true);
drop policy if exists "page_views_admin_read" on public.page_views;
create policy "page_views_admin_read" on public.page_views for select to authenticated using (private.is_admin_or_cashier());

drop policy if exists "admin_worker_notes_admin" on public.admin_worker_notes;
create policy "admin_worker_notes_admin" on public.admin_worker_notes for all to authenticated
using (private.is_admin_or_cashier())
with check (private.is_admin_or_cashier());
drop policy if exists "admin_worker_history_admin" on public.admin_worker_history;
create policy "admin_worker_history_admin" on public.admin_worker_history for all to authenticated
using (private.is_admin_or_cashier())
with check (private.is_admin_or_cashier());
drop policy if exists "worker_blocks_admin" on public.worker_blocks;
create policy "worker_blocks_admin" on public.worker_blocks for all to authenticated
using (private.is_admin_or_cashier())
with check (private.is_admin_or_cashier());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 5242880, array['image/png','image/jpeg','image/webp']),
  ('worker-media', 'worker-media', true, 104857600, array['image/png','image/jpeg','image/webp','video/mp4','video/webm','video/quicktime']),
  ('supplier-media', 'supplier-media', true, 104857600, array['image/png','image/jpeg','image/webp','video/mp4','video/webm','video/quicktime']),
  ('job-photos', 'job-photos', true, 20971520, array['image/png','image/jpeg','image/webp']),
  ('chat-media', 'chat-media', true, 104857600, array['image/png','image/jpeg','image/webp','video/mp4','video/webm','video/quicktime','audio/mpeg','audio/mp4','audio/webm','audio/wav','audio/ogg','application/pdf']),
  ('worker-docs', 'worker-docs', false, 20971520, array['image/png','image/jpeg','image/webp','application/pdf'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public_assets_read" on storage.objects;
drop policy if exists "avatars_owner_write" on storage.objects;
drop policy if exists "worker_media_owner_write" on storage.objects;
drop policy if exists "supplier_media_owner_write" on storage.objects;
drop policy if exists "job_photos_auth_write" on storage.objects;
drop policy if exists "worker_docs_private" on storage.objects;
drop policy if exists "chat_media_private" on storage.objects;
drop policy if exists "manosya_public_media_read" on storage.objects;
create policy "manosya_public_media_read" on storage.objects for select to anon, authenticated
using (bucket_id in ('avatars', 'worker-media', 'supplier-media', 'job-photos', 'chat-media'));

drop policy if exists "manosya_avatars_owner_write" on storage.objects;
create policy "manosya_avatars_owner_write" on storage.objects for all to authenticated
using (bucket_id = 'avatars' and (((storage.foldername(name))[1] = (select auth.uid())::text) or private.is_admin_or_cashier()))
with check (bucket_id = 'avatars' and (((storage.foldername(name))[1] = (select auth.uid())::text) or private.is_admin_or_cashier()));

drop policy if exists "manosya_worker_media_owner_write" on storage.objects;
create policy "manosya_worker_media_owner_write" on storage.objects for all to authenticated
using (bucket_id = 'worker-media' and (((storage.foldername(name))[1] = (select auth.uid())::text) or private.is_admin_or_cashier()))
with check (bucket_id = 'worker-media' and (((storage.foldername(name))[1] = (select auth.uid())::text) or private.is_admin_or_cashier()));

drop policy if exists "manosya_supplier_media_owner_write" on storage.objects;
create policy "manosya_supplier_media_owner_write" on storage.objects for all to authenticated
using (bucket_id = 'supplier-media' and (((storage.foldername(name))[1] = (select auth.uid())::text) or private.is_admin_or_cashier()))
with check (bucket_id = 'supplier-media' and (((storage.foldername(name))[1] = (select auth.uid())::text) or private.is_admin_or_cashier()));

drop policy if exists "manosya_job_photos_write" on storage.objects;
create policy "manosya_job_photos_write" on storage.objects for all to authenticated
using (bucket_id = 'job-photos')
with check (bucket_id = 'job-photos');

drop policy if exists "manosya_chat_media_write" on storage.objects;
create policy "manosya_chat_media_write" on storage.objects for all to authenticated
using (bucket_id = 'chat-media')
with check (bucket_id = 'chat-media');

drop policy if exists "manosya_worker_docs_owner_private" on storage.objects;
create policy "manosya_worker_docs_owner_private" on storage.objects for all to authenticated
using (bucket_id = 'worker-docs' and (((storage.foldername(name))[1] = (select auth.uid())::text) or private.is_admin_or_cashier()))
with check (bucket_id = 'worker-docs' and (((storage.foldername(name))[1] = (select auth.uid())::text) or private.is_admin_or_cashier()));

grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon;
grant insert on public.page_views, public.user_events, public.video_shares to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant select on public.worker_posts_public, public.worker_feed_view, public.map_workers_view, public.map_suppliers_view to anon, authenticated;
grant select on public.admin_workers_view to authenticated;
grant execute on function public.mark_chat_read(uuid) to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'messages'
    ) then
      execute 'alter publication supabase_realtime add table public.messages';
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'chats'
    ) then
      execute 'alter publication supabase_realtime add table public.chats';
    end if;
  end if;
end $$;

alter table public.messages replica identity full;
alter table public.chats replica identity full;

-- Admin inicial: despues de registrarte, reemplaza el correo y ejecuta SOLO esa linea.
-- update public.profiles set role = 'admin', admin_role = 'owner', is_verified = true, verified = true where email = 'tu-email@gmail.com';
