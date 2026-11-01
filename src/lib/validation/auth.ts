import { z } from "zod";

// Server-side rules for the auth forms. The browser may check too, but only
// this check counts: a request can always be sent without the browser.

// Better Auth's own limits; repeating them here gives field-level messages.
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address."));

export const signUpSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter your name.")
    .max(100, "Use at most 100 characters."),
  email,
  password: z
    .string()
    .min(PASSWORD_MIN, `Use at least ${String(PASSWORD_MIN)} characters.`)
    .max(PASSWORD_MAX, `Use at most ${String(PASSWORD_MAX)} characters.`),
});

export const signInSchema = z.object({
  email,
  // No length rules on sign-in: they would hint at what a password looks like.
  password: z.string().min(1, "Enter your password."),
});

export type AuthField = "name" | "email" | "password";

// What a form shows after a failed submit. Passwords are never sent back.
export interface AuthFormState {
  readonly error?: string;
  readonly fieldErrors?: Partial<Record<AuthField, string>>;
  readonly values?: { readonly name?: string; readonly email?: string };
}

export const initialAuthFormState: AuthFormState = {};

// FormData values are strings or Files; anything that is not a string counts
// as missing, so a crafted request cannot smuggle in a File.
export function readFields<K extends string>(
  formData: FormData,
  keys: readonly K[],
): Record<K, string> {
  const entries = keys.map((key) => {
    const value = formData.get(key);
    return [key, typeof value === "string" ? value : ""] as const;
  });
  return Object.fromEntries(entries) as Record<K, string>;
}

// First message per field, ready to render next to the input.
export function firstFieldErrors(
  error: z.ZodError,
): Partial<Record<AuthField, string>> {
  const result: Partial<Record<AuthField, string>> = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (
      (field === "name" || field === "email" || field === "password") &&
      result[field] === undefined
    ) {
      result[field] = issue.message;
    }
  }
  return result;
}
