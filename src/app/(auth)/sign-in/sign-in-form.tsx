"use client";

import { useActionState } from "react";

import { FormAlert } from "@/components/form-alert";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { initialAuthFormState } from "@/lib/validation/auth";

import { signInAction } from "../actions";

export function SignInForm() {
  const [state, formAction, pending] = useActionState(
    signInAction,
    initialAuthFormState,
  );

  return (
    <form action={formAction} className="grid gap-4">
      <FormAlert message={state.error} />
      <FormField
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        required
        defaultValue={state.values?.email}
        error={state.fieldErrors?.email}
      />
      <FormField
        name="password"
        label="Password"
        type="password"
        autoComplete="current-password"
        required
        error={state.fieldErrors?.password}
      />
      <Button type="submit" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
