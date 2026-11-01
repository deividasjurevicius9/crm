import { describe, expect, it } from "vitest";

import { resolveAuthOrigins } from "./auth-origins";

const PRODUCTION_HOST = "crm-nu-tawny-81.vercel.app";
const DEPLOYMENT_HOST = "crm-abc123-dj.vercel.app";
const BRANCH_HOST = "crm-git-feat-login-dj.vercel.app";

describe("resolveAuthOrigins: local development", () => {
  it("defaults to http://localhost:3000 when nothing is set", () => {
    expect(resolveAuthOrigins({})).toEqual({
      baseURL: "http://localhost:3000",
      trustedOrigins: ["http://localhost:3000"],
    });
  });

  it("uses localhost when VERCEL_ENV is development (vercel dev)", () => {
    expect(resolveAuthOrigins({ VERCEL_ENV: "development" }).baseURL).toBe(
      "http://localhost:3000",
    );
  });
});

describe("resolveAuthOrigins: production", () => {
  const production = {
    VERCEL_ENV: "production",
    VERCEL_URL: DEPLOYMENT_HOST,
    VERCEL_PROJECT_PRODUCTION_URL: PRODUCTION_HOST,
  } as const;

  it("uses the production domain as base URL", () => {
    expect(resolveAuthOrigins(production).baseURL).toBe(
      `https://${PRODUCTION_HOST}`,
    );
  });

  it("trusts the production domain and the unique deployment URL", () => {
    expect(resolveAuthOrigins(production).trustedOrigins).toEqual([
      `https://${PRODUCTION_HOST}`,
      `https://${DEPLOYMENT_HOST}`,
    ]);
  });

  it("falls back to the deployment URL without a production domain", () => {
    expect(
      resolveAuthOrigins({
        VERCEL_ENV: "production",
        VERCEL_URL: DEPLOYMENT_HOST,
      }).baseURL,
    ).toBe(`https://${DEPLOYMENT_HOST}`);
  });

  it("falls back to localhost if Vercel set no hostnames at all", () => {
    expect(resolveAuthOrigins({ VERCEL_ENV: "production" }).baseURL).toBe(
      "http://localhost:3000",
    );
  });
});

describe("resolveAuthOrigins: preview", () => {
  const preview = {
    VERCEL_ENV: "preview",
    VERCEL_URL: DEPLOYMENT_HOST,
    VERCEL_BRANCH_URL: BRANCH_HOST,
    // Vercel sets this on previews too; it must not become trusted there.
    VERCEL_PROJECT_PRODUCTION_URL: PRODUCTION_HOST,
  } as const;

  it("uses the stable branch URL as base URL", () => {
    expect(resolveAuthOrigins(preview).baseURL).toBe(`https://${BRANCH_HOST}`);
  });

  it("trusts the branch URL and the deployment URL", () => {
    expect(resolveAuthOrigins(preview).trustedOrigins).toEqual([
      `https://${BRANCH_HOST}`,
      `https://${DEPLOYMENT_HOST}`,
    ]);
  });

  it("never trusts the production domain from a preview", () => {
    expect(resolveAuthOrigins(preview).trustedOrigins).not.toContain(
      `https://${PRODUCTION_HOST}`,
    );
  });

  it("falls back to the deployment URL without a branch URL", () => {
    expect(
      resolveAuthOrigins({ VERCEL_ENV: "preview", VERCEL_URL: DEPLOYMENT_HOST })
        .baseURL,
    ).toBe(`https://${DEPLOYMENT_HOST}`);
  });

  it("falls back to localhost if Vercel set no hostnames at all", () => {
    expect(resolveAuthOrigins({ VERCEL_ENV: "preview" }).baseURL).toBe(
      "http://localhost:3000",
    );
  });
});

describe("resolveAuthOrigins: explicit BETTER_AUTH_URL", () => {
  it("wins over the Vercel variables", () => {
    expect(
      resolveAuthOrigins({
        BETTER_AUTH_URL: "https://crm.example.com",
        VERCEL_ENV: "production",
        VERCEL_PROJECT_PRODUCTION_URL: PRODUCTION_HOST,
      }).baseURL,
    ).toBe("https://crm.example.com");
  });

  it("is reduced to its origin: no path, no trailing slash", () => {
    expect(
      resolveAuthOrigins({ BETTER_AUTH_URL: "https://crm.example.com/app/" })
        .baseURL,
    ).toBe("https://crm.example.com");
  });

  it("is listed once even when it equals a Vercel hostname", () => {
    const { trustedOrigins } = resolveAuthOrigins({
      BETTER_AUTH_URL: `https://${DEPLOYMENT_HOST}`,
      VERCEL_ENV: "preview",
      VERCEL_URL: DEPLOYMENT_HOST,
    });

    expect(trustedOrigins).toEqual([`https://${DEPLOYMENT_HOST}`]);
  });
});
