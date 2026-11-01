import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Pool } from "pg";

// attachDatabasePool talks to the Vercel runtime; replace it with a spy.
// Created once in vi.hoisted so every fresh import of ./client (after
// vi.resetModules) receives this same spy.
const { attachDatabasePool } = vi.hoisted(() => ({
  attachDatabasePool: vi.fn(),
}));
vi.mock("@vercel/functions", () => ({ attachDatabasePool }));

const URL_A =
  "postgresql://user:pass@ep-a-pooler.eu-central-1.aws.neon.tech/crm";
const URL_B =
  "postgresql://user:pass@ep-b-pooler.eu-central-1.aws.neon.tech/crm";

// Creating a pg Pool opens no connection until the first query, so these
// tests need no database. Pools are still closed after each test.
const pools: Pool[] = [];

async function loadClient() {
  vi.resetModules();
  return import("./client");
}

beforeEach(() => {
  vi.mocked(attachDatabasePool).mockClear();
});

afterEach(async () => {
  vi.unstubAllEnvs();
  await Promise.all(pools.splice(0).map((pool) => pool.end()));
});

describe("createDb", () => {
  it("builds a pg Pool for the given connection string", async () => {
    const { createDb } = await loadClient();

    const pool = createDb(URL_A).$client;
    pools.push(pool);

    expect(pool).toBeInstanceOf(Pool);
    expect(pool.options.connectionString).toBe(URL_A);
  });

  it("uses short idle and connect timeouts suited to serverless", async () => {
    const { createDb } = await loadClient();

    const pool = createDb(URL_A).$client;
    pools.push(pool);

    expect(pool.options.idleTimeoutMillis).toBe(5_000);
    expect(pool.options.connectionTimeoutMillis).toBe(10_000);
  });

  it("opens no connection until the first query", async () => {
    const { createDb } = await loadClient();

    const pool = createDb(URL_A).$client;
    pools.push(pool);

    expect(pool.totalCount).toBe(0);
  });

  it("hands the pool to Vercel so idle connections are released", async () => {
    const { createDb } = await loadClient();

    const pool = createDb(URL_A).$client;
    pools.push(pool);

    expect(attachDatabasePool).toHaveBeenCalledTimes(1);
    expect(attachDatabasePool).toHaveBeenCalledWith(pool);
  });

  it("registers exactly one 'error' listener on the pool", async () => {
    const { createDb } = await loadClient();

    const pool = createDb(URL_A).$client;
    pools.push(pool);

    expect(pool.listenerCount("error")).toBe(1);
  });

  it("logs an idle-connection error instead of crashing the process", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const { createDb } = await loadClient();

    const pool = createDb(URL_A).$client;
    pools.push(pool);

    // With no listener, EventEmitter.emit("error") would throw here.
    expect(() =>
      pool.emit("error", new Error("terminating connection"), undefined),
    ).not.toThrow();
    expect(consoleError).toHaveBeenCalledWith(
      "Postgres pool error on an idle connection:",
      "terminating connection",
    );
  });

  it("logs only the error message, never the connection string", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const { createDb } = await loadClient();

    const pool = createDb(URL_A).$client;
    pools.push(pool);
    pool.emit("error", new Error("boom"), undefined);

    const logged = consoleError.mock.calls.flat().join(" ");
    expect(logged).not.toContain("pass@");
    expect(logged).not.toContain(URL_A);
  });

  it("creates an independent pool on every call", async () => {
    const { createDb } = await loadClient();

    const first = createDb(URL_A).$client;
    const second = createDb(URL_B).$client;
    pools.push(first, second);

    expect(first).not.toBe(second);
    expect(second.options.connectionString).toBe(URL_B);
  });
});

describe("getDb", () => {
  it("connects with DATABASE_URL from the validated env", async () => {
    vi.stubEnv("DATABASE_URL", URL_A);
    const { getDb } = await loadClient();

    const pool = getDb().$client;
    pools.push(pool);

    expect(pool.options.connectionString).toBe(URL_A);
  });

  it("returns the same instance on every call: one pool per server instance", async () => {
    vi.stubEnv("DATABASE_URL", URL_A);
    const { getDb } = await loadClient();

    const first = getDb();
    const second = getDb();
    pools.push(first.$client);

    expect(second).toBe(first);
    expect(attachDatabasePool).toHaveBeenCalledTimes(1);
  });

  it("does not touch the env or create a pool on import", async () => {
    vi.stubEnv("DATABASE_URL", "");

    await expect(loadClient()).resolves.toBeDefined();
    expect(attachDatabasePool).not.toHaveBeenCalled();
  });

  it("throws a clear error and creates no pool when DATABASE_URL is missing", async () => {
    vi.stubEnv("DATABASE_URL", "");
    const { getDb } = await loadClient();

    expect(() => getDb()).toThrow(/DATABASE_URL/);
    expect(attachDatabasePool).not.toHaveBeenCalled();
  });
});
