import "server-only";
import { z } from "zod";

// Server-side environment variables. `server-only` makes the build fail if this
// file is ever imported into browser code, so secrets cannot leak to the client.

const postgresUrl = z.url({
  protocol: /^postgres(ql)?$/,
  error: "must be a postgres:// or postgresql:// URL",
});

const serverEnvSchema = z.object({
  DATABASE_URL: postgresUrl,
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

type EnvSource = Readonly<Record<string, string | undefined>>;

// The error lists variable names and rules only, never the values: a
// connection string contains the database password.
export function parseServerEnv(source: EnvSource): ServerEnv {
  const result = serverEnvSchema.safeParse(source);
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
