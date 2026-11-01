# CRM projekto planas

> Mokomasis projektas pagal „AI Engineering mokymosi planą“ (mentorius Simas Ražinskas, 2026-10-31).
> Vartotojas (Deividas) kodo pats nerašo. Kodą rašo Claude, o jį veda per kiekvieną žingsnį.
> Šis failas gyvas: atnaujinamas kiekvieno etapo pabaigoje.

## Darbo taisyklės Claude'ui

1. **Prieš kiekvieną žingsnį** pasakyk, ką darysi ir kodėl.
2. **Kai yra pasirinkimas**, parodyk 3 variantus su pliusais ir minusais ir rekomenduok vieną. Renkasi Deividas. Sprendimą užrašyk į `docs/DECISIONS.md`.
3. **Rašyk kodą ir testus.** Testų eilučių turi būti ~2 kartus daugiau nei kodo.
4. **Po kiekvieno žingsnio** paleisk `pnpm check` ir parodyk rezultatą.
5. **Paaiškink, kaip tai veikia**, nurodydamas konkrečius failus ir eilutes. Aiškink plačiau, ne paprasčiau, su realiais terminais, be analogijų.
6. **Commit'ink** su aiškia žinute.
7. **Paprašyk Deivido** įrašyti problemą į `docs/LEARNINGS.md` vienu sakiniu: kas buvo ir kodėl.
8. **Python nenaudok.** `any` nenaudok. Taisyklių neišjunginėk, kad praeitų checkai: taisyk priežastį.
9. **Prieš kiekvieną merge** užduok Deividui 3–4 klausimus apie tą PR: kaip veikia, kur saugomi duomenys, kas vyksta paspaudus mygtuką. Merge tik tada, kai jis atsako savais žodžiais.

## Tikslas

Production-ready, multi-tenant CRM, veikiantis internete. Kodas GitHub'e, visi checkai žali.
Deividas be AI per 5 min. gali paaiškinti:

- kur saugomi duomenys;
- kas vyksta paspaudus „Save“;
- kaip kodas patenka į serverį.

## Apimtis

**Pagrindas**

- Organizacijos (multi-tenant).
- Rolės: owner, admin, member, viewer.
- Kvietimai el. paštu.
- Prisijungimas: el. paštas + slaptažodis, Google, el. pašto patvirtinimas, slaptažodžio atstatymas.

**CRM objektai**

- Įmonės ir kontaktai su ryšiais tarp jų.
- Sandoriai su konfigūruojamu pipeline: Kanban su drag & drop, vertė (EUR), tikimybė, laukiama uždarymo data.
- Užduotys: priskyrimas, terminai, „mano užduotys šiandien“.
- Veiklos laiko juosta: pastabos, skambučiai, susitikimai.
- Audit log: kas, ką ir kada pakeitė.

**Darbas su duomenimis**

- Lentelės su paieška, filtrais, rūšiavimu ir puslapiavimu (būsena saugoma URL'e).
- Globali paieška (Cmd+K).
- CSV importas ir eksportas.
- Dashboard: pipeline vertė pagal etapą, konversija, prognozė.

**AI**

- Kliento santrauka iš veiklos istorijos.
- Paieška natūralia kalba.
- Agentas su tool calling (sukuria užduotį, atnaujina sandorį). Prieš kiekvieną įrašą prašo patvirtinimo.

**UI kalba:** anglų (portfolio). Kodas visada angliškai.

## Technologijos (pradinės rekomendacijos)

Kiekvieną pasirinkimą perklausk prieš įgyvendinant: 3 variantai ir rekomendacija.

| Sluoksnis             | Pasirinkimas                                                                        |
| --------------------- | ----------------------------------------------------------------------------------- |
| Framework             | Next.js 16 (App Router, Server Components, Server Actions)                          |
| Kalba                 | TypeScript, griežčiausi nustatymai                                                  |
| Paketų valdymas       | pnpm                                                                                |
| DB                    | PostgreSQL per Neon                                                                 |
| ORM                   | Drizzle (+ drizzle-kit migracijos)                                                  |
| Autentifikacija       | Better Auth + organization plugin                                                   |
| Validacija            | Zod (formos, Server Actions, env kintamieji)                                        |
| UI                    | Tailwind CSS + shadcn/ui, TanStack Table, dnd-kit                                   |
| Testai                | Vitest (unit + integraciniai su PGlite), Playwright (e2e)                           |
| Kokybė                | ESLint (typescript-eslint strictTypeChecked + stylisticTypeChecked), Prettier, Knip |
| CI                    | GitHub Actions + pre-commit hook'ai                                                 |
| Hosting               | Vercel                                                                              |
| AI                    | Claude API per Vercel AI SDK                                                        |
| El. laiškai / klaidos | Resend / Sentry                                                                     |

## Kokybės vartai (nuo pirmo commit'o)

**tsconfig**

- `strict`
- `noUncheckedIndexedAccess`
- `exactOptionalPropertyTypes`
- `noImplicitOverride`
- `noPropertyAccessFromIndexSignature`
- `noFallthroughCasesInSwitch`
- `verbatimModuleSyntax`

**ESLint**

- `no-explicit-any: error`
- visos `no-unsafe-*`
- `ban-ts-comment`
- `switch-exhaustiveness-check`
- react-hooks, @next/next, jsx-a11y

**Testai**

- Coverage ≥ 90 % (lines ir branches).
- `scripts/test-ratio.ts`: suskaičiuoja testų ir šaltinio eilutes ir sustabdo CI, jei santykis < 2,0.
- Tenant izoliacijos testai kiekvienai duomenų prieigos funkcijai: organizacija A niekada nemato organizacijos B duomenų.

**Komanda `pnpm check`** paleidžia:

- typecheck
- lint
- knip
- test (su coverage)
- test-ratio
- build

**Automatika**

- CI paleidžia `pnpm check` ir Playwright po kiekvieno push'o.
- `main` šaka apsaugota: merge tik žaliai.

## Etapai

**E0 · Aplinka (~1 val.)**

- Node.js LTS, Git, pnpm (per corepack; nuo Node 25 corepack diegiamas atskirai: `npm i -g corepack`), GitHub CLI, `git config`.
- ✓ `node -v`, `pnpm -v` ir `git --version` veikia.

**E1 · Skeletas, vartai ir pirmas deploy (1 d.)**

- Next.js projektas, visi kokybės vartai, GitHub repo, CI, Vercel.
- ✓ Tuščias appsas veikia internete.
- ✓ CI žalias.
- ✓ Deividas gali paaiškinti kelią kodas → GitHub → Vercel.

**E2 · DB, prisijungimas, organizacijos (1 d.)**

- Neon, Drizzle schema, migracijos, Better Auth, rolės, kvietimai (Resend), apsaugoti maršrutai.
- ✓ Production'e: registracija, organizacijos sukūrimas, antro vartotojo pakvietimas.

**E3 · Įmonės ir kontaktai (1 d.)**

- CRUD, lentelės (paieška, filtrai, rūšiavimas, puslapiavimas URL'e), detalės puslapiai, soft delete, indeksai.

**E4 · Sandoriai, pipeline, užduotys (1 d.)**

- Konfigūruojami etapai, Kanban su optimistic UI, transakcijos, užduotys su terminais.

**E5 · Veikla, ataskaitos, importas (1 d.)**

- Laiko juosta, audit log, dashboard (agregacijos), CSV importas ir eksportas, Cmd+K (Postgres full-text).

**E6 · AI (1 d.)**

- Santraukos, paieška natūralia kalba, agentas su tool calling ir patvirtinimu.
- AI testai su mock'intu modeliu.
- Reikia atskiro Claude API rakto (console.anthropic.com).

**E7 · Production-ready (½–1 d.)**

- Sentry, rate limiting, security headers (CSP), seed demo duomenys, DB backup'ai, README.md, ARCHITECTURE.md.
- ✓ Appsas pasiekiamas per nuorodą.
- ✓ `pnpm check` be klaidų.
- ✓ 5 min. paaiškinimas be AI.
- ✓ ≥ 3 išspręstos problemos `docs/LEARNINGS.md`.

## Dokumentai repo

- `docs/PLAN.md`: šis failas.
- `docs/DECISIONS.md`: kiekvienas sprendimas, jo variantai ir kodėl pasirinktas būtent šis.
- `docs/LEARNINGS.md`: problemų žurnalas, vienu sakiniu kiekviena.

## Būsena

- [x] E0 · [x] E1 · [ ] E2 · [ ] E3 · [ ] E4 · [ ] E5 · [ ] E6 · [ ] E7
