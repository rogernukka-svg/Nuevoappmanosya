alter table public.worker_comments
  add column if not exists commenter_role text,
  add column if not exists product_id uuid references public.supplier_products(id) on delete set null,
  add column if not exists product_title text,
  add column if not exists product_price_text text,
  add column if not exists product_image_url text,
  add column if not exists product_service_slug text;

create index if not exists worker_comments_product_idx
  on public.worker_comments (product_id, created_at desc);
