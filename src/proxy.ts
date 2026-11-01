import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

// Optimistic first line of defence: runs before every matched request and only
// looks at whether a session cookie exists (no database call). The real check
// is requireUser() in the page itself, which verifies the session in the DB.
//
// Signed-in users are deliberately NOT redirected away from /sign-in here: a
// cookie can exist for an expired session, and that would loop
// /sign-in → /dashboard → /sign-in.

export function proxy(request: NextRequest) {
  if (getSessionCookie(request) === null) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard", "/dashboard/:path*"],
};
