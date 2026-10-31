import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

export interface SourceFile {
  readonly path: string;
  readonly content: string;
}

export interface RatioResult {
  readonly testLines: number;
  readonly sourceLines: number;
  readonly ratio: number;
}

export interface Report {
  readonly ok: boolean;
  readonly message: string;
}

export interface CliOptions {
  readonly root: string;
  readonly log: (message: string) => void;
  readonly dirs?: readonly string[];
  readonly minRatio?: number;
}

export const DEFAULT_DIRS: readonly string[] = ["src", "scripts", "e2e"];
export const DEFAULT_MIN_RATIO = 2;

const CODE_FILE = /\.(ts|tsx|mts)$/;
const TEST_FILE = /\.(test|spec)\.(ts|tsx)$/;
const SKIPPED_DIRS = new Set(["node_modules", ".next", "coverage"]);

function toPosix(path: string): string {
  return path.replaceAll("\\", "/");
}

export function isCodeFile(path: string): boolean {
  return CODE_FILE.test(path) && !path.endsWith(".d.ts");
}

export function isTestFile(path: string): boolean {
  return TEST_FILE.test(path) || toPosix(path).startsWith("e2e/");
}

/** Counts lines that contain code: blank lines and comment-only lines are ignored. */
export function countCodeLines(content: string): number {
  let count = 0;
  let inBlockComment = false;

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (inBlockComment) {
      const end = line.indexOf("*/");
      if (end !== -1) {
        inBlockComment = false;
        if (line.slice(end + 2).trim() !== "") count++;
      }
      continue;
    }

    if (line === "" || line.startsWith("//")) continue;

    if (line.startsWith("/*")) {
      const end = line.indexOf("*/", 2);
      if (end === -1) {
        inBlockComment = true;
      } else if (line.slice(end + 2).trim() !== "") {
        count++;
      }
      continue;
    }

    count++;
  }

  return count;
}

export function computeRatio(files: readonly SourceFile[]): RatioResult {
  let testLines = 0;
  let sourceLines = 0;

  for (const file of files) {
    if (!isCodeFile(file.path)) continue;
    const lines = countCodeLines(file.content);
    if (isTestFile(file.path)) {
      testLines += lines;
    } else {
      sourceLines += lines;
    }
  }

  const ratio =
    sourceLines === 0 ? Number.POSITIVE_INFINITY : testLines / sourceLines;
  return { testLines, sourceLines, ratio };
}

export function evaluate(result: RatioResult, minRatio: number): Report {
  const ok = result.ratio >= minRatio;
  const ratioText = Number.isFinite(result.ratio)
    ? result.ratio.toFixed(2)
    : "∞";
  const message = [
    `Test lines:   ${String(result.testLines)}`,
    `Source lines: ${String(result.sourceLines)}`,
    `Ratio:        ${ratioText} (minimum ${minRatio.toFixed(2)})`,
    ok ? "OK" : "FAIL: test-to-source ratio is below the minimum.",
  ].join("\n");
  return { ok, message };
}

export function collectFiles(
  root: string,
  dirs: readonly string[],
): SourceFile[] {
  const files: SourceFile[] = [];

  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!SKIPPED_DIRS.has(entry.name)) walk(fullPath);
      } else if (isCodeFile(entry.name)) {
        files.push({
          path: toPosix(relative(root, fullPath)),
          content: readFileSync(fullPath, "utf8"),
        });
      }
    }
  };

  for (const dir of dirs) {
    const fullDir = join(root, dir);
    if (existsSync(fullDir)) walk(fullDir);
  }

  return files;
}

/** Returns the process exit code: 0 when the ratio is high enough, 1 otherwise. */
export function runCli(options: CliOptions): number {
  const files = collectFiles(options.root, options.dirs ?? DEFAULT_DIRS);
  const report = evaluate(
    computeRatio(files),
    options.minRatio ?? DEFAULT_MIN_RATIO,
  );
  options.log(report.message);
  return report.ok ? 0 : 1;
}
