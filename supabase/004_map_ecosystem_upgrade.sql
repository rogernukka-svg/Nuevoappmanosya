-- ManosYA map ecosystem upgrade.
-- Run this once on an existing Supabase project after 003_manosya_real_app_schema.sql.

alter table if exists public.supplier_profiles
  add column if not exists has_delivery boolean not null default false;

drop view if exists public.map_workers_view cascade;
drop view if exists public.map_suppliers_view cascade;

create view public.map_workers_view
with (security_invoker = true)
as
select
  user_id,
  full_name,
  phone,
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
  coalesce(sp.phone, p.phone) as phone,
  coalesce(sp.lat, p.lat) as lat,
  coalesce(sp.lng, p.lng) as lng,
  coalesce(sp.logo_url, p.avatar_url) as logo_url,
  product.title as product_title,
  product.description as product_description,
  product.media_url,
  product.price,
  sp.has_delivery
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

grant select on public.map_workers_view, public.map_suppliers_view to anon, authenticated;
