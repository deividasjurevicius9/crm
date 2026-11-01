// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Button } from "./button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card";
import { Input } from "./input";
import { Label } from "./label";

// shadcn/ui components are copied into the repo, so they are our code and
// tested like it: behaviour and accessibility, not exact class names.

describe("Button", () => {
  it("renders a native button with its label", () => {
    render(<Button>Save</Button>);

    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("forwards clicks", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);

    screen.getByRole("button").click();

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not fire clicks while disabled", () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Save
      </Button>,
    );

    screen.getByRole("button").click();

    expect(onClick).not.toHaveBeenCalled();
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("exposes the chosen variant and size as data attributes", () => {
    render(
      <Button variant="outline" size="sm">
        Save
      </Button>,
    );

    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("data-variant", "outline");
    expect(button).toHaveAttribute("data-size", "sm");
  });

  it("defaults to the default variant and size", () => {
    render(<Button>Save</Button>);

    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("data-variant", "default");
    expect(button).toHaveAttribute("data-size", "default");
  });

  it("merges a custom class name", () => {
    render(<Button className="w-full">Save</Button>);

    expect(screen.getByRole("button")).toHaveClass("w-full");
  });

  it("renders its child instead of a button with asChild", () => {
    render(
      <Button asChild>
        <a href="/sign-in">Sign in</a>
      </Button>,
    );

    const link = screen.getByRole("link", { name: "Sign in" });
    expect(link).toHaveAttribute("href", "/sign-in");
    expect(link).toHaveAttribute("data-slot", "button");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("Input and Label", () => {
  it("connects through htmlFor and id", () => {
    render(
      <>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" />
      </>,
    );

    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email");
  });

  it("marks the input slot and merges class names", () => {
    render(<Input aria-label="Name" className="max-w-xs" />);

    const input = screen.getByRole("textbox", { name: "Name" });
    expect(input).toHaveAttribute("data-slot", "input");
    expect(input).toHaveClass("max-w-xs");
  });

  it("marks the label slot", () => {
    render(<Label>Email</Label>);

    expect(screen.getByText("Email")).toHaveAttribute("data-slot", "label");
  });
});

describe("Card", () => {
  it("renders every part with its slot and content", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardDescription>Description</CardDescription>
          <CardAction>Action</CardAction>
        </CardHeader>
        <CardContent>Content</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>,
    );

    for (const [slot, text] of [
      ["card-title", "Title"],
      ["card-description", "Description"],
      ["card-action", "Action"],
      ["card-content", "Content"],
      ["card-footer", "Footer"],
    ] as const) {
      expect(screen.getByText(text)).toHaveAttribute("data-slot", slot);
    }
  });

  it("wraps everything in the card container", () => {
    const { container } = render(
      <Card className="max-w-sm">
        <CardHeader>Header</CardHeader>
      </Card>,
    );

    const card = container.firstElementChild;
    expect(card).toHaveAttribute("data-slot", "card");
    expect(card).toHaveClass("max-w-sm");
    expect(screen.getByText("Header")).toHaveAttribute(
      "data-slot",
      "card-header",
    );
  });
});
