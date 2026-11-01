import { eq } from "drizzle-orm";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { session, user } from "@/db/schema";
import type * as AuthModule from "@/lib/auth";
import { createAuth } from "@/lib/auth";
import { createTestDb } from "@/test/db";

// Real Better Auth on an in-memory Postgres; only the Next.js request APIs
// are replaced. redirect() really throws in Next.js, so the fake throws too.
const mocks = vi.hoisted(() => ({
  auth: undefined as ReturnType<typeof createAuth> | undefined,
  requestHeaders: new Headers(),
}));

class RedirectError extends Error {
  readonly url: string;

  constructor(url: string) {
    super(`NEXT_REDIRECT ${url}`);
    this.url = url;
  }
}

vi.mock("@/lib/auth", async (importOriginal) => {
  const original = await importOriginal<typeof AuthModule>();
  return {
    ...original,
    getAuth: () => {
      if (mocks.auth === undefined) throw new Error("auth not ready");
      return mocks.auth;
    },
  };
});
vi.mock("next/headers", () => ({ headers: () => mocks.requestHeaders }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new RedirectError(url);
  },
}));

const { signInAction, signOutAction, signUpAction } = await import("./actions");

const PASSWORD = "correct horse battery staple";
let testDb: Awaited<ReturnType<typeof createTestDb>>;
let counter = 0;

function uniqueEmail() {
  counter += 1;
  return `action${String(counter)}@example.com`;
}

function form(fields: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) formData.set(key, value);
  return formData;
}

// Runs an action that is expected to redirect and returns the target URL.
async function expectRedirect(run: () => Promise<unknown>) {
  const error: unknown = await run().then(
    () => undefined,
    (thrown: unknown) => thrown,
  );
  expect(error).toBeInstanceOf(RedirectError);
  return (error as RedirectError).url;
}

async function registered(email = uniqueEmail()) {
  await expectRedirect(() =>
    signUpAction({}, form({ name: "Ada", email, password: PASSWORD })),
  );
  return email;
}

beforeAll(async () => {
  testDb = await createTestDb();
  mocks.auth = createAuth({
    db: testDb.db,
    secret: "test-secret-at-least-32-characters-long!!",
    baseURL: "http://localhost:3000",
  });
});

afterAll(async () => {
  await testDb.close();
});

beforeEach(() => {
  mocks.requestHeaders = new Headers();
});

describe("signUpAction", () => {
  it("creates the user and redirects to the dashboard", async () => {
    const email = uniqueEmail();

    const target = await expectRedirect(() =>
      signUpAction({}, form({ name: "Ada", email, password: PASSWORD })),
    );

    expect(target).toBe("/dashboard");
    const rows = await testDb.db
      .select()
      .from(user)
      .where(eq(user.email, email));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.name).toBe("Ada");
  });

  it("stores the email normalised to lower case", async () => {
    const email = uniqueEmail();

    await expectRedirect(() =>
      signUpAction(
        {},
        form({ name: "Ada", email: email.toUpperCase(), password: PASSWORD }),
      ),
    );

    const rows = await testDb.db
      .select()
      .from(user)
      .where(eq(user.email, email));
    expect(rows).toHaveLength(1);
  });

  it("starts a session for the new user", async () => {
    const email = await registered();

    const [created] = await testDb.db
      .select()
      .from(user)
      .where(eq(user.email, email));
    const sessions = await testDb.db
      .select()
      .from(session)
      .where(eq(session.userId, created?.id ?? ""));
    expect(sessions).toHaveLength(1);
  });

  it("returns field errors and writes nothing when the input is invalid", async () => {
    const email = "not-an-email";

    const state = await signUpAction(
      {},
      form({ name: "", email, password: "short" }),
    );

    expect(state.fieldErrors).toEqual({
      name: "Enter your name.",
      email: "Enter a valid email address.",
      password: "Use at least 8 characters.",
    });
    const rows = await testDb.db
      .select()
      .from(user)
      .where(eq(user.email, email));
    expect(rows).toHaveLength(0);
  });

  it("echoes name and email back, but never the password", async () => {
    const state = await signUpAction(
      {},
      form({ name: "Ada", email: "bad", password: "secret-value" }),
    );

    expect(state.values).toEqual({ name: "Ada", email: "bad" });
    expect(JSON.stringify(state)).not.toContain("secret-value");
  });

  it("returns a generic error for an email that is already registered", async () => {
    const email = await registered();

    const state = await signUpAction(
      {},
      form({ name: "Eve", email, password: "another password" }),
    );

    expect(state.error).toMatch(/Could not create the account/);
    expect(state.values).toEqual({ name: "Eve", email });
    const rows = await testDb.db
      .select()
      .from(user)
      .where(eq(user.email, email));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.name).toBe("Ada");
  });

  it("treats missing form fields as empty, not as a crash", async () => {
    const state = await signUpAction({}, new FormData());

    expect(Object.keys(state.fieldErrors ?? {})).toEqual([
      "name",
      "email",
      "password",
    ]);
  });
});

describe("signInAction", () => {
  it("signs in with the right password and redirects", async () => {
    const email = await registered();

    const target = await expectRedirect(() =>
      signInAction({}, form({ email, password: PASSWORD })),
    );

    expect(target).toBe("/dashboard");
  });

  it("accepts the email in any letter case", async () => {
    const email = await registered();

    const target = await expectRedirect(() =>
      signInAction(
        {},
        form({ email: email.toUpperCase(), password: PASSWORD }),
      ),
    );

    expect(target).toBe("/dashboard");
  });

  it("returns the same error for a wrong password and an unknown email", async () => {
    const email = await registered();

    const wrongPassword = await signInAction(
      {},
      form({ email, password: "wrong password" }),
    );
    const unknownEmail = await signInAction(
      {},
      form({ email: "nobody@example.com", password: PASSWORD }),
    );

    expect(wrongPassword.error).toBe("Invalid email or password.");
    expect(unknownEmail.error).toBe(wrongPassword.error);
  });

  it("keeps the email but drops the password after a failure", async () => {
    const state = await signInAction(
      {},
      form({ email: "nobody@example.com", password: "secret-value" }),
    );

    expect(state.values).toEqual({ email: "nobody@example.com" });
    expect(JSON.stringify(state)).not.toContain("secret-value");
  });

  it("returns field errors without asking Better Auth for empty input", async () => {
    const state = await signInAction({}, form({ email: "", password: "" }));

    expect(state.fieldErrors).toEqual({
      email: "Enter a valid email address.",
      password: "Enter your password.",
    });
    expect(state.error).toBeUndefined();
  });
});

describe("signOutAction", () => {
  it("ends the session and redirects to sign-in", async () => {
    const email = await registered();
    const { headers: responseHeaders } = await (
      mocks.auth ??
      createAuth({
        db: testDb.db,
        secret: "unused-secret-unused-secret-unused!!",
        baseURL: "http://localhost:3000",
      })
    ).api.signInEmail({
      body: { email, password: PASSWORD },
      returnHeaders: true,
    });
    const cookie =
      (responseHeaders.get("set-cookie") ?? "").split(";")[0] ?? "";
    mocks.requestHeaders = new Headers({ cookie });

    const target = await expectRedirect(() => signOutAction());

    expect(target).toBe("/sign-in");
    expect(
      await mocks.auth?.api.getSession({ headers: new Headers({ cookie }) }),
    ).toBeNull();
  });
});

describe("unexpected failures", () => {
  it("rethrows errors that are not Better Auth API errors", async () => {
    const auth = mocks.auth;
    mocks.auth = {
      api: {
        signUpEmail: () => Promise.reject(new Error("database down")),
        signInEmail: () => Promise.reject(new Error("database down")),
      },
    } as unknown as ReturnType<typeof createAuth>;

    try {
      await expect(
        signUpAction(
          {},
          form({ name: "Ada", email: uniqueEmail(), password: PASSWORD }),
        ),
      ).rejects.toThrow("database down");
      await expect(
        signInAction({}, form({ email: uniqueEmail(), password: PASSWORD })),
      ).rejects.toThrow("database down");
    } finally {
      mocks.auth = auth;
    }
  });
});
