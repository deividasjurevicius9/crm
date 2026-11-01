import "server-only";
import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { getServerEnv } from "@/env";

export function createDb(connectionString: string) {
  const pool = new Pool({
    connectionString,
    // Close idle connections quickly: serverless instances come and go, and
    // Neon limits concurrent connections.
    idleTimeoutMillis: 5_000,
    // A Neon compute waking up from idle takes ~0.5 s; fail after 10 s.
    connectionTimeoutMillis: 10_000,
  });

  // Without a listener, an error on an idle connection (e.g. Neon closing it)
  // is an unhandled 'error' event and crashes the whole process.
  pool.on("error", (error) => {
    console.error("Postgres pool error on an idle connection:", error.message);
  });

  // On Vercel Fluid compute: keep the instance alive until idle connections
  // are released, so they are not left open when the instance is suspended.
  attachDatabasePool(pool);

  return drizzle({ client: pool });
}

let db: ReturnType<typeof createDb> | undefined;

// Lazy, one pool per server instance: created on the first query.
export function getDb() {
  db ??= createDb(getServerEnv().DATABASE_URL);
  return db;
}
