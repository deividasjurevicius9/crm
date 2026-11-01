import type { Metadata } from "next";
import { Suspense } from "react";

import { Welcome } from "./welcome";

export const metadata: Metadata = { title: "Dashboard · CRM" };

// The page shell is static; only the part that reads the session waits for the
// request (Cache Components: reading cookies outside <Suspense> is an error).
export default function DashboardPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-16">
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <Welcome />
      </Suspense>
    </main>
  );
}
