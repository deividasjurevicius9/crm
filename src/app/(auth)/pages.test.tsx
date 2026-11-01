// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("./actions", () => ({
  signUpAction: vi.fn(),
  signInAction: vi.fn(),
}));

const signUp = await import("./sign-up/page");
const signIn = await import("./sign-in/page");

describe("sign-up page", () => {
  it("has a descriptive document title", () => {
    expect(signUp.metadata.title).toBe("Create account · CRM");
  });

  it("renders one main landmark with one level-1 heading", () => {
    render(<signUp.default />);

    const main = screen.getByRole("main");
    expect(
      within(main).getByRole("heading", {
        level: 1,
        name: "Create an account",
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("contains the sign-up form", () => {
    render(<signUp.default />);

    expect(
      screen.getByRole("button", { name: "Create account" }),
    ).toBeInTheDocument();
  });

  it("links to sign-in for existing users", () => {
    render(<signUp.default />);

    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/sign-in",
    );
  });
});

describe("sign-in page", () => {
  it("has a descriptive document title", () => {
    expect(signIn.metadata.title).toBe("Sign in · CRM");
  });

  it("renders one main landmark with one level-1 heading", () => {
    render(<signIn.default />);

    expect(
      within(screen.getByRole("main")).getByRole("heading", {
        level: 1,
        name: "Sign in",
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("contains the sign-in form", () => {
    render(<signIn.default />);

    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
  });

  it("links to sign-up for new users", () => {
    render(<signIn.default />);

    expect(screen.getByRole("link", { name: "Create one" })).toHaveAttribute(
      "href",
      "/sign-up",
    );
  });
});
