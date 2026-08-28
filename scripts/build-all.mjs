#!/usr/bin/env node
// Verify every sample repo installs and builds.
// Requires the local registry to be running (internal @acme/* deps resolve from it).
//
// Usage: node scripts/build-all.mjs

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "sample-repos");

try {
  execSync("curl -sf http://localhost:4873/-/ping", { stdio: "pipe" });
} catch {
  console.error("registry not reachable at http://localhost:4873 — start it with: cd registry && npm start");
  process.exit(1);
}

const results = [];
const repos = fs
  .readdirSync(ROOT, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort();

for (const repo of repos) {
  const pkgDir = path.join(ROOT, repo);
  const pkg = JSON.parse(fs.readFileSync(path.join(pkgDir, "package.json"), "utf8"));
  const hasBuild = Boolean(pkg.scripts?.build);
  process.stdout.write(`${repo} ... `);
  try {
    execSync("npm install --no-fund --no-audit", { cwd: pkgDir, stdio: "pipe", encoding: "utf8" });
    if (hasBuild) {
      execSync("npm run build", { cwd: pkgDir, stdio: "pipe", encoding: "utf8" });
      console.log("built");
      results.push([repo, "built"]);
    } else {
      console.log("no build script (install only)");
      results.push([repo, "no build script"]);
    }
  } catch (err) {
    console.log("FAILED");
    console.error(`\n--- ${repo} failure ---`);
    console.error((err.stdout ?? "") + (err.stderr ?? ""));
    results.push([repo, "FAILED"]);
  }
}

const failed = results.filter(([, status]) => status === "FAILED");
console.log(`\n${results.length} repos: ${results.length - failed.length} ok, ${failed.length} failed`);
if (failed.length > 0) {
  console.log("failed:", failed.map(([r]) => r).join(", "));
  process.exit(1);
}
