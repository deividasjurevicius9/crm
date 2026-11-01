import { afterEach, describe, expect, it, vi } from "vitest";

import { parseServerEnv } from "./env";

const VALID_URL =
  "postgresql://app_user:s3cret-pa55@ep-test-pooler.eu-central-1.aws.neon.tech/crm?sslmode=require";
const VALID_SECRET = "0123456789abcdef0123456789abcdef";

// The smallest valid environment; each test overrides what it checks.
const BASE = { DATABASE_URL: VALID_URL, BETTER_AUTH_SECRET: VALID_SECRET };

describe("parseServerEnv: DATABASE_URL", () => {
  it("accepts a postgresql:// URL", () => {
    expect(parseServerEnv(BASE).DATABASE_URL).toBe(VALID_URL);
  });

  it("accepts the short postgres:// scheme", () => {
    const url = "postgres://user:pass@localhost:5432/crm";

    expect(parseServerEnv({ ...BASE, DATABASE_URL: url }).DATABASE_URL).toBe(
      url,
    );
  });

  it("fails when DATABASE_URL is missing and names the variable", () => {
    expect(() => parseServerEnv({ BETTER_AUTH_SECRET: VALID_SECRET })).toThrow(
      /DATABASE_URL/,
    );
  });

  it("treats an empty DATABASE_URL as missing", () => {
    expect(() => parseServerEnv({ ...BASE, DATABASE_URL: "" })).toThrow(
      /DATABASE_URL/,
    );
  });

  it("fails when DATABASE_URL is not a URL at all", () => {
    expect(() =>
      parseServerEnv({ ...BASE, DATABASE_URL: "not a url" }),
    ).toThrow(/DATABASE_URL/);
  });

  it.each([
    ["https", "https://example.com/crm"],
    ["mysql", "mysql://user:pass@localhost:3306/crm"],
    ["postgresx", "postgresx://user:pass@localhost/crm"],
  ])("rejects the %s scheme", (_scheme, url) => {
    expect(() => parseServerEnv({ ...BASE, DATABASE_URL: url })).toThrow(
      /postgres:\/\/ or postgresql:\/\//,
    );
  });

  it("never puts the connection string or password into the error message", () => {
    const leaky = "mysql://app_user:s3cret-pa55@db.example.com/crm";

    let message = "";
    try {
      parseServerEnv({ ...BASE, DATABASE_URL: leaky });
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }

    expect(message).toContain("DATABASE_URL");
    expect(message).not.toContain("s3cret-pa55");
    expect(message).not.toContain(leaky);
  });
});

describe("parseServerEnv: BETTER_AUTH_SECRET", () => {
  it("accepts a 32-character secret", () => {
    expect(parseServerEnv(BASE).BETTER_AUTH_SECRET).toBe(VALID_SECRET);
  });

  it("fails when the secret is missing", () => {
    expect(() => parseServerEnv({ DATABASE_URL: VALID_URL })).toThrow(
      /BETTER_AUTH_SECRET/,
    );
  });

  it("fails when the secret is shorter than 32 characters", () => {
    expect(() =>
      parseServerEnv({ ...BASE, BETTER_AUTH_SECRET: "x".repeat(31) }),
    ).toThrow(/at least 32 characters/);
  });

  it("never puts the secret into the error message", () => {
    const shortSecret = "my-short-secret-value";

    let message = "";
    try {
      parseServerEnv({ ...BASE, BETTER_AUTH_SECRET: shortSecret });
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }

    expect(message).toContain("BETTER_AUTH_SECRET");
    expect(message).not.toContain(shortSecret);
  });
});

describe("parseServerEnv: optional origin variables", () => {
  it("leaves every optional variable undefined when not set", () => {
    const env = parseServerEnv(BASE);

    expect(env.BETTER_AUTH_URL).toBeUndefined();
    expect(env.VERCEL_ENV).toBeUndefined();
    expect(env.VERCEL_URL).toBeUndefined();
    expect(env.VERCEL_BRANCH_URL).toBeUndefined();
    expect(env.VERCEL_PROJECT_PRODUCTION_URL).toBeUndefined();
  });

  it("treats empty strings as not set", () => {
    const env = parseServerEnv({
      ...BASE,
      BETTER_AUTH_URL: "",
      VERCEL_ENV: "",
      VERCEL_URL: "",
    });

    expect(env.BETTER_AUTH_URL).toBeUndefined();
    expect(env.VERCEL_ENV).toBeUndefined();
    expect(env.VERCEL_URL).toBeUndefined();
  });

  it("accepts the values Vercel sets on a deployment", () => {
    const env = parseServerEnv({
      ...BASE,
      VERCEL_ENV: "preview",
      VERCEL_URL: "crm-abc123-dj.vercel.app",
      VERCEL_BRANCH_URL: "crm-git-feat-x-dj.vercel.app",
      VERCEL_PROJECT_PRODUCTION_URL: "crm-nu-tawny-81.vercel.app",
    });

    expect(env.VERCEL_ENV).toBe("preview");
    expect(env.VERCEL_URL).toBe("crm-abc123-dj.vercel.app");
    expect(env.VERCEL_BRANCH_URL).toBe("crm-git-feat-x-dj.vercel.app");
    expect(env.VERCEL_PROJECT_PRODUCTION_URL).toBe(
      "crm-nu-tawny-81.vercel.app",
    );
  });

  it("rejects an unknown VERCEL_ENV", () => {
    expect(() => parseServerEnv({ ...BASE, VERCEL_ENV: "staging" })).toThrow(
      /VERCEL_ENV/,
    );
  });

  it.each([
    ["a scheme", "https://crm.vercel.app"],
    ["a path", "crm.vercel.app/evil"],
  ])("rejects a Vercel hostname with %s", (_what, value) => {
    expect(() => parseServerEnv({ ...BASE, VERCEL_URL: value })).toThrow(
      /bare hostname/,
    );
  });

  it("accepts an http(s) BETTER_AUTH_URL", () => {
    expect(
      parseServerEnv({ ...BASE, BETTER_AUTH_URL: "http://localhost:3000" })
        .BETTER_AUTH_URL,
    ).toBe("http://localhost:3000");
  });

  it("rejects a BETTER_AUTH_URL with another scheme", () => {
    expect(() =>
      parseServerEnv({ ...BASE, BETTER_AUTH_URL: "ftp://example.com" }),
    ).toThrow(/BETTER_AUTH_URL/);
  });
});

describe("parseServerEnv: shape", () => {
  it("returns only the declared variables, dropping everything else", () => {
    const env = parseServerEnv({
      ...BASE,
      PATH: "/usr/bin",
      VERCEL_OIDC_TOKEN: "token",
    });

    expect(env).toStrictEqual(BASE);
  });

  it("throws an Error instance, so stack traces point at the caller", () => {
    expect(() => parseServerEnv({})).toThrow(Error);
  });

  it("reports every invalid variable at once", () => {
    expect(() => parseServerEnv({})).toThrow(
      /DATABASE_URL[\s\S]*BETTER_AUTH_SECRET/,
    );
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

  function stubValidEnv() {
    vi.stubEnv("DATABASE_URL", VALID_URL);
    vi.stubEnv("BETTER_AUTH_SECRET", VALID_SECRET);
  }

  it("reads and validates process.env", async () => {
    stubValidEnv();
    const getServerEnv = await loadGetServerEnv();

    expect(getServerEnv().DATABASE_URL).toBe(VALID_URL);
  });

  it("validates once and returns the same object afterwards", async () => {
    stubValidEnv();
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
    vi.stubEnv("BETTER_AUTH_SECRET", VALID_SECRET);
    const getServerEnv = await loadGetServerEnv();

    expect(() => getServerEnv()).toThrow();

    vi.stubEnv("DATABASE_URL", VALID_URL);

    expect(getServerEnv().DATABASE_URL).toBe(VALID_URL);
  });
});
