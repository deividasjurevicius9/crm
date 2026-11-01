"use client";

import { useActionState } from "react";

import { FormAlert } from "@/components/form-alert";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import {
  initialAuthFormState,
  PASSWORD_MAX,
  PASSWORD_MIN,
} from "@/lib/validation/auth";

import { signUpAction } from "../actions";

export function SignUpForm() {
  // state: what the action returned last time; pending: request in flight.
  const [state, formAction, pending] = useActionState(
    signUpAction,
    initialAuthFormState,
  );

  return (
    <form action={formAction} className="grid gap-4">
      <FormAlert message={state.error} />
      <FormField
        name="name"
        label="Name"
        autoComplete="name"
        required
        maxLength={100}
        defaultValue={state.values?.name}
        error={state.fieldErrors?.name}
      />
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
        autoComplete="new-password"
        required
        minLength={PASSWORD_MIN}
        maxLength={PASSWORD_MAX}
        error={state.fieldErrors?.password}
      />
      <Button type="submit" disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
