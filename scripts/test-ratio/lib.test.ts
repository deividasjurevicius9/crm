import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_DIRS,
  DEFAULT_MIN_RATIO,
  collectFiles,
  computeRatio,
  countCodeLines,
  evaluate,
  isCodeFile,
  isTestFile,
  runCli,
} from "./lib.ts";

describe("isCodeFile", () => {
  it.each(["a.ts", "src/app/page.tsx", "vitest.config.mts"])(
    "accepts %s",
    (path) => {
      expect(isCodeFile(path)).toBe(true);
    },
  );

  it.each([
    "next-env.d.ts",
    "src/types/global.d.ts",
    "README.md",
    "eslint.config.mjs",
    "styles.css",
    "data.json",
  ])("rejects %s", (path) => {
    expect(isCodeFile(path)).toBe(false);
  });
});

describe("isTestFile", () => {
  it.each([
    "src/app/page.test.tsx",
    "scripts/lib.test.ts",
    "src/lib/util.spec.ts",
    "e2e/home.spec.ts",
    "e2e/helpers/login.ts",
    "e2e\\windows\\path.ts",
  ])("treats %s as a test file", (path) => {
    expect(isTestFile(path)).toBe(true);
  });

  it.each([
    "src/app/page.tsx",
    "scripts/test-ratio.ts",
    "src/latest.ts",
    "src/e2e/not-root.ts",
    "src/contest.tsx",
  ])("treats %s as a source file", (path) => {
    expect(isTestFile(path)).toBe(false);
  });
});

describe("countCodeLines", () => {
  it("returns 0 for an empty string", () => {
    expect(countCodeLines("")).toBe(0);
  });

  it("counts plain code lines", () => {
    expect(countCodeLines("const a = 1;\nconst b = 2;\n")).toBe(2);
  });

  it("ignores blank and whitespace-only lines", () => {
    expect(countCodeLines("a();\n\n   \n\t\nb();")).toBe(2);
  });

  it("handles Windows line endings", () => {
    expect(countCodeLines("a();\r\n\r\nb();\r\n")).toBe(2);
  });

  it("ignores line comments, including indented ones", () => {
    expect(countCodeLines("// top\n  // indented\na();")).toBe(1);
  });

  it("counts code that has a trailing line comment", () => {
    expect(countCodeLines("a(); // call a")).toBe(1);
  });

  it("ignores a single-line block comment", () => {
    expect(countCodeLines("/* note */\na();")).toBe(1);
  });

  it("counts code after a single-line block comment", () => {
    expect(countCodeLines("/* note */ a();")).toBe(1);
  });

  it("ignores every line of a multi-line block comment", () => {
    const content = ["/**", " * Docs.", " * More docs.", " */", "a();"].join(
      "\n",
    );
    expect(countCodeLines(content)).toBe(1);
  });

  it("counts code that follows the end of a multi-line block comment", () => {
    expect(countCodeLines("/* start\n middle\n end */ a();")).toBe(1);
  });

  it("treats '/**/' as an empty comment", () => {
    expect(countCodeLines("/**/\na();")).toBe(1);
  });

  it("keeps ignoring lines while a block comment is unterminated", () => {
    expect(countCodeLines("/* never closed\na();\nb();")).toBe(0);
  });

  it("does not treat '/*' inside a code line as a comment start", () => {
    expect(countCodeLines('const glob = "src/*";\nb();')).toBe(2);
  });
});

describe("computeRatio", () => {
  it("splits lines between test and source files", () => {
    const result = computeRatio([
      { path: "src/a.ts", content: "a();\nb();" },
      { path: "src/a.test.ts", content: "t1();\nt2();\nt3();\nt4();" },
    ]);
    expect(result).toEqual({ testLines: 4, sourceLines: 2, ratio: 2 });
  });

  it("counts e2e files as tests", () => {
    const result = computeRatio([
      { path: "src/a.ts", content: "a();" },
      { path: "e2e/home.spec.ts", content: "t();\nt();\nt();" },
    ]);
    expect(result.testLines).toBe(3);
    expect(result.ratio).toBe(3);
  });

  it("skips files that are not code files", () => {
    const result = computeRatio([
      { path: "src/a.ts", content: "a();" },
      { path: "README.md", content: "lots\nof\ntext" },
      { path: "next-env.d.ts", content: "declare const x: 1;" },
    ]);
    expect(result).toEqual({ testLines: 0, sourceLines: 1, ratio: 0 });
  });

  it("returns an infinite ratio when there is no source code", () => {
    const result = computeRatio([{ path: "src/a.test.ts", content: "t();" }]);
    expect(result.sourceLines).toBe(0);
    expect(result.ratio).toBe(Number.POSITIVE_INFINITY);
  });

  it("returns an infinite ratio for an empty file list", () => {
    expect(computeRatio([]).ratio).toBe(Number.POSITIVE_INFINITY);
  });
});

describe("evaluate", () => {
  it("passes when the ratio equals the minimum", () => {
    const report = evaluate({ testLines: 4, sourceLines: 2, ratio: 2 }, 2);
    expect(report.ok).toBe(true);
    expect(report.message).toContain("OK");
  });

  it("passes when the ratio is above the minimum", () => {
    expect(evaluate({ testLines: 9, sourceLines: 3, ratio: 3 }, 2).ok).toBe(
      true,
    );
  });

  it("fails when the ratio is below the minimum", () => {
    const report = evaluate({ testLines: 3, sourceLines: 2, ratio: 1.5 }, 2);
    expect(report.ok).toBe(false);
    expect(report.message).toContain("FAIL");
  });

  it("includes all numbers in the message with two decimals", () => {
    const report = evaluate(
      { testLines: 10, sourceLines: 3, ratio: 10 / 3 },
      2,
    );
    expect(report.message).toContain("Test lines:   10");
    expect(report.message).toContain("Source lines: 3");
    expect(report.message).toContain("Ratio:        3.33 (minimum 2.00)");
  });

  it("prints an infinite ratio as the infinity symbol", () => {
    const report = evaluate(
      { testLines: 1, sourceLines: 0, ratio: Number.POSITIVE_INFINITY },
      2,
    );
    expect(report.ok).toBe(true);
    expect(report.message).toContain("Ratio:        ∞");
  });
});

describe("filesystem helpers", () => {
  let root: string;

  const write = (relativePath: string, content: string): void => {
    const fullPath = join(root, relativePath);
    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, content);
  };

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "test-ratio-"));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  describe("collectFiles", () => {
    it("collects code files recursively with POSIX relative paths", () => {
      write("src/app/page.tsx", "page();");
      write("src/app/deep/nested/util.ts", "util();");

      const files = collectFiles(root, ["src"]);
      const paths = files.map((file) => file.path).sort();

      expect(paths).toEqual([
        "src/app/deep/nested/util.ts",
        "src/app/page.tsx",
      ]);
      expect(files.find((file) => file.path === "src/app/page.tsx")).toEqual({
        path: "src/app/page.tsx",
        content: "page();",
      });
    });

    it("ignores non-code and declaration files", () => {
      write("src/a.ts", "a();");
      write("src/styles.css", "body {}");
      write("src/types.d.ts", "declare const x: 1;");

      expect(collectFiles(root, ["src"]).map((file) => file.path)).toEqual([
        "src/a.ts",
      ]);
    });

    it.each(["node_modules", ".next", "coverage"])(
      "skips the %s directory",
      (skipped) => {
        write("src/a.ts", "a();");
        write(`src/${skipped}/b.ts`, "b();");

        expect(collectFiles(root, ["src"]).map((file) => file.path)).toEqual([
          "src/a.ts",
        ]);
      },
    );

    it("skips directories that do not exist", () => {
      write("src/a.ts", "a();");

      expect(
        collectFiles(root, ["src", "missing"]).map((file) => file.path),
      ).toEqual(["src/a.ts"]);
    });

    it("returns an empty list when no directory exists", () => {
      expect(collectFiles(root, ["nothing", "here"])).toEqual([]);
    });

    it("only reads the requested directories", () => {
      write("src/a.ts", "a();");
      write("other/b.ts", "b();");

      expect(collectFiles(root, ["src"]).map((file) => file.path)).toEqual([
        "src/a.ts",
      ]);
    });
  });

  describe("runCli", () => {
    it("returns 0 and logs the report when the ratio is high enough", () => {
      write("src/a.ts", "a();");
      write("src/a.test.ts", "t();\nt();");
      const log = vi.fn<(message: string) => void>();

      const exitCode = runCli({ root, log });

      expect(exitCode).toBe(0);
      expect(log).toHaveBeenCalledOnce();
      expect(log.mock.calls[0]?.[0]).toContain("OK");
    });

    it("returns 1 when the ratio is below the default minimum", () => {
      write("src/a.ts", "a();\nb();");
      write("src/a.test.ts", "t();");
      const log = vi.fn<(message: string) => void>();

      expect(runCli({ root, log })).toBe(1);
      expect(log.mock.calls[0]?.[0]).toContain("FAIL");
    });

    it("respects a custom minimum ratio", () => {
      write("src/a.ts", "a();\nb();");
      write("src/a.test.ts", "t();");

      expect(runCli({ root, log: vi.fn(), minRatio: 0.5 })).toBe(0);
    });

    it("respects custom directories", () => {
      write("src/a.ts", "a();\nb();\nc();");
      write("lib/b.ts", "b();");
      write("lib/b.test.ts", "t();\nt();");

      expect(runCli({ root, log: vi.fn(), dirs: ["lib"] })).toBe(0);
    });

    it("reads src, scripts and e2e by default", () => {
      write("src/a.ts", "a();");
      write("scripts/b.ts", "b();");
      write("e2e/home.spec.ts", "t();\nt();\nt();\nt();");
      write("other/ignored.ts", "x();\nx();\nx();");
      const log = vi.fn<(message: string) => void>();

      expect(runCli({ root, log })).toBe(0);
      expect(log.mock.calls[0]?.[0]).toContain("Source lines: 2");
    });
  });
});

describe("defaults", () => {
  it("uses a minimum ratio of 2", () => {
    expect(DEFAULT_MIN_RATIO).toBe(2);
  });

  it("scans src, scripts and e2e", () => {
    expect(DEFAULT_DIRS).toEqual(["src", "scripts", "e2e"]);
  });
});
