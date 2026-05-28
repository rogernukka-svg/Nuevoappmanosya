# Auditoria de seguridad y privacidad ManosYA

Fecha: 2026-05-28

## Resumen ejecutivo

ManosYA ya tiene una base razonable de auth con Supabase y RLS parcial, pero el mayor riesgo real no es solamente tecnico: es social. Usuarios hablando con desconocidos, links externos, WhatsApp, celulares inseguros y cuentas compartidas pueden producir phishing, spam, robo de cuentas y filtracion de telefonos.

Esta pasada agrega defensas livianas sin romper UX:

- Sanitizacion comun de texto, links y archivos en `lib/security.js`.
- Rate limit local para mensajes/contactos repetidos.
- Bloqueo de protocolos peligrosos como `javascript:` / `data:text/html`.
- Validacion compartida de imagen/video.
- Sanitizacion de links de proveedor y WhatsApp.
- Admin sin correo hardcodeado.
- SQL nuevo para RLS de `chats`, `dm_messages`, `messages`, logs de seguridad y rate limit server-side.

## Riesgos encontrados

1. Chats con texto crudo
   - Riesgo: spam, links sospechosos, payloads HTML/script guardados en base.
   - Archivos afectados: `components/ChatBox.jsx`, `app/chat/[chatId]/page.jsx`, `app/client/chat/[id]/page.jsx`, `app/job/[id]/chat/page.jsx`, `app/dm/[id]/page.jsx`, `app/worker/page.jsx`, `app/worker/jobs/page.jsx`, `app/client/page.jsx`, `app/worker/feed/page.jsx`.
   - Estado: mitigado en cliente con sanitizacion + rate limit. Recomendado aplicar `supabase/009_security_privacy.sql` para proteccion real en DB.

2. Contactos externos y WhatsApp
   - Riesgo: links maliciosos o exposicion innecesaria fuera de ManosYA.
   - Archivos afectados: `app/client/page.jsx`, `app/worker/feed/page.jsx`, `app/supplier/page.jsx`.
   - Estado: se filtran URLs externas a `https://`, WhatsApp limitado a `wa.me`/`whatsapp.com` en perfil proveedor.

3. Admin y roles
   - Riesgo: permisos inconsistentes entre `role` y `admin_role`, y un correo admin hardcodeado en nav.
   - Archivos afectados: `components/Nav.jsx`, `components/RequireAdmin.jsx`, `components/RequireAdminOrCashier.jsx`, `app/admin/analytics/page.jsx`, `app/admin/workers/page.jsx`.
   - Estado: removido correo hardcodeado en nav y helpers admin leen `admin_role`.

4. RLS incompleto para chats modernos
   - Riesgo: la app usa `chats` y `messages.chat_id`, pero las migraciones previas no definian completamente `chats` ni politicas modernas por `chat_id`.
   - SQL afectado: `supabase/007_platform_hardening.sql`, `supabase/008_supplier_contacts.sql`.
   - Estado: agregado `supabase/009_security_privacy.sql`.

5. Uploads
   - Riesgo: archivos no permitidos, extensiones peligrosas, videos pesados.
   - Archivos afectados: `app/worker/feed/page.jsx`, `app/client/profile/page.jsx`, `app/auth/login/page.jsx`.
   - Estado: validacion compartida con `validateMediaFile`. Worker onboard ya tenia validacion propia.

6. Base de datos
   - Riesgo: `admin_role` es `text`, pero `008_supplier_contacts.sql` lo trataba como boolean.
   - Estado: corregido a comparacion textual.

## Partes mas vulnerables

- Chat cliente-trabajador: principal vector de phishing y spam.
- Links de proveedor/WhatsApp: principal salida fuera de ManosYA.
- Registro/login: riesgo de cuenta robada si el usuario comparte codigos o usa celular comprometido.
- Admin: si un rol queda mal asignado, expone datos sensibles.
- Storage: necesita politicas estrictas por bucket en Supabase.

## Urgente

1. Ejecutar `supabase/009_security_privacy.sql` en Supabase.
2. Revisar policies de Storage:
   - `avatars`: lectura publica, escritura solo del owner.
   - `worker-media`: lectura publica, escritura solo del worker.
   - `worker-docs`: lectura solo owner/admin, escritura solo owner.
3. Mover chats nuevos a RPC `post_chat_message` cuando la migracion ya este aplicada.
4. Agregar reportes: usuario puede reportar perfil, chat, producto o link sospechoso.
5. Activar logs externos: Sentry para errores, PostHog para eventos, LogRocket solo si privacidad/legal esta claro.

## SQL clave

Archivo: `supabase/009_security_privacy.sql`

Incluye:

- `public.is_platform_admin()`
- tabla `public.security_events`
- tabla `public.security_action_events`
- rate limit server-side con `public.register_security_action(...)`
- RPC `public.post_chat_message(p_chat_id, p_text)`
- RLS para `chats`, `messages`, `dm_messages`
- constraints de longitud y links seguros

## Estrategia realista

Fase 1, ya iniciada:
- Sanitizar mensajes y links.
- Bloquear URLs peligrosas.
- Rate limit local.
- Admin consistente.
- Validacion de uploads.

Fase 2, backend:
- Aplicar SQL 009.
- Cambiar todos los inserts de chat a `post_chat_message`.
- Crear `report_user`, `report_message`, `report_product`.
- Tabla de `blocked_users`.

Fase 3, confianza:
- Mostrar tips breves en chat: no compartir codigos SMS, revisar links, usar verificacion de WhatsApp.
- Badge de verificado real para trabajadores/proveedores.
- Estado de cuenta: nuevo dispositivo, ultimo acceso, cerrar sesiones.

Fase 4, monitoreo:
- Sentry: errores JS/API.
- PostHog: funnels, abuso de clicks/contactos, eventos de seguridad.
- LogRocket: solo para admins/testers o con consentimiento, porque graba pantalla.

## Que podria explotar al escalar

- Spam masivo por chats si no se usa rate limit server-side.
- Proveedores publicando links maliciosos si no hay validacion y moderacion.
- Cuentas falsas con fotos robadas si no hay verificacion progresiva.
- Admin expuesto por politicas RLS incompletas.
- Usuarios sacando conversaciones a WhatsApp demasiado pronto y perdiendo trazabilidad.
- Archivos pesados saturando Storage/CDN.

## Recomendaciones UX

Texto corto para chats:

> Para tu seguridad: no compartas codigos SMS, claves ni pagos fuera de ManosYA. Si un link se ve raro, no lo abras y reportalo.

Texto corto para WhatsApp:

> WhatsApp es opcional. Mantene la conversacion en ManosYA hasta confirmar confianza. Activa verificacion en dos pasos en WhatsApp.

Texto corto para perfil:

> Tu telefono se usa para coordinar, pero ManosYA prioriza el chat interno para protegerte de spam y fraudes.
