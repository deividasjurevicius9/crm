# Decisions

Each decision: the options considered, the choice, and why.

## 2026-10-31 · E0 · How to install pnpm

- **Options:** (1) corepack installed via npm, (2) `npm i -g pnpm`, (3) standalone pnpm via winget.
- **Chosen:** corepack via npm.
- **Why:** Since Node 25, corepack is no longer bundled with Node. With corepack, the exact pnpm version is pinned in `package.json` → `packageManager`, and the same version runs locally, in CI and on Vercel, so the lockfile stays identical everywhere.

## 2026-10-31 · E1 · Framework

- **Options:** (1) Next.js 16, (2) TanStack Start, (3) React Router v7.
- **Chosen:** Next.js 16 (App Router).
- **Why:** Server Components + Server Actions keep frontend and backend in one project; largest ecosystem; native Vercel support. Cost: more implicit behaviour (caching, RSC boundaries) to learn.

## 2026-10-31 · E1 · Lint and formatting

- **Options:** (1) ESLint + Prettier, (2) Biome, (3) Oxlint + ESLint + Prettier.
- **Chosen:** ESLint + Prettier.
- **Why:** Only ESLint has type-aware rules (`typescript-eslint` `strictTypeChecked`: `no-unsafe-*`, `switch-exhaustiveness-check`) plus `react-hooks`, `@next/next`, `jsx-a11y`, which the quality gates require. Biome is faster but cannot enforce those rules.

## 2026-10-31 · E1 · Unit and integration tests

- **Options:** (1) Vitest, (2) Jest, (3) `node:test`.
- **Chosen:** Vitest (+ React Testing Library, Playwright for e2e).
- **Why:** Native TypeScript/ESM, built-in v8 coverage with thresholds, works with PGlite for DB tests later. Async Server Components are covered by Playwright e2e instead.

## 2026-10-31 · E1 · Hosting

- **Options:** (1) Vercel, (2) Cloudflare via OpenNext, (3) Railway / Fly.io with Docker.
- **Chosen:** Vercel.
- **Why:** Built by the Next.js team, zero config, preview URL for every PR, free Hobby plan. Cost: Hobby is non-commercial only; vendor lock-in if the app grows.

## 2026-10-31 · E1 · Git hooks

- **Options:** (1) Lefthook, (2) Husky + lint-staged, (3) simple-git-hooks.
- **Chosen:** Lefthook.
- **Why:** One YAML file, jobs run in parallel, `{staged_files}` filter built in (no lint-staged needed).

## 2026-10-31 · E1 · Repository visibility

- **Options:** (1) public, (2) private.
- **Chosen:** public.
- **Why:** Portfolio project; branch protection on `main` is free only for public repos. Secrets live only in environment variables, never in the repo.

## 2026-11-01 · E2 · Database hosting

- **Options:** (1) Neon, (2) Supabase, (3) Railway.
- **Chosen:** Neon (serverless Postgres).
- **Why:** Free tier, native Vercel integration that injects the connection string as an env variable, and instant database branches so preview deployments can use their own copy instead of production data. Cost: the first query after ~5 min idle is slower (~0.5 s) while the compute wakes up. Supabase was rejected because its built-in auth duplicates Better Auth and free projects pause after 7 days idle; Railway has no free tier and no branching.

## 2026-11-01 · E2 · Local development database

- **Options:** (1) separate Neon branch `dev`, (2) the production database, (3) local Postgres in Docker.
- **Chosen:** Neon branch `dev`; its connection string lives in `.env.development.local` (git-ignored).
- **Why:** Same Postgres engine and version as production with nothing to install, and local experiments or failed migrations never touch production data; the branch can be reset in seconds. The Vercel integration deliberately leaves the Development environment empty, so `vercel env pull` cannot leak the production URL to the laptop. Automated tests use PGlite in memory instead, so they need no network. Cost: local work needs internet.

## 2026-11-01 · E2 · ORM and migrations

- **Options:** (1) Drizzle + drizzle-kit, (2) Prisma, (3) Kysely.
- **Chosen:** Drizzle ORM with drizzle-kit migrations.
- **Why:** Schema is plain TypeScript (no second language, no generate step), queries read almost like the SQL they produce, so the path from "Save" to a database row stays visible. Works directly with PGlite for in-memory integration tests and has an official Better Auth adapter. Cost: younger than Prisma; rare features (some index types) need hand-written SQL in a migration.

## 2026-11-01 · E2 · Postgres driver

- **Options:** (1) `pg` (node-postgres) over TCP, (2) Neon serverless driver over HTTP, (3) Neon serverless driver over WebSocket.
- **Chosen:** `pg` with a connection pool, connecting through the Neon pooler.
- **Why:** Supports interactive transactions (needed in E4 for Kanban moves), is the standard Node.js Postgres driver and is not tied to Neon. On Vercel Fluid compute a function instance serves many requests, so pooled TCP connections are reused. The HTTP driver was rejected because it cannot run interactive transactions. Cost: the pool must be configured correctly for serverless (small size, idle timeout).

## 2026-11-01 · E2 · Environment variable validation

- **Options:** (1) own Zod schema in `src/env.ts`, (2) `@t3-oss/env-nextjs`, (3) no validation.
- **Chosen:** own Zod schema, guarded with `import "server-only"`.
- **Why:** ~20 readable lines, one dependency fewer; the app fails at startup with a clear message instead of later with an obscure one, and every variable gets a precise type instead of `string | undefined`. `server-only` makes the build fail if the file is ever imported into browser code, so secrets cannot leak to the client. Cost: client-side (`NEXT_PUBLIC_`) variables will need their own schema when they appear.
