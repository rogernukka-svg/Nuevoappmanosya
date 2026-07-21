# ManosYA Premium

Clean premium rebuild of ManosYA.

## What This Keeps

- Next.js App Router.
- Supabase Auth users.
- Central ManosYA routes.
- API surface required by the current hosting/integration setup.
- Founder page, client flow, worker feed, supplier marketplace and admin dashboards.

## What This Changes

- `/login` and `/register` are separate.
- The app uses a fixed `100dvh` shell.
- The body does not scroll globally.
- Only feed, chat, lists, admin panels and bottom sheets scroll internally.
- Pages are small and use reusable components.
- Brand color follows the supplied ManosYA mint assets.

## Setup

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and fill Supabase keys.

## Supabase

Start with `supabase/001_premium_core.sql`.

Do not delete `auth.users` if you want to keep existing users. The new schema references existing auth IDs through `public.profiles.id`.

## Current Status

- Build passes.
- Auth forms are wired to Supabase when env vars exist.
- `/api/workers` reads `worker_feed_view` when Supabase env vars exist.
- ORS and Meta endpoints preserve the route surface and are ready for production hardening.
- UI uses internal scroll containers and keeps the body locked.

## Routes

- `/`
- `/login`
- `/register`
- `/auth/callback`
- `/client`
- `/client/new`
- `/client/jobs`
- `/client/profile`
- `/worker/feed`
- `/worker/jobs`
- `/worker/map`
- `/worker/onboard`
- `/supplier`
- `/admin`
- `/admin/workers`
- `/admin/analytics`
- `/fundador`
- `/job/[id]`
- `/job/[id]/chat`
- `/chat/[chatId]`
- `/dm`
- `/dm/[id]`
- `/legal/privacy`
- `/legal/terms`
