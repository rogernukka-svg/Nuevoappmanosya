# ManosYA Social Messenger

Webhook público:

```txt
https://www.manosya.app/api/meta/webhook
```

Variables de entorno necesarias en backend:

```env
OPENAI_API_KEY=
OPENAI_SOCIAL_MODEL=gpt-4o-mini
META_VERIFY_TOKEN=
META_PAGE_ACCESS_TOKEN=
META_APP_SECRET=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

Notas:

- `SUPABASE_URL` puede omitirse si `NEXT_PUBLIC_SUPABASE_URL` ya existe, porque el webhook lo lee solo del lado servidor.
- `SUPABASE_SERVICE_ROLE_KEY` debe ser una service role real; no se usa en frontend.
- `META_APP_SECRET` activa la validación de `X-Hub-Signature-256`. Si no está configurado, el webhook usa la verificación estándar por `META_VERIFY_TOKEN`.
- Antes de activar Messenger, ejecutar `supabase/010_social_messages.sql`.
- El webhook ignora mensajes vacíos, echoes de la página y reintentos duplicados con `message.mid`.
