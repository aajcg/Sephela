# Sephela Frontend — Analyst Dashboard

Next.js 14 (App Router) + TypeScript + TailwindCSS. Phase 3: the reusable
dashboard framework. **No malware visualization yet** — risk/findings views land
with Phases 8–9.

## What's here
- **App Router** with route groups: `(auth)` (login) and `(dashboard)`
  (dashboard, upload, tasks, reports) + client-side `AuthGuard`.
- **API abstraction** (`src/lib/api`) — single typed `fetch` client that injects
  the bearer token and normalizes RFC 9457 Problem Details into `ApiError`.
  Contract types in `api/types.ts` (later generated from `contracts/openapi`).
- **State management** — TanStack Query (server state, polling for live jobs) +
  Zustand (`auth-store`, persisted). Hooks in `src/lib/hooks`.
- **UI primitives** (`src/components/ui`) — Button, Card, Input, StatusBadge,
  PageHeader, and shared Loading/Error/Empty states.
- **Responsive shell** — collapsing sidebar + topbar; Tailwind design tokens with
  light/dark via CSS variables.
- **Error handling & loading states** — `global-error.tsx`, route `loading.tsx`,
  per-view feedback components, and no-retry-on-4xx query policy.

## Run
```bash
cd frontend
cp .env.example .env.local        # BACKEND_URL=http://localhost:8000
npm install
npm run dev                       # http://localhost:3000
```
API calls to `/api/*` are proxied to the backend via `next.config.mjs` rewrites.

## Scripts
- `npm run dev` / `build` / `start`
- `npm run typecheck` — `tsc --noEmit`
- `npm run lint`

## Layout
```
src/
  app/
    (auth)/login/           # login page + auth shell
    (dashboard)/            # guarded: dashboard, upload, tasks/[id], reports/[id]
    layout.tsx, page.tsx, global-error.tsx
  components/
    ui/                     # design-system primitives
    features/               # sidebar, topbar, auth-guard, job-list
  lib/
    api/                    # client, endpoints, types
    hooks/                  # use-auth, use-jobs
    state/                  # auth-store (zustand)
    providers.tsx, utils.ts
  styles/globals.css        # tailwind + design tokens
```

## Notes
- Auth pairs with the backend placeholder: login stores the JWT; every request
  carries it; a 401 clears the session and bounces to `/login`.
- Report/task pages are framework shells wired to the job API; the malware-specific
  content is intentionally deferred to later phases.
