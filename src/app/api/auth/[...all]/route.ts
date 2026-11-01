import { getAuth } from "@/lib/auth";

// Every Better Auth endpoint (/api/auth/sign-in/email, /api/auth/get-session,
// ...) is served by this one catch-all route. getAuth() runs per request, so
// `next build` never needs the database or the secret.

export function GET(request: Request): Promise<Response> {
  return getAuth().handler(request);
}

export function POST(request: Request): Promise<Response> {
  return getAuth().handler(request);
}
