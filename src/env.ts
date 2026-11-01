import "server-only";
import { z } from "zod";

// Server-side environment variables. `server-only` makes the build fail if this
// file is ever imported into browser code, so secrets cannot leak to the client.

const postgresUrl = z.url({
  protocol: /^postgres(ql)?$/,
  error: "must be a postgres:// or postgresql:// URL",
});

// Vercel system variables hold bare hostnames ("crm-abc.vercel.app").
const hostname = z
  .string()
  .regex(/^[a-z0-9.-]+$/i, "must be a bare hostname without scheme or path");

const serverEnvSchema = z.object({
  DATABASE_URL: postgresUrl,
  // Signs session cookies and tokens. Changing it signs every user out.
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, "must be at least 32 characters (use 32 random bytes)"),
  // Explicit public origin; optional because on Vercel it is derived from the
  // system variables below and locally it defaults to http://localhost:3000.
  BETTER_AUTH_URL: z.url({ protocol: /^https?$/ }).optional(),
  // Set by Vercel on every deployment.
  VERCEL_ENV: z.enum(["production", "preview", "development"]).optional(),
  VERCEL_URL: hostname.optional(),
  VERCEL_BRANCH_URL: hostname.optional(),
  VERCEL_PROJECT_PRODUCTION_URL: hostname.optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

type EnvSource = Readonly<Record<string, string | undefined>>;

// Vercel and .env files may define a variable as an empty string; treat that
// as "not set" so optional variables stay optional.
function withoutEmpty(source: EnvSource): EnvSource {
  return Object.fromEntries(
    Object.entries(source).filter(([, value]) => value !== ""),
  );
}

// The error lists variable names and rules only, never the values: a
// connection string contains the database password.
export function parseServerEnv(source: EnvSource): ServerEnv {
  const result = serverEnvSchema.safeParse(withoutEmpty(source));
  if (!result.success) {
    throw new Error(
      `Invalid environment variables:\n${z.prettifyError(result.error)}`,
    );
  }
  return result.data;
}

let cached: ServerEnv | undefined;

// Lazy: validated on first use, not on import, so `next build` works in CI
// where no database URL is configured.
export function getServerEnv(): ServerEnv {
  cached ??= parseServerEnv(process.env);
  return cached;
}
