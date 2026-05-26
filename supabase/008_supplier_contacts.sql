create extension if not exists pgcrypto;

create table if not exists public.supplier_contacts (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.profiles(id) on delete cascade,
  requester_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid references public.supplier_products(id) on delete set null,
  source_role text not null default 'client',
  source_context text,
  message text,
  contact_url text,
  status text not null default 'open',
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.supplier_contacts enable row level security;

create index if not exists supplier_contacts_supplier_idx
  on public.supplier_contacts (supplier_id, created_at desc);

create index if not exists supplier_contacts_requester_idx
  on public.supplier_contacts (requester_id, created_at desc);

do $$
begin
  if exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  )
  and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'supplier_contacts'
  ) then
    execute 'alter publication supabase_realtime add table public.supplier_contacts';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'supplier_contacts'
      and policyname = 'supplier_contacts_insert_requester'
  ) then
    create policy supplier_contacts_insert_requester on public.supplier_contacts
      for insert
      with check (auth.uid() = requester_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'supplier_contacts'
      and policyname = 'supplier_contacts_select_connected'
  ) then
    create policy supplier_contacts_select_connected on public.supplier_contacts
      for select
      using (
        auth.uid() = requester_id
        or auth.uid() = supplier_id
        or exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and (p.role in ('admin', 'cashier') or coalesce(p.admin_role, false) = true)
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'supplier_contacts'
      and policyname = 'supplier_contacts_update_supplier_or_admin'
  ) then
    create policy supplier_contacts_update_supplier_or_admin on public.supplier_contacts
      for update
      using (
        auth.uid() = supplier_id
        or exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and (p.role in ('admin', 'cashier') or coalesce(p.admin_role, false) = true)
        )
      )
      with check (
        auth.uid() = supplier_id
        or exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and (p.role in ('admin', 'cashier') or coalesce(p.admin_role, false) = true)
        )
      );
  end if;
end $$;
