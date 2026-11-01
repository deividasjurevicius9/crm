import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";

import * as schema from "@/db/schema";

// A real Postgres running in memory inside the test process, with every
// migration from ./drizzle applied: the same SQL production runs, no network.
export async function createTestDb() {
  const client = new PGlite();
  const db = drizzle({ client, schema });
  await migrate(db, { migrationsFolder: "drizzle" });
  return {
    db,
    close: () => client.close(),
  };
}
