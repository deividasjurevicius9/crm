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
