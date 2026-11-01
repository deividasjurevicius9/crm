// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthFormState } from "@/lib/validation/auth";

// The forms are tested on their own; the actions have their own tests.
const actions = vi.hoisted(() => ({
  signUpAction:
    vi.fn<(s: AuthFormState, f: FormData) => Promise<AuthFormState>>(),
  signInAction:
    vi.fn<(s: AuthFormState, f: FormData) => Promise<AuthFormState>>(),
}));
vi.mock("./actions", () => actions);

const { SignUpForm } = await import("./sign-up/sign-up-form");
const { SignInForm } = await import("./sign-in/sign-in-form");

// Valid values per input type, so the browser's own `required` / `type`
// validation lets the form through to the action.
const VALID_BY_TYPE: Record<string, string> = {
  email: "ada@example.com",
  password: "analytical engine",
  text: "Ada",
};

function fillEmptyRequiredFields() {
  for (const input of document.querySelectorAll<HTMLInputElement>(
    "input[required]",
  )) {
    if (input.value === "") {
      fireEvent.change(input, {
        target: { value: VALID_BY_TYPE[input.type] ?? "x" },
      });
    }
  }
}

async function submit(buttonName: RegExp) {
  fillEmptyRequiredFields();
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: buttonName }));
    await Promise.resolve();
  });
}

async function clickWithoutFilling(buttonName: RegExp) {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: buttonName }));
    await Promise.resolve();
  });
}

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

beforeEach(() => {
  actions.signUpAction.mockReset();
  actions.signInAction.mockReset();
});

describe("SignUpForm", () => {
  it("has name, email and password fields with the right autocomplete", () => {
    render(<SignUpForm />);

    expect(screen.getByLabelText("Name")).toHaveAttribute(
      "autocomplete",
      "name",
    );
    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("Password")).toHaveAttribute(
      "autocomplete",
      "new-password",
    );
  });

  it("asks the browser for the same password length the server enforces", () => {
    render(<SignUpForm />);

    const password = screen.getByLabelText("Password");
    expect(password).toHaveAttribute("minlength", "8");
    expect(password).toHaveAttribute("maxlength", "128");
  });

  it("marks every field as required", () => {
    render(<SignUpForm />);

    for (const label of ["Name", "Email", "Password"]) {
      expect(screen.getByLabelText(label)).toBeRequired();
    }
  });

  it("sends the typed values to the sign-up action", async () => {
    actions.signUpAction.mockResolvedValue({});
    render(<SignUpForm />);
    fill("Name", "Ada");
    fill("Email", "ada@example.com");
    fill("Password", "analytical engine");

    await submit(/create account/i);

    expect(actions.signUpAction).toHaveBeenCalledTimes(1);
    const formData = actions.signUpAction.mock.calls[0]?.[1];
    expect(formData?.get("name")).toBe("Ada");
    expect(formData?.get("email")).toBe("ada@example.com");
    expect(formData?.get("password")).toBe("analytical engine");
  });

  it("shows the errors the action returns next to the fields", async () => {
    actions.signUpAction.mockResolvedValue({
      fieldErrors: { email: "Enter a valid email address." },
      values: { name: "Ada", email: "bad" },
    });
    render(<SignUpForm />);

    await submit(/create account/i);

    expect(
      await screen.findByText("Enter a valid email address."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("shows a form-level error as an alert and keeps the typed values", async () => {
    actions.signUpAction.mockResolvedValue({
      error: "Could not create the account.",
      values: { name: "Ada", email: "ada@example.com" },
    });
    render(<SignUpForm />);

    await submit(/create account/i);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not create the account.",
    );
    expect(screen.getByLabelText("Name")).toHaveValue("Ada");
    expect(screen.getByLabelText("Email")).toHaveValue("ada@example.com");
    expect(screen.getByLabelText("Password")).toHaveValue("");
  });

  it("disables the button and says so while the request is in flight", async () => {
    let finish: (state: AuthFormState) => void = () => undefined;
    actions.signUpAction.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    render(<SignUpForm />);

    await submit(/create account/i);

    const button = screen.getByRole("button", { name: "Creating account…" });
    expect(button).toBeDisabled();

    await act(async () => {
      finish({});
      await Promise.resolve();
    });
    expect(
      screen.getByRole("button", { name: "Create account" }),
    ).toBeEnabled();
  });
});

describe("SignInForm", () => {
  it("has email and password fields with the right autocomplete", () => {
    render(<SignInForm />);

    expect(screen.getByLabelText("Email")).toHaveAttribute(
      "autocomplete",
      "email",
    );
    expect(screen.getByLabelText("Password")).toHaveAttribute(
      "autocomplete",
      "current-password",
    );
  });

  it("does not hint at password rules on sign-in", () => {
    render(<SignInForm />);

    expect(screen.getByLabelText("Password")).not.toHaveAttribute("minlength");
  });

  it("sends the typed values to the sign-in action", async () => {
    actions.signInAction.mockResolvedValue({});
    render(<SignInForm />);
    fill("Email", "ada@example.com");
    fill("Password", "secret");

    await submit(/sign in/i);

    const formData = actions.signInAction.mock.calls[0]?.[1];
    expect(formData?.get("email")).toBe("ada@example.com");
    expect(formData?.get("password")).toBe("secret");
  });

  it("shows the invalid-credentials error and keeps the email", async () => {
    actions.signInAction.mockResolvedValue({
      error: "Invalid email or password.",
      values: { email: "ada@example.com" },
    });
    render(<SignInForm />);

    await submit(/sign in/i);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Invalid email or password.",
    );
    expect(screen.getByLabelText("Email")).toHaveValue("ada@example.com");
  });

  it("shows field errors from the action", async () => {
    actions.signInAction.mockResolvedValue({
      fieldErrors: { password: "Enter your password." },
    });
    render(<SignInForm />);

    await submit(/sign in/i);

    expect(screen.getByLabelText("Password")).toHaveAccessibleDescription(
      "Enter your password.",
    );
  });

  it("disables the button while signing in", async () => {
    actions.signInAction.mockReturnValue(new Promise(() => undefined));
    render(<SignInForm />);

    await submit(/sign in/i);

    expect(screen.getByRole("button", { name: "Signing in…" })).toBeDisabled();
  });
});

describe("browser-side validation", () => {
  it("does not reach the sign-up action while required fields are empty", async () => {
    render(<SignUpForm />);

    await clickWithoutFilling(/create account/i);

    expect(actions.signUpAction).not.toHaveBeenCalled();
  });

  it("does not reach the sign-in action while required fields are empty", async () => {
    render(<SignInForm />);

    await clickWithoutFilling(/sign in/i);

    expect(actions.signInAction).not.toHaveBeenCalled();
  });
});
