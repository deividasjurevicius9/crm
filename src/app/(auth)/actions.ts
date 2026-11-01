"use server";

import { isAPIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getAuth } from "@/lib/auth";
import {
  type AuthFormState,
  firstFieldErrors,
  readFields,
  signInSchema,
  signUpSchema,
} from "@/lib/validation/auth";

// "Save" path for the auth forms:
// form submit → Server Action → Zod check → Better Auth → database → cookie.

const AFTER_SIGN_IN = "/dashboard";

// Same message for "no such user" and "wrong password", so the form does not
// reveal which emails are registered.
const INVALID_CREDENTIALS = "Invalid email or password.";
const SIGN_UP_FAILED =
  "Could not create the account. If you already have one, sign in instead.";

export async function signUpAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const fields = readFields(formData, ["name", "email", "password"]);
  const values = { name: fields.name, email: fields.email };

  const parsed = signUpSchema.safeParse(fields);
  if (!parsed.success) {
    return { fieldErrors: firstFieldErrors(parsed.error), values };
  }

  const requestHeaders = await headers();
  try {
    await getAuth().api.signUpEmail({
      body: parsed.data,
      headers: requestHeaders,
    });
  } catch (error) {
    if (isAPIError(error)) return { error: SIGN_UP_FAILED, values };
    throw error;
  }

  // redirect() throws to end the action, so it stays outside the try block.
  redirect(AFTER_SIGN_IN);
}

export async function signInAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const fields = readFields(formData, ["email", "password"]);
  const values = { email: fields.email };

  const parsed = signInSchema.safeParse(fields);
  if (!parsed.success) {
    return { fieldErrors: firstFieldErrors(parsed.error), values };
  }

  const requestHeaders = await headers();
  try {
    await getAuth().api.signInEmail({
      body: parsed.data,
      headers: requestHeaders,
    });
  } catch (error) {
    if (isAPIError(error)) return { error: INVALID_CREDENTIALS, values };
    throw error;
  }

  redirect(AFTER_SIGN_IN);
}

export async function signOutAction(): Promise<void> {
  const requestHeaders = await headers();
  await getAuth().api.signOut({ headers: requestHeaders });
  redirect("/sign-in");
}
