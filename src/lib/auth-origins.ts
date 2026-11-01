import type { ServerEnv } from "@/env";

export interface AuthOrigins {
  // The origin Better Auth uses for redirects and links in emails.
  readonly baseURL: string;
  // Origins allowed to call the auth API (checked against the Origin header,
  // which is what protects sign-in forms from cross-site request forgery).
  readonly trustedOrigins: readonly string[];
}

const LOCAL_ORIGIN = "http://localhost:3000";

type OriginEnv = Pick<
  ServerEnv,
  | "BETTER_AUTH_URL"
  | "VERCEL_ENV"
  | "VERCEL_URL"
  | "VERCEL_BRANCH_URL"
  | "VERCEL_PROJECT_PRODUCTION_URL"
>;

function https(host: string | undefined): string | undefined {
  return host === undefined ? undefined : `https://${host}`;
}

function primaryOrigin(env: OriginEnv): string {
  if (env.BETTER_AUTH_URL !== undefined) {
    return new URL(env.BETTER_AUTH_URL).origin;
  }
  switch (env.VERCEL_ENV) {
    case "production":
      return (
        https(env.VERCEL_PROJECT_PRODUCTION_URL) ??
        https(env.VERCEL_URL) ??
        LOCAL_ORIGIN
      );
    case "preview":
      return (
        https(env.VERCEL_BRANCH_URL) ?? https(env.VERCEL_URL) ?? LOCAL_ORIGIN
      );
    case "development":
    case undefined:
      return LOCAL_ORIGIN;
  }
}

// One deployment is reachable under several Vercel hostnames (the unique
// deployment URL, the branch URL, the production domain); every one of them
// that belongs to this deployment is trusted, nothing else is.
export function resolveAuthOrigins(env: OriginEnv): AuthOrigins {
  const baseURL = primaryOrigin(env);
  const candidates = [
    baseURL,
    https(env.VERCEL_URL),
    https(env.VERCEL_BRANCH_URL),
    env.VERCEL_ENV === "production"
      ? https(env.VERCEL_PROJECT_PRODUCTION_URL)
      : undefined,
  ];
  const trustedOrigins = [
    ...new Set(candidates.filter((origin) => origin !== undefined)),
  ];
  return { baseURL, trustedOrigins };
}
