import { beforeEach, describe, expect, it, vi } from "vitest";

const { handler } = vi.hoisted(() => ({
  handler: vi.fn<(request: Request) => Promise<Response>>(),
}));
vi.mock("@/lib/auth", () => ({ getAuth: () => ({ handler }) }));

const { GET, POST } = await import("./route");

beforeEach(() => {
  handler.mockReset();
  handler.mockResolvedValue(new Response("ok", { status: 200 }));
});

describe("/api/auth/[...all]", () => {
  it.each([
    ["GET", GET, "http://localhost:3000/api/auth/get-session"],
    ["POST", POST, "http://localhost:3000/api/auth/sign-in/email"],
  ] as const)(
    "%s passes the request to Better Auth unchanged",
    async (method, route, url) => {
      const request = new Request(url, { method });

      await route(request);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(request);
    },
  );

  it("returns Better Auth's response as is", async () => {
    const response = new Response('{"error":"nope"}', { status: 401 });
    handler.mockResolvedValue(response);

    const result = await POST(
      new Request("http://localhost:3000/api/auth/sign-in/email", {
        method: "POST",
      }),
    );

    expect(result).toBe(response);
    expect(result.status).toBe(401);
  });

  it("propagates a failure instead of hiding it", async () => {
    handler.mockRejectedValue(new Error("database down"));

    await expect(
      GET(new Request("http://localhost:3000/api/auth/get-session")),
    ).rejects.toThrow("database down");
  });
});
