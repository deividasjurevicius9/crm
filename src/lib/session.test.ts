import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  requestHeaders: new Headers({ cookie: "better-auth.session_token=abc" }),
  order: [] as string[],
}));

class RedirectError extends Error {
  readonly url: string;

  constructor(url: string) {
    super(`NEXT_REDIRECT ${url}`);
    this.url = url;
  }
}

vi.mock("./auth", () => ({
  getAuth: () => {
    mocks.order.push("getAuth");
    return { api: { getSession: mocks.getSession } };
  },
}));
vi.mock("next/headers", () => ({
  headers: () => {
    mocks.order.push("headers");
    return Promise.resolve(mocks.requestHeaders);
  },
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new RedirectError(url);
  },
}));

const { getCurrentUser, requireUser } = await import("./session");

const SESSION = {
  session: { id: "s1", token: "secret-token", userId: "u1" },
  user: {
    id: "u1",
    name: "Ada",
    email: "ada@example.com",
    emailVerified: false,
    image: null,
  },
};

beforeEach(() => {
  mocks.getSession.mockReset();
  mocks.order = [];
});

describe("getCurrentUser", () => {
  it("returns the signed-in user", async () => {
    mocks.getSession.mockResolvedValue(SESSION);

    expect(await getCurrentUser()).toEqual({
      id: "u1",
      name: "Ada",
      email: "ada@example.com",
    });
  });

  it("returns only id, name and email: never the session token", async () => {
    mocks.getSession.mockResolvedValue(SESSION);

    const user = await getCurrentUser();

    expect(Object.keys(user ?? {})).toEqual(["id", "name", "email"]);
    expect(JSON.stringify(user)).not.toContain("secret-token");
  });

  it("returns null when there is no valid session", async () => {
    mocks.getSession.mockResolvedValue(null);

    expect(await getCurrentUser()).toBeNull();
  });

  it("passes the incoming request headers (the cookie) to Better Auth", async () => {
    mocks.getSession.mockResolvedValue(null);

    await getCurrentUser();

    expect(mocks.getSession).toHaveBeenCalledWith({
      headers: mocks.requestHeaders,
    });
  });

  it("reads the request headers before touching auth, so build-time prerendering stops first", async () => {
    mocks.getSession.mockResolvedValue(null);

    await getCurrentUser();

    expect(mocks.order).toEqual(["headers", "getAuth"]);
  });
});

describe("requireUser", () => {
  it("returns the user when signed in", async () => {
    mocks.getSession.mockResolvedValue(SESSION);

    expect((await requireUser()).id).toBe("u1");
  });

  it("redirects to /sign-in when signed out", async () => {
    mocks.getSession.mockResolvedValue(null);

    await expect(requireUser()).rejects.toThrow(RedirectError);
    await expect(requireUser()).rejects.toMatchObject({ url: "/sign-in" });
  });

  it("propagates a database failure instead of treating it as signed out", async () => {
    mocks.getSession.mockRejectedValue(new Error("database down"));

    await expect(requireUser()).rejects.toThrow("database down");
  });
});
