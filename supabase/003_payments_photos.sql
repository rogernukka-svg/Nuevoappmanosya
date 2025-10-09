-- === Storage bucket for job photos ===
-- Create public bucket if missing
do $$ begin
  perform 1 from storage.buckets where id = 'job-photos';
  if not found then
    perform storage.create_bucket('job-photos', public => true);
  end if;
end $$;

-- Table to reference uploaded photos
create table if not exists public.job_photos (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  path text not null,  -- storage path in bucket 'job-photos'
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.job_photos enable row level security;

-- RLS: participants can see/insert their job photos
drop policy if exists "jp_select_participants" on public.job_photos;
create policy "jp_select_participants" on public.job_photos
  for select using (
    exists (select 1 from public.jobs j
            where j.id = job_id
              and (auth.uid() = j.client_id or auth.uid() = j.assigned_worker))
  );

drop policy if exists "jp_insert_participants" on public.job_photos;
create policy "jp_insert_participants" on public.job_photos
  for insert with check (
    created_by = auth.uid() and
    exists (select 1 from public.jobs j
            where j.id = job_id
              and (auth.uid() = j.client_id or auth.uid() = j.assigned_worker))
  );

-- Storage RLS for bucket job-photos (read public; write by participants)
-- NOTE: storage.objects has a separate RLS; we allow public read and authenticated write.
drop policy if exists "Public read job-photos" on storage.objects;
create policy "Public read job-photos" on storage.objects
  for select using (bucket_id = 'job-photos');

drop policy if exists "Insert job-photos by auth" on storage.objects;
create policy "Insert job-photos by auth" on storage.objects
  for insert with check (bucket_id = 'job-photos' and auth.role() = 'authenticated');

drop policy if exists "Update job-photos by owner" on storage.objects;
create policy "Update job-photos by owner" on storage.objects
  for update using (bucket_id = 'job-photos' and auth.role() = 'authenticated')
  with check (bucket_id = 'job-photos' and auth.role() = 'authenticated');

-- === Ratings: unique per (job, rater) + RPC ===
create unique index if not exists uniq_ratings_job_rater on public.ratings(job_id, rater_id);

create or replace function public.post_rating(job_id uuid, stars int, comment text)
returns void language plpgsql as $$
declare j record;
begin
  if stars < 1 or stars > 5 then raise exception 'stars out of range'; end if;
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select client_id, assigned_worker, status into j from public.jobs where id = job_id;
  if j is null then raise exception 'job not found'; end if;
  if j.status <> 'completed' then raise exception 'job not completed'; end if;
  if auth.uid() <> j.client_id and auth.uid() <> j.assigned_worker then
    raise exception 'not a participant';
  end if;
  insert into public.ratings(job_id, rater_id, ratee_id, stars, comment)
  values (job_id,
          auth.uid(),
          case when auth.uid() = j.client_id then j.assigned_worker else j.client_id end,
          stars, comment);
end;
$$;

-- === Wallets / Transactions / Plans / Subscriptions ===
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('client','worker','admin','cashier'));

create table if not exists public.wallets (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  balance_cents bigint not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.wallets enable row level security;

drop policy if exists "wallet_self_select" on public.wallets;
create policy "wallet_self_select" on public.wallets
  for select using (auth.uid() = user_id);

drop policy if exists "wallet_self_insert" on public.wallets;
create policy "wallet_self_insert" on public.wallets
  for insert with check (auth.uid() = user_id);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount_cents bigint not null, -- positive for credit, negative for debit
  type text not null check (type in ('mint','cashier_credit','subscription','job_fee','adjust')),
  note text,
  idempotency_key text unique,
  created_at timestamptz not null default now()
);
alter table public.transactions enable row level security;

drop policy if exists "tx_self_select" on public.transactions;
create policy "tx_self_select" on public.transactions
  for select using (auth.uid() = user_id);

-- Plans & subscriptions
create table if not exists public.plans (
  slug text primary key,
  name text not null,
  price_cents int not null,
  period_days int not null default 30
);
insert into public.plans(slug,name,price_cents,period_days) values
  ('worker_basic','Worker Basic',350,30)
on conflict (slug) do nothing;

create table if not exists public.subscriptions (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  plan_slug text not null references public.plans(slug),
  status text not null check (status in ('active','expired','canceled')) default 'expired',
  current_period_end timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table public.subscriptions enable row level security;

drop policy if exists "subs_self" on public.subscriptions;
create policy "subs_self" on public.subscriptions
  for select using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Helpers
create or replace function public.ensure_wallet(u uuid)
returns void language plpgsql as $$
begin
  insert into public.wallets(user_id) values (u)
  on conflict (user_id) do nothing;
end;
$$;

-- Admin mint (security definer)
create or replace function public.admin_mint(to_user uuid, amount_cents bigint, note text, idempotency_key text)
returns void language plpgsql security definer set search_path = public as $$
declare r text;
begin
  select role into r from public.profiles where id = auth.uid();
  if r <> 'admin' then raise exception 'not admin'; end if;

  if amount_cents <= 0 then raise exception 'amount must be positive'; end if;

  perform 1 from public.transactions where idempotency_key = admin_mint.idempotency_key;
  if found then return; end if;

  perform public.ensure_wallet(to_user);
  update public.wallets set balance_cents = balance_cents + amount_cents, updated_at = now()
  where user_id = to_user;
  insert into public.transactions(user_id, amount_cents, type, note, idempotency_key)
  values (to_user, amount_cents, 'mint', note, idempotency_key);
end;
$$;

-- Cashier credit by email (security definer)
create or replace function public.cashier_credit_by_email(target_email text, amount_cents bigint, note text, idempotency_key text)
returns void language plpgsql security definer set search_path = public as $$
declare r text; u uuid;
begin
  select role into r from public.profiles where id = auth.uid();
  if r <> 'cashier' and r <> 'admin' then raise exception 'not cashier'; end if;
  if amount_cents <= 0 then raise exception 'amount must be positive'; end if;

  select id into u from public.profiles where email = target_email;
  if u is null then raise exception 'user not found'; end if;

  perform 1 from public.transactions where idempotency_key = cashier_credit_by_email.idempotency_key;
  if found then return; end if;

  perform public.ensure_wallet(u);
  update public.wallets set balance_cents = balance_cents + amount_cents, updated_at = now()
  where user_id = u;
  insert into public.transactions(user_id, amount_cents, type, note, idempotency_key)
  values (u, amount_cents, 'cashier_credit', note, idempotency_key);
end;
$$;

-- Pay subscription (self-service)
create or replace function public.pay_subscription(plan_slug text, idempotency_key text)
returns void language plpgsql as $$
declare p record; w record; sub record; nowt timestamptz := now();
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select * into p from public.plans where slug = plan_slug;
  if p is null then raise exception 'plan not found'; end if;

  perform 1 from public.transactions where idempotency_key = pay_subscription.idempotency_key;
  if found then return; end if;

  perform public.ensure_wallet(auth.uid());
  select * into w from public.wallets where user_id = auth.uid();
  if w.balance_cents < p.price_cents then raise exception 'insufficient balance'; end if;

  -- Charge wallet
  update public.wallets set balance_cents = balance_cents - p.price_cents, updated_at = nowt
  where user_id = auth.uid();
  insert into public.transactions(user_id, amount_cents, type, note, idempotency_key)
  values (auth.uid(), -p.price_cents, 'subscription', 'Subscription payment', idempotency_key);

  -- Upsert subscription
  select * into sub from public.subscriptions where user_id = auth.uid();
  if sub.user_id is null then
    insert into public.subscriptions(user_id, plan_slug, status, current_period_end, updated_at)
    values (auth.uid(), plan_slug, 'active', nowt + make_interval(days => p.period_days), nowt);
  else
    update public.subscriptions set plan_slug = plan_slug, status = 'active',
      current_period_end = greatest(coalesce(current_period_end, nowt), nowt) + make_interval(days => p.period_days),
      updated_at = nowt
    where user_id = auth.uid();
  end if;
end;
$$;

-- Admin assign cashier role by email
create or replace function public.admin_set_cashier(email text, make_cashier boolean)
returns void language plpgsql security definer set search_path = public as $$
declare r text; u uuid;
begin
  select role into r from public.profiles where id = auth.uid();
  if r <> 'admin' then raise exception 'not admin'; end if;

  select id into u from public.profiles where email = email;
  if u is null then raise exception 'user not found'; end if;

  if make_cashier then
    update public.profiles set role = 'cashier' where id = u;
  else
    update public.profiles set role = 'worker' where id = u; -- fallback
  end if;
end;
$$;