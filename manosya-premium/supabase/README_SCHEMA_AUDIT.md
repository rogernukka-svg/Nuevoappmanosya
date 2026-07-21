# Auditoria Supabase ManosYA

Archivo principal: `000_manosya_complete_schema.sql`

## Que cubre

- Registro y login con Supabase Auth usando `auth.users`.
- Creacion automatica de `profiles` al registrarse.
- Roles centrales: `client`, `worker`, `supplier`, `admin`, `cashier`.
- Perfiles de cliente, trabajador y proveedor.
- Feed tipo video/reel: `worker_posts`, `worker_feed_view`, `worker_posts_public`, `map_workers_view`.
- Jobs/pedidos: `jobs`, `business_jobs`, fotos, estados, aceptar/cancelar/completar.
- Chat por pedido y mensajes directos: `chats`, `messages`, `dm_messages`, unread.
- Onboarding trabajador: documentos, banco, ubicacion, skills, aprobacion admin.
- Proveedores: perfil, productos y contactos.
- Admin/analytics: workers, notas, historial, bloqueos, gastos, facturas, eventos.
- Billing basico: wallets, subscriptions, transactions.
- Storage buckets: avatars, worker-media, supplier-media, job-photos, worker-docs, chat-media, chat-audio.
- RLS/policies para usuarios, participantes y admin.

## Auditoria tecnica

- La app vieja y la nueva usan nombres distintos para algunas columnas. El SQL mantiene compatibilidad con ambos:
  - `jobs.worker_id` y `jobs.assigned_worker`.
  - `jobs.service_slug`, `jobs.service_type` y `jobs.skill_id`.
  - `messages.body`, `messages.text` y `messages.content`.
  - `worker_profiles.is_active` y `worker_profiles.active`.
- No se toca `auth.users`.
- Las vistas se recrean porque son la capa limpia para feed, mapa y admin.
- Las policies se recrean con `drop policy if exists` para poder volver a ejecutar el script durante desarrollo.

## Como usar

1. Abrir Supabase SQL Editor.
2. Pegar todo el contenido de `000_manosya_complete_schema.sql`.
3. Ejecutar.
4. Crear un usuario normal desde la app.
5. Para convertir tu usuario en admin, ejecutar una vez:

```sql
update public.profiles
set role = 'admin', admin_role = 'owner', is_verified = true
where email = 'TU_EMAIL_AQUI';
```

## Precaucion

En produccion, hacer backup antes. El script no borra tablas completas, pero si reemplaza vistas, triggers y policies para que queden consistentes.
