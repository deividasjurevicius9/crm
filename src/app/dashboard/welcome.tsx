import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/session";

import { signOutAction } from "../(auth)/actions";

export async function Welcome() {
  // Real check against the database; redirects to /sign-in when signed out.
  const user = await requireUser();

  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">
        Welcome, {user.name}
      </h1>
      <p className="text-muted-foreground">Signed in as {user.email}</p>
      <form action={signOutAction}>
        <Button type="submit" variant="outline">
          Sign out
        </Button>
      </form>
    </>
  );
}
