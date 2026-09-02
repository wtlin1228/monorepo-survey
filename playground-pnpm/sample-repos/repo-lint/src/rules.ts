import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

export function findMissingReadmes(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith("."))
    .filter((e) => !existsSync(join(dir, e.name, "README.md")))
    .map((e) => e.name);
}
