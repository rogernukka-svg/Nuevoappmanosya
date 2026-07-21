alter table public.supplier_profiles
  add column if not exists address text,
  add column if not exists lat double precision,
  add column if not exists lng double precision;

create or replace view public.map_suppliers_view
with (security_invoker = true) as
select
  sp.user_id,
  sp.business_name,
  sp.category,
  sp.city,
  sp.address,
  sp.lat,
  sp.lng,
  sp.logo_url,
  sp.is_active,
  latest_product.id as product_id,
  latest_product.title as product_title,
  latest_product.description as product_description,
  latest_product.media_url,
  latest_product.price,
  sp.updated_at
from public.supplier_profiles sp
left join lateral (
  select product.*
  from public.supplier_products product
  where product.supplier_id = sp.user_id
    and product.is_active = true
    and product.service_slug is distinct from '__cover__'
  order by product.created_at desc
  limit 1
) latest_product on true
where sp.is_active = true
  and sp.lat is not null
  and sp.lng is not null;

grant select on public.map_suppliers_view to anon, authenticated;
