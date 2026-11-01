import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { getServerEnv } from "@/env";

import { resolveAuthOrigins } from "./auth-origins";

// Any Drizzle Postgres database: Neon via `pg` in the app, PGlite in tests.
type AuthDatabase = Parameters<typeof drizzleAdapter>[0];

interface CreateAuthOptions {
  readonly db: AuthDatabase;
  // Signs session cookies and tokens; at least 32 random characters.
  readonly secret: string;
  // Public origin of the app, e.g. https://crm-nu-tawny-81.vercel.app
  readonly baseURL: string;
  // Other origins of the same deployment allowed to call the auth API.
  readonly trustedOrigins?: readonly string[];
}

// A factory instead of a module-level instance: tests pass an in-memory
// database, the app passes the real one, and importing this file never
// connects to anything.
export function createAuth({
  db,
  secret,
  baseURL,
  trustedOrigins = [],
}: CreateAuthOptions) {
  return betterAuth({
    appName: "CRM",
    secret,
    baseURL,
    trustedOrigins: [...trustedOrigins],
    database: drizzleAdapter(db, {
      provider: "pg",
      schema,
      // Multi-step writes (create user + credential account) succeed or fail together.
      transaction: true,
    }),
    emailAndPassword: { enabled: true },
    advanced: {
      // Better Auth turns the Origin (CSRF) check off when NODE_ENV is "test".
      // Pin it on, so tests exercise exactly what production runs.
      disableOriginCheck: false,
    },
    // Lets auth.api calls inside Server Actions set the session cookie on the
    // response. Must stay the last plugin.
    plugins: [nextCookies()],
  });
}

let instance: ReturnType<typeof createAuth> | undefined;

// The app's Better Auth instance: created on first use from the validated
// environment, then reused for the life of the server instance.
export function getAuth() {
  if (instance === undefined) {
    const env = getServerEnv();
    instance = createAuth({
      db: getDb(),
      secret: env.BETTER_AUTH_SECRET,
      ...resolveAuthOrigins(env),
    });
  }
  return instance;
}
