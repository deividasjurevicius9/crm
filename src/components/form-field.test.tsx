// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FormAlert } from "./form-alert";
import { FormField } from "./form-field";

describe("FormField", () => {
  it("names the input with its label", () => {
    render(<FormField name="email" label="Email" />);

    expect(screen.getByLabelText("Email")).toHaveAttribute("name", "email");
  });

  it("derives a stable id from the field name", () => {
    render(<FormField name="email" label="Email" />);

    expect(screen.getByLabelText("Email")).toHaveAttribute("id", "field-email");
  });

  it("passes input attributes through", () => {
    render(
      <FormField
        name="password"
        label="Password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
      />,
    );

    const input = screen.getByLabelText("Password");
    expect(input).toHaveAttribute("type", "password");
    expect(input).toHaveAttribute("autocomplete", "new-password");
    expect(input).toBeRequired();
    expect(input).toHaveAttribute("minlength", "8");
  });

  it("shows a pre-filled value", () => {
    render(<FormField name="email" label="Email" defaultValue="ada@x.com" />);

    expect(screen.getByLabelText("Email")).toHaveValue("ada@x.com");
  });

  it("is valid and has no description without an error", () => {
    render(<FormField name="email" label="Email" />);

    const input = screen.getByLabelText("Email");
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(input).not.toHaveAttribute("aria-describedby");
  });

  it("marks the input invalid and links the error message to it", () => {
    render(
      <FormField name="email" label="Email" error="Enter a valid email." />,
    );

    const input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Enter a valid email.");
  });
});

describe("FormAlert", () => {
  it("renders nothing without a message", () => {
    const { container } = render(<FormAlert message={undefined} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("announces the message as an alert", () => {
    render(<FormAlert message="Invalid email or password." />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Invalid email or password.",
    );
  });
});
