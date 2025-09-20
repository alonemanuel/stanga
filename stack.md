# Stanga — Technology Stack (SST)

Goal: 100% free to build/run on hobby scale. Prioritize simplicity, DX, and mobile performance.

## Frontend

- Framework: Next.js (React, App Router)
  - Reason: great DX, file‑based routing, server and client components, image/font optimization
- UI: Tailwind CSS + Radix UI primitives + shadcn/ui components
  - Reason: fast, accessible, consistent theming; copy‑in components avoid vendor lock‑in
- State/Data: React Query (TanStack Query) for client caching; minimal global state via React Context
- Forms: React Hook Form + Zod schemas
- Theming: CSS variables with Tailwind; system light/dark; user toggle

## Backend

- Next.js API routes and/or server actions (no separate server needed)
- Runtime: Vercel Serverless/Edge (free tier)
- Real‑time: optional via Pusher Channels (free dev) or Supabase Realtime (if DB is Supabase)

## Database & Storage (free tier friendly)

Choose one of:
- Neon Postgres (free tier) + Drizzle ORM
- Supabase Postgres (free tier) + Drizzle ORM

Reason: relational fits stats/joins well; both offer generous free tiers and easy auth integration patterns.

Backups/Exports: periodic SQL dumps via GitHub Actions (on demand/manual) to GitHub Releases.

## Auth

- Auth.js (NextAuth) with Google OAuth and Email (magic link)
  - Adapter: JWT (no DB) for MVP or Prisma/Drizzle adapter if we want sessions persisted
  - Provider costs: Google OAuth free for low volume; email magic link via Resend free dev tier or SMTP (Gmail)

## DevOps & Hosting

- Hosting: Vercel Hobby (frontend + API)
- DB: Neon or Supabase free instances
- DNS/Proxy/CDN: Vercel built‑in; optional Cloudflare free
- CI/CD: GitHub Actions (lint, typecheck, tests, deploy)

## Libraries

- ORM: Drizzle ORM (type‑safe SQL, schema in code, migrations)
- Validation: Zod
- Date/time: Day.js or date‑fns
- Charts: Tremor or Recharts (free)
- Testing: Vitest + React Testing Library
- DnD: dnd-kit (free, accessible) for formations and team assignment

## Data Model (high‑level mapping)

- users (Auth.js identification)
- players
- matchdays
- teams
- team_assignments
- formations stored on `teams.formation_json` with slot coordinates and optional labels
- games
- game_events
- penalty_shootouts
- activity_log

Indexes: player name, matchday date, game matchday_id, game_events game_id, activity created_at.

## Environments

- Local: .env.local with OAuth keys; use local Neon/Supabase project
- Preview: Vercel preview per PR
- Prod: main branch auto‑deploy

### Local prerequisites

- Node.js: >= 20 LTS (Next 15 and shadcn CLI require >=18.18; recommend 20+)
- Package manager: npm (default). pnpm optional.
- Node version manager recommended: nvm or fnm

## Costs (as of 2025, typical free tiers)

- Vercel Hobby: free; limits on serverless/edge invocations
- Neon/Supabase: free Postgres instance; row/storage/connection caps
- Resend dev tier or SMTP for email links: free for low volume

## Telemetry

- Basic server logs via Vercel; optional Vercel Analytics (free basic)

## Migration/Seeding

- Drizzle kit migrations committed to repo
- Seed script for demo data (players, teams)

## Security

- Public read: SSR/ISR routes may fetch without session; mutations require auth middleware
- RLS (if Supabase) or application‑level checks on API routes; session required for writes
- Soft delete fields (`deleted_at`, `deleted_by`) across core tables; default scopes exclude deleted
- Audit via activity_log table

## Penalties & Stats Logic

- Store `penalty_shootouts` and per‑kick `penalty_kicks` rows (order, result)
- Stats weighting: regulation/extra‑time wins count as 1.0; penalty wins count as `rules.penalty_win_weight` (default 0.5)
- Points: `rules.points` map drives standings (loss=0, draw=1, penalty bonus win=+1, regulation win=3 by default)

## Alternative All‑Cloudflare Path (optional)

- Cloudflare Pages + Workers (free), D1 (SQLite) + Drizzle; CF Access/Turnstile; good if we want fully CF stack.


