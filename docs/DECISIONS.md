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

## 2026-11-01 · E2 · Authentication

- **Options:** (1) Better Auth, (2) Auth.js (NextAuth v5), (3) Clerk.
- **Chosen:** Better Auth with the Drizzle adapter and the `organization` plugin.
- **Why:** Email + password, email verification, password reset, Google OAuth, organizations, roles and invitations are built in, and every user, session and membership row lives in our own Postgres, so tenant isolation can be tested with PGlite and "where is the data stored" has one answer. Auth.js discourages password sign-in and has no organizations; Clerk keeps users on its servers and adds vendor lock-in. Cost: younger project with frequent releases; the `viewer` role is added on top of the plugin's default owner/admin/member.

## 2026-11-01 · E2 · esbuild install script

- **Options:** (1) deny (`esbuild: false`), (2) allow (`esbuild: true`), (3) leave unanswered.
- **Chosen:** deny.
- **Why:** Install scripts run arbitrary package code on the machine and are a common supply-chain attack vector. esbuild's script only verifies the platform binary, which pnpm already installs as an optional dependency; `drizzle-kit --version` works without it. Leaving it unanswered would fail CI.

## 2026-11-01 · E2 · Database for preview deployments

- **Options:** (1) a Neon branch per preview deployment, (2) one shared `preview` branch, (3) the production database.
- **Chosen:** a Neon branch per preview deployment, created by the Vercel ↔ Neon integration from `main`.
- **Why:** Until now `DATABASE_URL` had one value for Preview and Production, so every PR preview used the production database: sign-ups on a preview landed in production, and a deploy-time migration from an unmerged PR would change the production schema before review. Per-deployment branches give each PR its own copy and only merged code touches production. Cost: Free plan branch limit (~10 at a time), slightly slower first preview build.

## 2026-11-01 · E2 · Running migrations on deploy

- **Options:** (1) in the Vercel build (`vercel-build` script), (2) a GitHub Actions job after merge, (3) manually from the laptop.
- **Chosen:** Vercel build: `drizzle-kit migrate && next build`.
- **Why:** One mechanism for every environment: each preview migrates its own Neon branch, production migrates only after a merge to `main`, and the production URL never leaves Vercel. A failed migration fails the build, so the new code is not released. Cost: if the migration succeeds and the build then fails, the schema is already changed. **Rule:** every migration must be backwards compatible with the code currently running (expand → contract: add first, remove in a later PR once no code uses it).

## 2026-11-01 · E2 · UI components

- **Options:** (1) shadcn/ui, (2) hand-written Tailwind components, (3) a packaged library (Mantine, HeroUI).
- **Chosen:** shadcn/ui.
- **Why:** The component source is copied into `src/components/ui/`, so it is ours to read and change; built on Radix primitives, so focus handling and ARIA are solved (our lint enforces `jsx-a11y` strict); provides the tables, dialogs and command palette needed in E3–E5. Cost: a lot of committed code we did not write.

## 2026-11-01 · E2 · How forms submit

- **Options:** (1) Server Actions, (2) Better Auth client in the browser, (3) plain HTML POST to `/api/auth`.
- **Chosen:** Server Actions calling `auth.api.*`, with the `nextCookies` plugin setting the session cookie.
- **Why:** Validation runs on the server with Zod (the only validation an attacker cannot skip), forms work without JavaScript, errors show next to fields via `useActionState`, and it is the same form → action → validation → database path every CRM "Save" will use. Cost: a little more server code than calling the client SDK.
