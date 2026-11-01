import { isValidElement, type ReactElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

// next/font/google only works inside the Next.js compiler, so the font loaders
// are replaced with stubs that return a predictable CSS variable class name.
vi.mock("next/font/google", () => ({
  Geist: (options: { variable: string }) => ({
    variable: `geist-sans${options.variable}`,
  }),
  Geist_Mono: (options: { variable: string }) => ({
    variable: `geist-mono${options.variable}`,
  }),
}));

vi.mock("./globals.css", () => ({}));

const { default: RootLayout, metadata } = await import("./layout");

interface HtmlProps {
  lang: string;
  className: string;
  children: ReactElement<{ className: string; children: ReactNode }>;
}

function renderLayout(children: ReactNode): ReactElement<HtmlProps> {
  const element: unknown = RootLayout({
    children,
    params: Promise.resolve({}),
  });
  if (!isValidElement<HtmlProps>(element)) {
    throw new Error("RootLayout did not return a React element");
  }
  return element;
}

describe("RootLayout", () => {
  it("renders an <html> element with the English language", () => {
    const html = renderLayout(null);

    expect(html.type).toBe("html");
    expect(html.props.lang).toBe("en");
  });

  it("applies both font CSS variables to <html>", () => {
    const html = renderLayout(null);

    expect(html.props.className).toContain("geist-sans--font-sans");
    expect(html.props.className).toContain("geist-mono--font-geist-mono");
  });

  it("applies full-height and antialiasing classes to <html>", () => {
    const classes = renderLayout(null).props.className.split(" ");

    expect(classes).toContain("h-full");
    expect(classes).toContain("antialiased");
  });

  it("renders a flex column <body>", () => {
    const body = renderLayout(null).props.children;

    expect(body.type).toBe("body");
    expect(body.props.className.split(" ")).toEqual(
      expect.arrayContaining(["flex", "min-h-full", "flex-col"]),
    );
  });

  it("renders the page content inside <body>", () => {
    const page = <p>page content</p>;

    const body = renderLayout(page).props.children;

    expect(body.props.children).toBe(page);
  });
});

describe("metadata", () => {
  it("sets the document title", () => {
    expect(metadata.title).toBe("CRM");
  });

  it("sets the document description", () => {
    expect(metadata.description).toBe(
      "Multi-tenant CRM for companies, contacts, deals and tasks.",
    );
  });
});
