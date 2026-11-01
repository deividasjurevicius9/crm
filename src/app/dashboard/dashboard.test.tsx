// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CurrentUser } from "@/lib/session";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn<() => Promise<CurrentUser>>(),
  signOutAction: vi.fn<() => Promise<void>>(),
}));
vi.mock("@/lib/session", () => ({ requireUser: mocks.requireUser }));
vi.mock("../(auth)/actions", () => ({ signOutAction: mocks.signOutAction }));

const page = await import("./page");
const { Welcome } = await import("./welcome");

const ADA: CurrentUser = { id: "u1", name: "Ada", email: "ada@example.com" };

beforeEach(() => {
  mocks.requireUser.mockReset();
});

describe("dashboard page", () => {
  it("has a descriptive document title", () => {
    expect(page.metadata.title).toBe("Dashboard · CRM");
  });

  it("shows a loading state while the session is being checked", () => {
    mocks.requireUser.mockReturnValue(new Promise(() => undefined));

    render(<page.default />);

    expect(screen.getByRole("main")).toHaveTextContent("Loading…");
  });
});

describe("Welcome", () => {
  it("greets the signed-in user by name and shows their email", async () => {
    mocks.requireUser.mockResolvedValue(ADA);

    render(await Welcome());

    expect(
      screen.getByRole("heading", { level: 1, name: "Welcome, Ada" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Signed in as ada@example.com"),
    ).toBeInTheDocument();
  });

  it("offers a sign-out button", async () => {
    mocks.requireUser.mockResolvedValue(ADA);

    render(await Welcome());

    expect(screen.getByRole("button", { name: "Sign out" })).toHaveAttribute(
      "type",
      "submit",
    );
  });

  it("asks the Data Access Layer for the user (the real session check)", async () => {
    mocks.requireUser.mockResolvedValue(ADA);

    await Welcome();

    expect(mocks.requireUser).toHaveBeenCalledTimes(1);
  });

  it("does not render when the session check redirects", async () => {
    mocks.requireUser.mockRejectedValue(new Error("NEXT_REDIRECT /sign-in"));

    await expect(Welcome()).rejects.toThrow("NEXT_REDIRECT");
  });
});
