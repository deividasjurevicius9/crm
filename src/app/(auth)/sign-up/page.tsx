import type { Metadata } from "next";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";

import { SignUpForm } from "./sign-up-form";

export const metadata: Metadata = { title: "Create account · CRM" };

export default function SignUpPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <h1 className="text-lg font-semibold">Create an account</h1>
          <CardDescription>Start managing your customers.</CardDescription>
        </CardHeader>
        <CardContent>
          <SignUpForm />
        </CardContent>
        <CardFooter className="text-sm text-muted-foreground">
          Already have an account?&nbsp;
          <Link href="/sign-in" className="text-foreground underline">
            Sign in
          </Link>
        </CardFooter>
      </Card>
    </main>
  );
}
