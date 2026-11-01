import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-4 px-6 py-24">
      <h1 className="text-4xl font-semibold tracking-tight">CRM</h1>
      <p className="text-lg text-zinc-600 dark:text-zinc-400">
        Multi-tenant CRM for companies, contacts, deals and tasks.
      </p>
      <p className="text-sm text-zinc-500">Under construction.</p>
      <nav aria-label="Account" className="flex gap-3">
        <Button asChild>
          <Link href="/sign-up">Create account</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/sign-in">Sign in</Link>
        </Button>
      </nav>
    </main>
  );
}
