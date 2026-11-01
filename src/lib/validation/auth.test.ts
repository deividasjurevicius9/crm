import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  firstFieldErrors,
  initialAuthFormState,
  PASSWORD_MAX,
  PASSWORD_MIN,
  readFields,
  signInSchema,
  signUpSchema,
} from "./auth";

const VALID_SIGN_UP = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  password: "analytical engine",
};

describe("signUpSchema", () => {
  it("accepts a valid sign-up", () => {
    expect(signUpSchema.parse(VALID_SIGN_UP)).toEqual(VALID_SIGN_UP);
  });

  it("trims the name", () => {
    expect(signUpSchema.parse({ ...VALID_SIGN_UP, name: "  Ada  " }).name).toBe(
      "Ada",
    );
  });

  it("trims and lowercases the email, so one person gets one account", () => {
    expect(
      signUpSchema.parse({ ...VALID_SIGN_UP, email: "  Ada@Example.COM " })
        .email,
    ).toBe("ada@example.com");
  });

  it("does not trim the password: spaces are part of it", () => {
    const password = "  spaced out  ";

    expect(signUpSchema.parse({ ...VALID_SIGN_UP, password }).password).toBe(
      password,
    );
  });

  it.each([
    ["an empty name", { name: "" }, "Enter your name."],
    ["a whitespace-only name", { name: "   " }, "Enter your name."],
    ["a 101-character name", { name: "a".repeat(101) }, "Use at most 100"],
    ["an invalid email", { email: "ada.example.com" }, "valid email"],
    ["an empty email", { email: "" }, "valid email"],
    [
      "a short password",
      { password: "a".repeat(PASSWORD_MIN - 1) },
      `at least ${String(PASSWORD_MIN)}`,
    ],
    [
      "a too long password",
      { password: "a".repeat(PASSWORD_MAX + 1) },
      `at most ${String(PASSWORD_MAX)}`,
    ],
  ])("rejects %s", (_case, override, message) => {
    const result = signUpSchema.safeParse({ ...VALID_SIGN_UP, ...override });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain(message);
  });

  it("accepts passwords at exactly the minimum and maximum length", () => {
    for (const password of [
      "a".repeat(PASSWORD_MIN),
      "a".repeat(PASSWORD_MAX),
    ]) {
      expect(
        signUpSchema.safeParse({ ...VALID_SIGN_UP, password }).success,
      ).toBe(true);
    }
  });

  it("keeps the password limits in line with Better Auth's defaults", () => {
    expect(PASSWORD_MIN).toBe(8);
    expect(PASSWORD_MAX).toBe(128);
  });
});

describe("signInSchema", () => {
  it("accepts any non-empty password", () => {
    expect(
      signInSchema.safeParse({ email: "ada@example.com", password: "x" })
        .success,
    ).toBe(true);
  });

  it("rejects an empty password", () => {
    const result = signInSchema.safeParse({
      email: "ada@example.com",
      password: "",
    });

    expect(result.error?.issues[0]?.message).toBe("Enter your password.");
  });

  it("normalises the email exactly like sign-up does", () => {
    expect(
      signInSchema.parse({ email: " ADA@example.com", password: "x" }).email,
    ).toBe("ada@example.com");
  });
});

describe("readFields", () => {
  it("reads the requested string fields", () => {
    const formData = new FormData();
    formData.set("email", "ada@example.com");
    formData.set("password", "secret");

    expect(readFields(formData, ["email", "password"])).toEqual({
      email: "ada@example.com",
      password: "secret",
    });
  });

  it("returns an empty string for a missing field", () => {
    expect(readFields(new FormData(), ["email"])).toEqual({ email: "" });
  });

  it("treats an uploaded File as missing, not as a value", () => {
    const formData = new FormData();
    formData.set("email", new File(["x"], "evil.txt"));

    expect(readFields(formData, ["email"])).toEqual({ email: "" });
  });

  it("ignores fields that were not requested", () => {
    const formData = new FormData();
    formData.set("email", "ada@example.com");
    formData.set("role", "admin");

    expect(readFields(formData, ["email"])).toEqual({
      email: "ada@example.com",
    });
  });
});

describe("firstFieldErrors", () => {
  it("returns one message per field, the first one reported", () => {
    const schema = z.object({
      email: z.string().min(5, "first").regex(/@/, "second"),
      password: z.string().min(1, "password message"),
    });
    const result = schema.safeParse({ email: "x", password: "" });

    expect(result.success).toBe(false);
    expect(firstFieldErrors(result.error ?? new z.ZodError([]))).toEqual({
      email: "first",
      password: "password message",
    });
  });

  it("ignores issues for fields the forms do not show", () => {
    const result = z.object({ role: z.string() }).safeParse({ role: 1 });

    expect(firstFieldErrors(result.error ?? new z.ZodError([]))).toEqual({});
  });

  it("ignores form-level issues without a path", () => {
    const result = z.string().safeParse(1);

    expect(firstFieldErrors(result.error ?? new z.ZodError([]))).toEqual({});
  });
});

describe("initialAuthFormState", () => {
  it("starts with no errors and no values", () => {
    expect(initialAuthFormState).toEqual({});
  });
});
