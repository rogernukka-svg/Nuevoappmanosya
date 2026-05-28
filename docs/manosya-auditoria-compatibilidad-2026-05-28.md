# Auditoria extrema de compatibilidad ManosYA

Fecha: 2026-05-28

## Resumen ejecutivo

El build de produccion compila, pero la app todavia tiene riesgos reales en celulares de gama baja, iOS Safari, conexiones lentas y pantallas con teclado abierto. Los puntos mas fragiles son: feeds tipo reel, perfil/edicion de datos, chat con teclado, mapas/GPS, subida de videos y admin analytics.

Se aplico un primer hardening seguro:
- `lib/mediaCache.js`: el precache de media ahora se salta en `saveData`, 2G, conexiones lentas y evita videos si la conexion no es buena.
- `next.config.js`: el cache PWA de videos bajo de 24 videos por 14 dias a 8 videos por 3 dias (`feed-videos-v2`), para evitar saturar storage/memoria en celulares.

Segunda ronda aplicada:
- `app/client/profile/page.jsx`: timeouts en subida de foto, update de auth, update de profile y logout; proteccion contra doble guardado; limpieza de previews `blob:` para evitar memoria retenida en iOS.
- `app/client/chat/[id]/page.jsx`: ajuste con `visualViewport` para teclado en iOS/Android y scroll automatico sin animacion cuando el teclado esta abierto.
- `app/worker/route/[jobId]/page.jsx` y `app/worker-route/page.jsx`: rutas pasan por `/api/ors/route`, se reduce frecuencia de recalculo a 15s, se evita trabajo en pestana oculta y se suaviza GPS.
- GPS suavizado en cliente/trabajador/feed/onboarding/nearby para usar `maximumAge`, timeout y menor consumo de bateria por defecto.
- `lib/realtimeCore.js`: eventos de jobs ahora incluyen `__source`, worker profile se filtra por usuario, se baja ruido de ping/reconexion y no reconecta mientras la pestana esta oculta.
- `app/admin/analytics/page.jsx`: realtime no dispara `fetchAll` en pestana oculta y refresca al volver a estar visible.

## Hallazgos criticos

### 1. iOS Safari puede trabarse en perfil, chat y pantallas full-screen

Archivos:
- `app/client/profile/page.jsx:137`
- `app/client/chat/[id]/page.jsx:484`
- `app/worker/page.jsx:2332`
- `app/auth/login/page.jsx:2207`
- `app/worker/onboard/page.jsx:989`

Riesgo:
- iOS cambia el alto disponible cuando aparece el teclado.
- `100vh`/`100dvh` + `fixed inset-0` + formularios puede dejar botones tapados o scroll bloqueado.
- En perfil, el guardado mezcla subida de avatar, cambio de email/password y update de profile en una sola accion. Si una llamada queda colgada, el usuario percibe "se traba".

Correccion recomendada:
- Usar una clase/hook comun de viewport real.
- Separar "guardar perfil" de "cambiar password/email".
- Poner timeout visible en uploads y auth.
- Revocar `URL.createObjectURL` en previews.

Estado: mitigado en `app/client/profile/page.jsx` para el perfil cliente. Pendiente replicar el mismo patron en perfiles trabajador/proveedor y onboarding.

Bloque base:

```js
export function withTimeout(promise, ms = 25000, label = 'Operacion') {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} tardo demasiado`)), ms);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
```

### 2. Realtime demasiado amplio puede causar renders y freezes

Archivos:
- `lib/realtimeCore.js:45`
- `lib/realtimeCore.js:56`
- `lib/realtimeCore.js:78`
- `lib/realtimeCore.js:85`
- `app/admin/analytics/page.jsx:1039`

Riesgo:
- `core-jobs` escucha todos los cambios de `jobs`.
- `core-messages` escucha todos los INSERT de `messages` y filtra en cliente.
- `core-profiles` escucha todos los cambios de `worker_profiles`.
- El ping de `realtimeCore` no mide realmente la conexion; actualiza `lastPing` localmente.
- Admin analytics abre muchos listeners y cada cambio dispara un `fetchAll` pesado.

Impacto:
- Samsung A series, Moto G, Redmi, Poco y iPhone SE pueden sentir tirones.
- En pestanas minimizadas, la app puede reconectar/refetch sin que el usuario mire.

Correccion recomendada:
- Filtrar realtime desde Supabase por `chat_id`, `worker_id`, `client_id` o `receiver_id` cuando sea posible.
- No refetchear analytics si `document.hidden`.
- Agrupar eventos y refrescar por seccion, no todo el tablero.

Estado: mitigado parcialmente. `worker_profiles` ya filtra por usuario y admin analytics evita refetch de fondo. Jobs sigue escuchando general para no romper pedidos abiertos por rubro.

Bloque recomendado:

```js
function scheduleVisibleRefresh(callback, delay = 900) {
  if (typeof document !== 'undefined' && document.hidden) return;
  clearTimeout(window.__manosyaRefreshTimer);
  window.__manosyaRefreshTimer = setTimeout(callback, delay);
}
```

### 3. Admin analytics es una pantalla pesada

Archivos:
- `app/admin/analytics/page.jsx:113`
- `app/admin/analytics/page.jsx:443`
- `app/admin/analytics/page.jsx:1073`
- `app/admin/analytics/page.jsx:1090`
- `app/admin/analytics/page.jsx:1139`

Riesgo:
- `OPERATIONS_LIMIT` esta en 1000.
- `fetchAll` hace muchas consultas y luego cruza jobs, profiles, chats, messages, reviews, posts, proveedores y page_views en el cliente.
- Recharts + tablas + realtime + muchos arrays pueden bloquear el hilo principal.

Correccion recomendada:
- Mover agregaciones a SQL views/RPC.
- Paginar la tabla operativa.
- Cargar secciones bajo demanda por tab.
- Desactivar realtime global cuando el tab no esta visible.

SQL/view recomendada:
- `admin_operational_jobs_view`
- `admin_worker_scores_view`
- `admin_client_scores_view`
- `admin_supplier_scores_view`
- `admin_business_daily_metrics`

### 4. Chat puede duplicar scroll y quedar tapado por teclado

Archivos:
- `app/client/chat/[id]/page.jsx:232`
- `app/client/chat/[id]/page.jsx:256`
- `app/client/chat/[id]/page.jsx:484`
- `app/client/chat/[id]/page.jsx:681`
- `components/ChatBox.jsx:72`

Riesgo:
- `scrollTo({ behavior: 'smooth' })` en cada mensaje puede pelear con el teclado.
- Chips + input + safe-area pueden ocupar demasiado en pantallas 320/360.
- Si el realtime duplica un mensaje y luego insert local tambien lo agrega, hay riesgo de reordenamientos.

Correccion recomendada:
- Usar scroll instantaneo si el teclado esta abierto.
- Mantener solo un componente de chat oficial.
- Agregar `padding-bottom` dinamico por `visualViewport`.

Estado: mitigado en `app/client/chat/[id]/page.jsx`. Pendiente replicar en chats legacy: `app/chat/[chatId]/page.jsx`, `app/job/[id]/chat/page.jsx` y chat modal de trabajador.

### 5. Video/feed: el riesgo principal es memoria, autoplay y red lenta

Archivos:
- `app/client/page.jsx:531`
- `app/client/page.jsx:555`
- `app/client/page.jsx:2140`
- `app/worker/feed/page.jsx:452`
- `app/worker/feed/page.jsx:2022`
- `app/supplier/page.jsx:70`
- `lib/mediaCache.js:103`
- `next.config.js:103`

Riesgo:
- Safari bloquea autoplay con sonido.
- Multiples videos `preload="auto"` compiten por red/memoria.
- El precache de videos podia descargar en segundo plano y trabar celulares.

Cambio aplicado:
- `lib/mediaCache.js` ahora evita cache en 2G, save-data y conexiones lentas.
- `next.config.js` redujo cache de videos.

Pendiente:
- Usar `preload="metadata"` por defecto y `auto` solo para el video activo.
- Pausar videos al abrir bottom sheets/modales.
- Agregar posters livianos.

### 6. Upload de video/foto sigue siendo sensible

Archivos:
- `app/worker/feed/page.jsx:2387`
- `app/worker/feed/page.jsx:2395`
- `app/worker/feed/page.jsx:2430`
- `app/worker/feed/page.jsx:2471`
- `app/client/profile/page.jsx:144`

Riesgo:
- `MediaRecorder` no existe o falla en iOS Safari.
- Videos de hasta 250MB pueden congelar el navegador al leer/optimizar/subir.
- Supabase upload no muestra progreso real.

Correccion recomendada:
- Limitar video movil recomendado a 80-120MB.
- Subir original si iOS no soporta compresion.
- Agregar timeout y estado "subiendo, no cierres".
- Para escalar: upload resumable/TUS o compresion server-side.

### 7. Mapas/GPS pueden agotar bateria y romperse con permisos

Archivos:
- `app/worker/route/[jobId]/page.jsx:61`
- `app/worker/route/[jobId]/page.jsx:84`
- `app/worker/route/[jobId]/page.jsx:111`
- `app/worker-route/page.jsx:65`
- `app/worker-route/page.jsx:88`
- `app/worker-route/page.jsx:115`
- `app/client/page.jsx:1766`
- `app/worker/feed/page.jsx:1456`

Riesgo:
- `watchPosition` con `enableHighAccuracy: true` puede drenar bateria.
- ORS se consulta cada 5 segundos.
- Hay llamadas directas a OpenRouteService desde cliente con `NEXT_PUBLIC_ORS_API_KEY`.
- Si GPS esta apagado, no hay fallback UX fuerte.

Correccion recomendada:
- Usar `/api/ors/route` desde cliente, no ORS directo.
- Throttle a 15-20s y no consultar si `document.hidden`.
- `maximumAge` y `timeout` obligatorios.

Estado: mitigado en rutas de trabajador principales.

Bloque recomendado:

```js
const GPS_OPTIONS = {
  enableHighAccuracy: false,
  maximumAge: 15000,
  timeout: 12000,
};
```

### 8. PWA/service worker puede dejar cache viejo

Archivo:
- `next.config.js:20`
- `next.config.js:101`

Riesgo:
- `skipWaiting: true` actualiza rapido, pero puede cambiar assets mientras el usuario esta en una sesion.
- CacheFirst en videos/mapas puede servir contenido viejo o llenar storage.

Cambio aplicado:
- Cache de videos reducido y versionado `feed-videos-v2`.

Pendiente:
- Agregar UI "Nueva version disponible".
- Limpiar caches viejos `feed-videos-v1`.

### 9. Build ignora errores de TypeScript y ESLint

Archivo:
- `next.config.js:124`
- `next.config.js:125`

Riesgo:
- Produccion puede compilar aun con errores que una auditoria profesional deberia bloquear.

Recomendacion:
- En rama de QA activar lint/typecheck como gate.
- Dejar una etapa de transicion si hoy hay deuda tecnica.

### 10. Z-index y modales tienen riesgo de superposicion

Archivos:
- `app/client/page.jsx:796`
- `app/client/page.jsx:964`
- `app/worker/feed/page.jsx:687`
- `app/worker/feed/page.jsx:852`
- `app/supplier/page.jsx:145`
- `app/admin/workers/page.jsx:1332`

Riesgo:
- Hay z-index muy altos (`66000`, `70000`).
- Bottom sheets y modales pueden taparse entre si.
- Sin body scroll lock comun, iOS puede scrollear el fondo.

Recomendacion:
- Crear `ModalLayer` unico con niveles: sheet 1000, modal 1100, media 1200, toast 1300.
- Bloquear scroll del body cuando un modal esta abierto.

## Pantallas mas fragiles

1. `app/worker/feed/page.jsx`: video, upload, geolocation, realtime, modales y scroll snap.
2. `app/client/page.jsx`: feed, mapa, chat list, bottom sheets, GPS.
3. `app/client/chat/[id]/page.jsx`: teclado, scroll, realtime, ubicacion.
4. `app/worker/page.jsx`: dashboard grande, chat modal, GPS, muchos effects.
5. `app/admin/analytics/page.jsx`: queries pesadas, realtime global, charts.
6. `app/worker/onboard/page.jsx`: camara, documentos, GPS, formularios largos.
7. `app/supplier/page.jsx`: reel + sheets + formularios.
8. `app/auth/login/page.jsx`: camara y `100vh` en flujo de auth.

## Dispositivos criticos

- iPhone SE: pantalla pequena, teclado tapa inputs, memoria baja.
- iPhone 11/12/13 Safari: autoplay, camera, `100vh`, `fixed`, upload.
- Samsung Galaxy A series: CPU/memoria moderada; feed y admin pueden trabarse.
- Xiaomi Redmi/Poco: ahorro de bateria puede pausar realtime/GPS.
- Motorola Moto G: performance en video/mapa.
- Huawei: navegador/PWA/storage/permisos pueden variar.
- Tecno/Infinix: pantallas 360px, bajo RAM, red inestable.

## Navegador vs riesgo

- Safari iOS: keyboard, camera, video autoplay, MediaRecorder, safe-area.
- Chrome Android: performance y memoria en feeds/video.
- Samsung Internet: video preload, PWA, permisos.
- Firefox Android: APIs media/geolocation mas estrictas.
- Edge/Chrome desktop: admin analytics, tablas, charts.
- Opera: PWA/cache y autoplay pueden variar.

## QA profesional recomendado

### Matriz minima real

Probar en:
- 320, 360, 375, 390, 414, 480, 768, 1024, 1366, 1920 px.
- iPhone SE, iPhone 11, iPhone 13, iPhone 15.
- Galaxy A, Galaxy S, Redmi/Poco, Moto G.
- Chrome Android, Safari iOS, Samsung Internet, Firefox Android, Chrome desktop, Edge.

### Flujos obligatorios

1. Login con cuenta existente.
2. Registro cliente/trabajador/proveedor.
3. Editar perfil y cambiar foto.
4. Cambiar password.
5. Abrir feed, ver 10 publicaciones, volver.
6. Subir foto.
7. Subir video corto y video pesado.
8. Abrir chat, mandar 10 mensajes, recibir realtime.
9. Abrir teclado y mandar mensaje con pantalla 320/360.
10. Compartir ubicacion.
11. Denegar GPS y volver a intentar.
12. Denegar camara y volver a intentar.
13. Mapa con red lenta.
14. Ruta trabajador-cliente durante 2 minutos.
15. Crear solicitud cliente.
16. Aceptar/cancelar/completar job.
17. Proveedor: editar perfil, publicar producto, CTA.
18. Admin analytics: abrir, cambiar tabs, dejar 5 minutos.
19. PWA instalada: abrir, cerrar, actualizar version.
20. Pestaña minimizada 2 minutos y volver.

### Red y sistema

Probar:
- Fast 3G, Slow 3G, offline/online.
- 1% bateria + ahorro de bateria.
- Rotacion vertical/horizontal.
- Zoom navegador 125% y 150%.
- Pantalla con teclado abierto.
- Permisos rechazados.

### Gates antes de escalar

- Build: `npm run build`.
- Lint: `npm run lint`.
- Lighthouse mobile en `/client`, `/worker/feed`, `/supplier`, `/auth/login`.
- Prueba manual iPhone Safari en perfil, chat, upload y camera.
- Prueba manual Android barato en feed y video.
- Revisar Supabase Realtime logs y consultas lentas.
- Medir errores JS con Sentry/LogRocket o similar.

## Backlog tecnico priorizado

P0:
- Timeout/progreso en perfil y uploads.
- Chat con teclado iOS usando visualViewport.
- Throttle GPS/ORS y mover ORS al API interno.
- Realtime filtrado por usuario/chat.

P1:
- Views SQL para analytics.
- Unificar ModalLayer.
- Reducir preload de videos.
- Activar lint/typecheck como gate.

P2:
- Test e2e Playwright mobile.
- Monitoring de errores.
- Limpieza de caches PWA antiguos.
- Imagenes optimizadas con tamaños definidos.
