import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { getAuth } from "./auth";

// Data Access Layer for "who is signed in". Every protected page and action
// asks here; the session is checked against the database, not just the cookie.

export interface CurrentUser {
  readonly id: string;
  readonly name: string;
  readonly email: string;
}

// cache(): several components in one render ask once, not once each.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  // headers() first: it marks this render as request-time, so `next build`
  // stops prerendering here before getAuth() would need the secret and DB.
  const requestHeaders = await headers();
  const session = await getAuth().api.getSession({ headers: requestHeaders });
  if (session === null) return null;
  // Only the fields the UI needs, never the raw session or token.
  const { id, name, email } = session.user;
  return { id, name, email };
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (user === null) redirect("/sign-in");
  return user;
}
