# Learnings

One sentence per problem: what happened and why.

<!-- Example: - 2026-10-31 · pnpm was missing because Node 25+ no longer ships corepack. -->

- 2026-11-01 · Negalėjome push'inti tiesiai į `main`, nes GitHub branch protection to neleidžia, todėl pakeitimus įkėlėme į atskirą šaką, atidarėme PR, ir kai `check` užsidegė žaliai (kode nebuvo klaidų), sujungėme viską į `main`.
- 2026-11-01 · Į `DATABASE_URL_UNPOOLED` beveik įrašiau tą patį adresą kaip į `DATABASE_URL`, nes jie skiriasi tik `-pooler` dalimi host'o pavadinime, todėl tiesioginiam ryšiui (migracijoms) `-pooler` reikia pašalinti.
