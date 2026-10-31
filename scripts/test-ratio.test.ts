import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CliOptions } from "./test-ratio/lib.ts";

const runCli = vi.fn<(options: CliOptions) => number>();

vi.mock("./test-ratio/lib.ts", () => ({ runCli }));

describe("scripts/test-ratio.ts entry point", () => {
  beforeEach(() => {
    vi.resetModules();
    runCli.mockReset();
    process.exitCode = undefined;
  });

  afterEach(() => {
    process.exitCode = undefined;
    vi.restoreAllMocks();
  });

  it("runs the CLI against the current working directory", async () => {
    runCli.mockReturnValue(0);

    await import("./test-ratio.ts");

    expect(runCli).toHaveBeenCalledOnce();
    expect(runCli.mock.calls[0]?.[0].root).toBe(process.cwd());
  });

  it("sets exit code 0 when the CLI passes", async () => {
    runCli.mockReturnValue(0);

    await import("./test-ratio.ts");

    expect(process.exitCode).toBe(0);
  });

  it("sets exit code 1 when the CLI fails", async () => {
    runCli.mockReturnValue(1);

    await import("./test-ratio.ts");

    expect(process.exitCode).toBe(1);
  });

  it("forwards report messages to console.log", async () => {
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {
      // silence output during the test
    });
    runCli.mockImplementation((options) => {
      options.log("report text");
      return 0;
    });

    await import("./test-ratio.ts");

    expect(consoleLog).toHaveBeenCalledWith("report text");
  });
});
