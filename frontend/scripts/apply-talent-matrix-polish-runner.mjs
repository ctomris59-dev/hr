import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const sourcePath = path.join(process.cwd(), "scripts", "apply-talent-matrix-polish.mjs");
const tempPath = path.join(os.tmpdir(), `apply-talent-matrix-polish-${process.pid}.mjs`);

let code = fs.readFileSync(sourcePath, "utf8");
code = code.replace(
  'aria-label={`${data.name} - ${data.boxLabel}`}',
  'aria-label={data.name + " - " + data.boxLabel}'
);

fs.writeFileSync(tempPath, code, "utf8");
try {
  await import(`${pathToFileURL(tempPath).href}?v=${Date.now()}`);
} finally {
  try { fs.unlinkSync(tempPath); } catch {}
}
