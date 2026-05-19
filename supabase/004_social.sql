-- === Social feed: posts, likes, comments and friendships ===

create table if not exists public.worker_posts (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.profiles(id) on delete cascade,
  media_url text,
  media_type text not null default 'image' check (media_type in ('image', 'video')),
  caption text,
  text_overlay text,
  service_type text,
  music_url text,
  created_at timestamptz not null default now()
);
alter table public.worker_posts enable row level security;

drop policy if exists "worker_posts_select_all" on public.worker_posts;
create policy "worker_posts_select_all" on public.worker_posts
  for select using (true);

drop policy if exists "worker_posts_insert_own" on public.worker_posts;
create policy "worker_posts_insert_own" on public.worker_posts
  for insert with check (auth.uid() = worker_id);

drop policy if exists "worker_posts_update_own" on public.worker_posts;
create policy "worker_posts_update_own" on public.worker_posts
  for update using (auth.uid() = worker_id) with check (auth.uid() = worker_id);

drop policy if exists "worker_posts_delete_own" on public.worker_posts;
create policy "worker_posts_delete_own" on public.worker_posts
  for delete using (auth.uid() = worker_id);

create table if not exists public.worker_likes (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.profiles(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (worker_id, client_id)
);
alter table public.worker_likes enable row level security;

drop policy if exists "worker_likes_select_all" on public.worker_likes;
create policy "worker_likes_select_all" on public.worker_likes
  for select using (true);

drop policy if exists "worker_likes_insert_own" on public.worker_likes;
create policy "worker_likes_insert_own" on public.worker_likes
  for insert with check (auth.uid() = client_id);

drop policy if exists "worker_likes_delete_own" on public.worker_likes;
create policy "worker_likes_delete_own" on public.worker_likes
  for delete using (auth.uid() = client_id);

create table if not exists public.worker_comments (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.profiles(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  client_name text,
  client_avatar text,
  comment text not null,
  created_at timestamptz not null default now()
);
alter table public.worker_comments enable row level security;

drop policy if exists "worker_comments_select_all" on public.worker_comments;
create policy "worker_comments_select_all" on public.worker_comments
  for select using (true);

drop policy if exists "worker_comments_insert_own" on public.worker_comments;
create policy "worker_comments_insert_own" on public.worker_comments
  for insert with check (auth.uid() = client_id);

drop policy if exists "worker_comments_delete_own" on public.worker_comments;
create policy "worker_comments_delete_own" on public.worker_comments
  for delete using (auth.uid() = client_id);

create table if not exists public.user_friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_friendships_not_self check (requester_id <> addressee_id),
  unique (requester_id, addressee_id)
);
alter table public.user_friendships enable row level security;

drop policy if exists "user_friendships_select_participant" on public.user_friendships;
create policy "user_friendships_select_participant" on public.user_friendships
  for select using (auth.uid() = requester_id or auth.uid() = addressee_id);

drop policy if exists "user_friendships_insert_own" on public.user_friendships;
create policy "user_friendships_insert_own" on public.user_friendships
  for insert with check (auth.uid() = requester_id);

drop policy if exists "user_friendships_update_participant" on public.user_friendships;
create policy "user_friendships_update_participant" on public.user_friendships
  for update using (auth.uid() = requester_id or auth.uid() = addressee_id)
  with check (auth.uid() = requester_id or auth.uid() = addressee_id);

drop policy if exists "user_friendships_delete_participant" on public.user_friendships;
create policy "user_friendships_delete_participant" on public.user_friendships
  for delete using (auth.uid() = requester_id or auth.uid() = addressee_id);

create or replace function public.request_friend(addressee uuid)
returns text
language plpgsql
as $$
declare
  existing_direct record;
  existing_reverse record;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if addressee is null then raise exception 'missing addressee'; end if;
  if addressee = auth.uid() then return 'self'; end if;

  select * into existing_direct
  from public.user_friendships
  where requester_id = auth.uid() and addressee_id = addressee;

  if existing_direct.id is not null then
    return existing_direct.status;
  end if;

  select * into existing_reverse
  from public.user_friendships
  where requester_id = addressee and addressee_id = auth.uid();

  if existing_reverse.id is not null then
    update public.user_friendships
      set status = 'accepted', updated_at = now()
      where id = existing_reverse.id;
    return 'accepted';
  end if;

  insert into public.user_friendships (requester_id, addressee_id, status)
  values (auth.uid(), addressee, 'pending');

  return 'pending';
end;
$$;
