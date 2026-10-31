// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HomePage from "./page";

describe("HomePage", () => {
  it("renders exactly one main landmark", () => {
    render(<HomePage />);

    expect(screen.getAllByRole("main")).toHaveLength(1);
  });

  it("renders the product name as the only level-1 heading", () => {
    render(<HomePage />);

    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent("CRM");
  });

  it("describes what the product does", () => {
    render(<HomePage />);

    expect(
      screen.getByText(
        "Multi-tenant CRM for companies, contacts, deals and tasks.",
      ),
    ).toBeInTheDocument();
  });

  it("shows the under-construction status", () => {
    render(<HomePage />);

    expect(screen.getByText("Under construction.")).toBeInTheDocument();
  });

  it("places all content inside the main landmark", () => {
    render(<HomePage />);

    const main = screen.getByRole("main");
    expect(main).toContainElement(screen.getByRole("heading", { level: 1 }));
    expect(main).toContainElement(screen.getByText("Under construction."));
  });
});
