import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { account, session, user } from "@/db/schema";
import { createTestDb } from "@/test/db";

import { createAuth } from "./auth";

const SECRET = "test-secret-at-least-32-characters-long!!";
const BASE_URL = "http://localhost:3000";
const PASSWORD = "correct horse battery staple";

let testDb: Awaited<ReturnType<typeof createTestDb>>;
let auth: ReturnType<typeof createAuth>;
let emailCounter = 0;

// Every test registers its own user, so tests share one database safely.
function uniqueEmail() {
  emailCounter += 1;
  return `user${String(emailCounter)}@example.com`;
}

async function signUp(email = uniqueEmail(), password = PASSWORD) {
  return auth.api.signUpEmail({ body: { name: "Test User", email, password } });
}

beforeAll(async () => {
  testDb = await createTestDb();
  auth = createAuth({ db: testDb.db, secret: SECRET, baseURL: BASE_URL });
});

afterAll(async () => {
  await testDb.close();
});

describe("database schema", () => {
  it("creates the four Better Auth tables from the migrations", async () => {
    const result = await testDb.db.execute<{ table_name: string }>(sql`
      select table_name from information_schema.tables
      where table_schema = 'public' order by table_name
    `);

    expect(result.rows.map((row) => row.table_name)).toEqual([
      "account",
      "session",
      "user",
      "verification",
    ]);
  });

  it("stores timestamps with time zone", async () => {
    const result = await testDb.db.execute<{ data_type: string }>(sql`
      select distinct data_type from information_schema.columns
      where table_schema = 'public' and column_name like '%_at'
    `);

    expect(result.rows.map((row) => row.data_type)).toEqual([
      "timestamp with time zone",
    ]);
  });
});

describe("sign up with email and password", () => {
  it("creates a user and returns a session token", async () => {
    const email = uniqueEmail();

    const result = await signUp(email);

    expect(result.user.email).toBe(email);
    expect(result.user.name).toBe("Test User");
    expect(result.user.emailVerified).toBe(false);
    expect(result.token).toEqual(expect.any(String));
  });

  it("writes one user row and one credential account row", async () => {
    const { user: created } = await signUp();

    const users = await testDb.db
      .select()
      .from(user)
      .where(eq(user.id, created.id));
    const accounts = await testDb.db
      .select()
      .from(account)
      .where(eq(account.userId, created.id));

    expect(users).toHaveLength(1);
    expect(accounts).toHaveLength(1);
    expect(accounts[0]?.providerId).toBe("credential");
  });

  it("stores a password hash, never the password itself", async () => {
    const { user: created } = await signUp();

    const [row] = await testDb.db
      .select({ password: account.password })
      .from(account)
      .where(eq(account.userId, created.id));

    expect(row?.password).toEqual(expect.any(String));
    expect(row?.password).not.toBe(PASSWORD);
    expect(row?.password).not.toContain(PASSWORD);
  });

  it("hashes the same password differently for different users (salted)", async () => {
    const first = await signUp();
    const second = await signUp();

    const rows = await testDb.db
      .select({ userId: account.userId, password: account.password })
      .from(account)
      .where(sql`${account.userId} in (${first.user.id}, ${second.user.id})`);

    expect(rows).toHaveLength(2);
    expect(rows[0]?.password).not.toBe(rows[1]?.password);
  });

  it("creates a session row for the new user", async () => {
    const { user: created, token } = await signUp();

    const sessions = await testDb.db
      .select()
      .from(session)
      .where(eq(session.userId, created.id));

    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.token).toBe(token);
    expect(sessions[0]?.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("rejects a password shorter than 8 characters", async () => {
    await expect(signUp(uniqueEmail(), "short")).rejects.toThrow();
  });

  it("rejects an invalid email address", async () => {
    await expect(signUp("not-an-email")).rejects.toThrow();
  });

  it("does not create a second user with the same email", async () => {
    const email = uniqueEmail();
    await signUp(email);

    await expect(signUp(email, "another password 123")).rejects.toThrow();

    const users = await testDb.db
      .select()
      .from(user)
      .where(eq(user.email, email));
    expect(users).toHaveLength(1);
  });
});

describe("sign in with email and password", () => {
  it("returns a new session for the correct password", async () => {
    const email = uniqueEmail();
    const { user: created } = await signUp(email);

    const result = await auth.api.signInEmail({
      body: { email, password: PASSWORD },
    });

    expect(result.user.id).toBe(created.id);
    expect(result.token).toEqual(expect.any(String));
  });

  it("rejects a wrong password", async () => {
    const email = uniqueEmail();
    await signUp(email);

    await expect(
      auth.api.signInEmail({ body: { email, password: "wrong password!!" } }),
    ).rejects.toThrow();
  });

  it("rejects an email that was never registered", async () => {
    await expect(
      auth.api.signInEmail({
        body: { email: "nobody@example.com", password: PASSWORD },
      }),
    ).rejects.toThrow();
  });

  it("sets a signed session cookie", async () => {
    const email = uniqueEmail();
    await signUp(email);

    const { headers } = await auth.api.signInEmail({
      body: { email, password: PASSWORD },
      returnHeaders: true,
    });

    const cookie = headers.get("set-cookie") ?? "";
    expect(cookie).toContain("better-auth.session_token=");
    expect(cookie.toLowerCase()).toContain("httponly");
  });
});

describe("reading the session", () => {
  async function signInAndGetCookie(email: string) {
    const { headers } = await auth.api.signInEmail({
      body: { email, password: PASSWORD },
      returnHeaders: true,
    });
    const setCookie = headers.get("set-cookie") ?? "";
    // Send back only "name=value", as a browser would.
    return setCookie.split(";")[0] ?? "";
  }

  it("resolves the signed-in user from the session cookie", async () => {
    const email = uniqueEmail();
    await signUp(email);
    const cookie = await signInAndGetCookie(email);

    const result = await auth.api.getSession({
      headers: new Headers({ cookie }),
    });

    expect(result?.user.email).toBe(email);
  });

  it("returns null without a cookie", async () => {
    const result = await auth.api.getSession({ headers: new Headers() });

    expect(result).toBeNull();
  });

  it("returns null for a forged cookie", async () => {
    const result = await auth.api.getSession({
      headers: new Headers({
        cookie: "better-auth.session_token=forged.signature",
      }),
    });

    expect(result).toBeNull();
  });

  it("returns null after sign out", async () => {
    const email = uniqueEmail();
    await signUp(email);
    const cookie = await signInAndGetCookie(email);
    const headers = new Headers({ cookie });

    await auth.api.signOut({ headers });

    expect(await auth.api.getSession({ headers })).toBeNull();
  });

  it("does not accept a cookie signed with a different secret", async () => {
    const email = uniqueEmail();
    await signUp(email);
    const cookie = await signInAndGetCookie(email);
    const otherAuth = createAuth({
      db: testDb.db,
      secret: "a-completely-different-secret-32-chars!",
      baseURL: BASE_URL,
    });

    const result = await otherAuth.api.getSession({
      headers: new Headers({ cookie }),
    });

    expect(result).toBeNull();
  });
});

describe("deleting a user", () => {
  it("cascades to their sessions and accounts", async () => {
    const { user: created } = await signUp();

    await testDb.db.delete(user).where(eq(user.id, created.id));

    const sessions = await testDb.db
      .select()
      .from(session)
      .where(eq(session.userId, created.id));
    const accounts = await testDb.db
      .select()
      .from(account)
      .where(eq(account.userId, created.id));
    expect(sessions).toHaveLength(0);
    expect(accounts).toHaveLength(0);
  });
});
