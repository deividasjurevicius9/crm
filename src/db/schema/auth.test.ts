import { eq } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createTestDb } from "@/test/db";

import { account, session, user, verification } from "./auth";

let testDb: Awaited<ReturnType<typeof createTestDb>>;
let idCounter = 0;

function nextId(prefix: string) {
  idCounter += 1;
  return `${prefix}-${String(idCounter)}`;
}

const LONG_AGO = new Date("2020-01-01T00:00:00Z");
const IN_ONE_HOUR = () => new Date(Date.now() + 60 * 60 * 1000);

async function insertUser() {
  const id = nextId("user");
  await testDb.db.insert(user).values({
    id,
    name: "Schema Test",
    email: `${id}@example.com`,
    createdAt: LONG_AGO,
    updatedAt: LONG_AGO,
  });
  return id;
}

beforeAll(async () => {
  testDb = await createTestDb();
});

afterAll(async () => {
  await testDb.close();
});

describe("foreign keys", () => {
  it.each([
    ["session", session],
    ["account", account],
  ] as const)(
    "%s.user_id references user.id with ON DELETE CASCADE",
    (_name, table) => {
      const { foreignKeys } = getTableConfig(table);

      expect(foreignKeys).toHaveLength(1);
      const fk = foreignKeys[0];
      const reference = fk?.reference();
      expect(reference?.foreignTable).toBe(user);
      expect(reference?.foreignColumns).toEqual([user.id]);
      expect(reference?.columns).toEqual([table.userId]);
      expect(fk?.onDelete).toBe("cascade");
    },
  );

  it("user and verification reference no other table", () => {
    expect(getTableConfig(user).foreignKeys).toHaveLength(0);
    expect(getTableConfig(verification).foreignKeys).toHaveLength(0);
  });

  it("refuses a session for a user that does not exist", async () => {
    await expect(
      testDb.db.insert(session).values({
        id: nextId("session"),
        token: nextId("token"),
        userId: "missing-user",
        expiresAt: IN_ONE_HOUR(),
        updatedAt: new Date(),
      }),
    ).rejects.toThrow();
  });
});

describe("column types", () => {
  it("uses timestamptz for every date column", () => {
    for (const table of [user, session, account, verification]) {
      const dateColumns = getTableConfig(table).columns.filter(
        (column) => column.dataType === "date",
      );

      expect(dateColumns.length).toBeGreaterThan(0);
      for (const column of dateColumns) {
        expect(column.getSQLType()).toBe("timestamp with time zone");
      }
    }
  });

  it("makes user.email and session.token unique", () => {
    expect(user.email.isUnique).toBe(true);
    expect(session.token.isUnique).toBe(true);
  });

  it("defaults email_verified to false", async () => {
    const id = await insertUser();

    const [row] = await testDb.db.select().from(user).where(eq(user.id, id));

    expect(row?.emailVerified).toBe(false);
  });
});

describe("updated_at is refreshed on every update", () => {
  it("user", async () => {
    const id = await insertUser();

    await testDb.db
      .update(user)
      .set({ name: "Renamed" })
      .where(eq(user.id, id));

    const [row] = await testDb.db.select().from(user).where(eq(user.id, id));
    expect(row?.updatedAt.getTime()).toBeGreaterThan(LONG_AGO.getTime());
    expect(row?.createdAt).toEqual(LONG_AGO);
  });

  it("session", async () => {
    const userId = await insertUser();
    const id = nextId("session");
    await testDb.db.insert(session).values({
      id,
      token: nextId("token"),
      userId,
      expiresAt: IN_ONE_HOUR(),
      updatedAt: LONG_AGO,
    });

    await testDb.db
      .update(session)
      .set({ userAgent: "test-agent" })
      .where(eq(session.id, id));

    const [row] = await testDb.db
      .select()
      .from(session)
      .where(eq(session.id, id));
    expect(row?.updatedAt.getTime()).toBeGreaterThan(LONG_AGO.getTime());
  });

  it("account", async () => {
    const userId = await insertUser();
    const id = nextId("account");
    await testDb.db.insert(account).values({
      id,
      accountId: userId,
      providerId: "credential",
      userId,
      updatedAt: LONG_AGO,
    });

    await testDb.db
      .update(account)
      .set({ scope: "email" })
      .where(eq(account.id, id));

    const [row] = await testDb.db
      .select()
      .from(account)
      .where(eq(account.id, id));
    expect(row?.updatedAt.getTime()).toBeGreaterThan(LONG_AGO.getTime());
  });

  it("verification", async () => {
    const id = nextId("verification");
    await testDb.db.insert(verification).values({
      id,
      identifier: "email-verification:someone@example.com",
      value: "token-value",
      expiresAt: IN_ONE_HOUR(),
      updatedAt: LONG_AGO,
    });

    await testDb.db
      .update(verification)
      .set({ value: "new-token-value" })
      .where(eq(verification.id, id));

    const [row] = await testDb.db
      .select()
      .from(verification)
      .where(eq(verification.id, id));
    expect(row?.updatedAt.getTime()).toBeGreaterThan(LONG_AGO.getTime());
  });
});
