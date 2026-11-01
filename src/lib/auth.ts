import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import * as schema from "@/db/schema";

// Any Drizzle Postgres database: Neon via `pg` in the app, PGlite in tests.
type AuthDatabase = Parameters<typeof drizzleAdapter>[0];

interface CreateAuthOptions {
  readonly db: AuthDatabase;
  // Signs session cookies and tokens; at least 32 random characters.
  readonly secret: string;
  // Public origin of the app, e.g. https://crm-nu-tawny-81.vercel.app
  readonly baseURL: string;
}

// A factory instead of a module-level instance: tests pass an in-memory
// database, the app (next step) passes the real one, and importing this file
// never connects to anything.
export function createAuth({ db, secret, baseURL }: CreateAuthOptions) {
  return betterAuth({
    appName: "CRM",
    secret,
    baseURL,
    database: drizzleAdapter(db, {
      provider: "pg",
      schema,
      // Multi-step writes (create user + credential account) succeed or fail together.
      transaction: true,
    }),
    emailAndPassword: { enabled: true },
  });
}
