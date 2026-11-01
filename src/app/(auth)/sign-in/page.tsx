import type { Metadata } from "next";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";

import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Sign in · CRM" };

export default function SignInPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <h1 className="text-lg font-semibold">Sign in</h1>
          <CardDescription>Welcome back.</CardDescription>
        </CardHeader>
        <CardContent>
          <SignInForm />
        </CardContent>
        <CardFooter className="text-sm text-muted-foreground">
          No account yet?&nbsp;
          <Link href="/sign-up" className="text-foreground underline">
            Create one
          </Link>
        </CardFooter>
      </Card>
    </main>
  );
}
