# CRM

Multi-tenant CRM built with Next.js 16 and TypeScript. Learning project: see
[docs/PLAN.md](docs/PLAN.md) for the plan, [docs/DECISIONS.md](docs/DECISIONS.md)
for technical decisions and [docs/LEARNINGS.md](docs/LEARNINGS.md) for the problem log.

## Requirements

- Node.js 26 (see `.node-version`)
- pnpm via corepack: `npm i -g corepack && corepack enable pnpm`

## Commands

| Command           | What it does                                                          |
| ----------------- | --------------------------------------------------------------------- |
| `pnpm dev`        | Development server on http://localhost:3000                           |
| `pnpm check`      | All quality gates: typecheck, lint, format, knip, tests, ratio, build |
| `pnpm test`       | Unit tests with coverage (≥ 90 % lines and branches)                  |
| `pnpm test:e2e`   | Playwright end-to-end tests                                           |
| `pnpm test:ratio` | Fails if test lines / source lines < 2.0                              |
| `pnpm format`     | Format all files with Prettier                                        |
