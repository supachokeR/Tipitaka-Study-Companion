import fs from "node:fs";
import vm from "node:vm";

export function loadSrc(files, extra = {}) {
  const sandbox = { console, ...extra };
  sandbox.globalThis = sandbox;
  for (const file of files) {
    vm.runInNewContext(fs.readFileSync(file, "utf8"), sandbox, { filename: file });
  }
  return sandbox.TSC;
}
