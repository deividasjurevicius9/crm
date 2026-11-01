import { afterEach, describe, expect, it, vi } from "vitest";

// getDb() builds a real pg Pool (no connection until the first query);
// attachDatabasePool talks to the Vercel runtime, so replace it.
vi.mock("@vercel/functions", () => ({ attachDatabasePool: vi.fn() }));

const DATABASE_URL = "postgresql://user:pass@localhost:5432/crm";
const SECRET = "0123456789abcdef0123456789abcdef";

// Fresh modules per test: env, db and auth all cache in module state.
async function loadGetAuth() {
  vi.resetModules();
  const authModule = await import("./auth");
  return authModule.getAuth;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getAuth", () => {
  it("builds Better Auth from the validated environment", async () => {
    vi.stubEnv("DATABASE_URL", DATABASE_URL);
    vi.stubEnv("BETTER_AUTH_SECRET", SECRET);
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("VERCEL_BRANCH_URL", "crm-git-feat-x-dj.vercel.app");
    const getAuth = await loadGetAuth();

    const auth = getAuth();

    expect(auth.options.secret).toBe(SECRET);
    expect(auth.options.baseURL).toBe("https://crm-git-feat-x-dj.vercel.app");
    expect(auth.options.trustedOrigins).toEqual([
      "https://crm-git-feat-x-dj.vercel.app",
    ]);
  });

  it("defaults to localhost outside Vercel", async () => {
    vi.stubEnv("DATABASE_URL", DATABASE_URL);
    vi.stubEnv("BETTER_AUTH_SECRET", SECRET);
    vi.stubEnv("VERCEL_ENV", "");
    const getAuth = await loadGetAuth();

    expect(getAuth().options.baseURL).toBe("http://localhost:3000");
  });

  it("returns the same instance on every call", async () => {
    vi.stubEnv("DATABASE_URL", DATABASE_URL);
    vi.stubEnv("BETTER_AUTH_SECRET", SECRET);
    const getAuth = await loadGetAuth();

    expect(getAuth()).toBe(getAuth());
  });

  it("does nothing on import, so `next build` needs no secrets", async () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("BETTER_AUTH_SECRET", "");

    await expect(loadGetAuth()).resolves.toEqual(expect.any(Function));
  });

  it("fails with a clear error when the secret is missing", async () => {
    vi.stubEnv("DATABASE_URL", DATABASE_URL);
    vi.stubEnv("BETTER_AUTH_SECRET", "");
    const getAuth = await loadGetAuth();

    expect(() => getAuth()).toThrow(/BETTER_AUTH_SECRET/);
  });
});
