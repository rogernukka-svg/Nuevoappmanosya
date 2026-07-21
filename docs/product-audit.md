# ManosYA Premium Product Audit

## Decision

Build `manosya-premium` as a clean app inside this workspace and keep the previous project as reference. The old repo has real value, but its biggest pages mix product, UI, Supabase queries, media handling, chat and admin operations in single files.

## Keep

- Supabase Auth users.
- Core routes for client, worker, supplier, admin, founder, jobs, chat and DMs.
- Existing API surface for hosting compatibility.
- Worker feed concept, chat, reviews, likes, comments, provider marketplace and admin worker review.
- Brand direction from the supplied assets: mint/teal field, black `Manos`, white `YA`.

## Rebuild

- Login and register as separate routes.
- App shell with fixed viewport and no global body scroll.
- Feed as the only primary vertical scroll.
- Admin pages as internal scroll panels.
- Supabase access through small `lib` modules.
- CSS tokens and component primitives instead of page-local styling.

## Leave Out Of MVP

- Test routes.
- Duplicate legal/founder routes.
- Recruitment, billing, padron and signature pages until they are productized.
- Android/TWA until the web app is stable.

## Product North Star

ManosYA is the social operating system for local work: a client should find trust fast, a worker should turn proof into income, and a supplier should reach the people already acting inside the job flow.
