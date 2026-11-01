import { afterEach, describe, expect, it, vi } from "vitest";

import { parseServerEnv } from "./env";

const VALID_URL =
  "postgresql://app_user:s3cret-pa55@ep-test-pooler.eu-central-1.aws.neon.tech/crm?sslmode=require";

describe("parseServerEnv", () => {
  it("accepts a postgresql:// URL", () => {
    const env = parseServerEnv({ DATABASE_URL: VALID_URL });

    expect(env.DATABASE_URL).toBe(VALID_URL);
  });

  it("accepts the short postgres:// scheme", () => {
    const url = "postgres://user:pass@localhost:5432/crm";

    expect(parseServerEnv({ DATABASE_URL: url }).DATABASE_URL).toBe(url);
  });

  it("returns only the declared variables, dropping everything else", () => {
    const env = parseServerEnv({
      DATABASE_URL: VALID_URL,
      PATH: "/usr/bin",
      VERCEL_OIDC_TOKEN: "token",
    });

    expect(env).toStrictEqual({ DATABASE_URL: VALID_URL });
  });

  it("fails when DATABASE_URL is missing and names the variable", () => {
    expect(() => parseServerEnv({})).toThrow(/DATABASE_URL/);
  });

  it("fails when DATABASE_URL is an empty string", () => {
    expect(() => parseServerEnv({ DATABASE_URL: "" })).toThrow(
      /Invalid environment variables/,
    );
  });

  it("fails when DATABASE_URL is not a URL at all", () => {
    expect(() => parseServerEnv({ DATABASE_URL: "not a url" })).toThrow(
      /DATABASE_URL/,
    );
  });

  it.each([
    ["https", "https://example.com/crm"],
    ["mysql", "mysql://user:pass@localhost:3306/crm"],
    ["postgresx", "postgresx://user:pass@localhost/crm"],
  ])("rejects the %s scheme", (_scheme, url) => {
    expect(() => parseServerEnv({ DATABASE_URL: url })).toThrow(
      /postgres:\/\/ or postgresql:\/\//,
    );
  });

  it("never puts the connection string or password into the error message", () => {
    const leaky = "mysql://app_user:s3cret-pa55@db.example.com/crm";

    let message = "";
    try {
      parseServerEnv({ DATABASE_URL: leaky });
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }

    expect(message).toContain("DATABASE_URL");
    expect(message).not.toContain("s3cret-pa55");
    expect(message).not.toContain(leaky);
  });

  it("throws an Error instance, so stack traces point at the caller", () => {
    expect(() => parseServerEnv({})).toThrow(Error);
  });
});

describe("getServerEnv", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  // A fresh module per test: getServerEnv caches its result in module state.
  async function loadGetServerEnv() {
    vi.resetModules();
    const envModule = await import("./env");
    return envModule.getServerEnv;
  }

  it("reads and validates process.env", async () => {
    vi.stubEnv("DATABASE_URL", VALID_URL);
    const getServerEnv = await loadGetServerEnv();

    expect(getServerEnv().DATABASE_URL).toBe(VALID_URL);
  });

  it("validates once and returns the same object afterwards", async () => {
    vi.stubEnv("DATABASE_URL", VALID_URL);
    const getServerEnv = await loadGetServerEnv();

    const first = getServerEnv();
    vi.stubEnv("DATABASE_URL", "postgres://other@localhost/other");
    const second = getServerEnv();

    expect(second).toBe(first);
    expect(second.DATABASE_URL).toBe(VALID_URL);
  });

  it("does not validate on import, only on first call", async () => {
    vi.stubEnv("DATABASE_URL", "");

    // Importing must not throw: `next build` imports server code without a DB.
    const getServerEnv = await loadGetServerEnv();

    expect(() => getServerEnv()).toThrow(/DATABASE_URL/);
  });

  it("does not cache a failure: a later call succeeds once the env is fixed", async () => {
    vi.stubEnv("DATABASE_URL", "");
    const getServerEnv = await loadGetServerEnv();

    expect(() => getServerEnv()).toThrow();

    vi.stubEnv("DATABASE_URL", VALID_URL);

    expect(getServerEnv().DATABASE_URL).toBe(VALID_URL);
  });
});
