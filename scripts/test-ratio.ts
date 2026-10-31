import { runCli } from "./test-ratio/lib.ts";

process.exitCode = runCli({
  root: process.cwd(),
  log: (message) => {
    console.log(message);
  },
});
