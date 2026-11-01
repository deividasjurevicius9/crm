import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { config, proxy } from "./proxy";

function request(path: string, cookie?: string) {
  return new NextRequest(`https://crm.example.com${path}`, {
    headers: cookie === undefined ? {} : { cookie },
  });
}

describe("proxy", () => {
  it("redirects to /sign-in when there is no session cookie", () => {
    const response = proxy(request("/dashboard"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://crm.example.com/sign-in",
    );
  });

  it("lets the request through when a session cookie is present", () => {
    const response = proxy(
      request("/dashboard", "better-auth.session_token=abc.def"),
    );

    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("recognises the __Secure- cookie Better Auth sets on HTTPS", () => {
    const response = proxy(
      request("/dashboard", "__Secure-better-auth.session_token=abc.def"),
    );

    expect(response.headers.get("location")).toBeNull();
  });

  it("ignores unrelated cookies", () => {
    const response = proxy(request("/dashboard", "theme=dark; other=1"));

    expect(response.headers.get("location")).toBe(
      "https://crm.example.com/sign-in",
    );
  });

  it("protects nested dashboard pages too", () => {
    expect(proxy(request("/dashboard/settings")).headers.get("location")).toBe(
      "https://crm.example.com/sign-in",
    );
  });
});

describe("proxy config", () => {
  it("runs only on the dashboard, never on the auth pages", () => {
    expect(config.matcher).toEqual(["/dashboard", "/dashboard/:path*"]);
    expect(config.matcher).not.toContain("/sign-in");
    expect(config.matcher).not.toContain("/sign-up");
  });
});
