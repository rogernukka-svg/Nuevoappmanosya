alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('client','worker','admin','cashier','supplier'));

create table if not exists public.supplier_products (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.profiles(id) on delete cascade,
  supplier_name text,
  title text not null,
  description text,
  price_text text,
  service_slug text,
  image_url text,
  contact_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.supplier_products enable row level security;

drop policy if exists "supplier_products_select_active" on public.supplier_products;
create policy "supplier_products_select_active" on public.supplier_products
  for select using (is_active = true or auth.uid() = supplier_id);

drop policy if exists "supplier_products_insert_own" on public.supplier_products;
create policy "supplier_products_insert_own" on public.supplier_products
  for insert with check (auth.uid() = supplier_id);

drop policy if exists "supplier_products_update_own" on public.supplier_products;
create policy "supplier_products_update_own" on public.supplier_products
  for update using (auth.uid() = supplier_id) with check (auth.uid() = supplier_id);

drop policy if exists "supplier_products_delete_own" on public.supplier_products;
create policy "supplier_products_delete_own" on public.supplier_products
  for delete using (auth.uid() = supplier_id);

create index if not exists supplier_products_service_idx
  on public.supplier_products (service_slug, is_active, created_at desc);

create table if not exists public.supplier_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  store_name text,
  bio text,
  avatar_url text,
  cover_url text,
  whatsapp_url text,
  address_text text,
  service_slugs text[] not null default '{}',
  is_verified boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.supplier_profiles enable row level security;

drop policy if exists "supplier_profiles_select_all" on public.supplier_profiles;
create policy "supplier_profiles_select_all" on public.supplier_profiles
  for select using (true);

drop policy if exists "supplier_profiles_insert_own" on public.supplier_profiles;
create policy "supplier_profiles_insert_own" on public.supplier_profiles
  for insert with check (auth.uid() = user_id);

drop policy if exists "supplier_profiles_update_own" on public.supplier_profiles;
create policy "supplier_profiles_update_own" on public.supplier_profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
