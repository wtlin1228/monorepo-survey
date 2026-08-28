#!/usr/bin/env node
// Publish every @acme/* sample package to the local Verdaccio registry.
//
// Usage:
//   node scripts/publish-all.mjs           # quick mode: publish as-is (--ignore-scripts, no builds)
//   node scripts/publish-all.mjs --build   # full mode: npm install + run lifecycle builds before publish
//
// Each package is published at its current version, plus seeded "historical"
// versions so consumers pinned to older majors (admin-dashboard, warehouse-viewer)
// can still resolve. Already-published versions are skipped, so re-runs are safe.

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REGISTRY = process.env.REGISTRY_URL ?? "http://localhost:4873/";
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "sample-repos");
const BUILD = process.argv.includes("--build");

// Topological order (leaves first). [dir, [historical versions to seed before the current one]]
const PACKAGES = [
  ["design-tokens", ["2.0.2"]],
  ["icons", []],
  ["api-types", ["6.5.2"]],
  ["date-utils", []],
  ["logger", []],
  ["validation-helpers", []],
  ["schema-definitions", []],
  ["http-client", ["1.9.5", "2.1.4"]],
  ["ui-components", ["4.9.3"]],
  ["charts", []],
  ["repo-lint", []],
  ["deploy-cli", []],
  ["codegen-cli", []],
];

function run(cmd, cwd) {
  execSync(cmd, { cwd, stdio: "pipe", encoding: "utf8" });
}

function alreadyPublished(name, version) {
  try {
    run(`npm view ${name}@${version} version --registry ${REGISTRY}`, ROOT);
    return true;
  } catch {
    return false;
  }
}

try {
  run(`curl -sf ${REGISTRY}-/ping`, ROOT);
} catch {
  console.error(`registry not reachable at ${REGISTRY} — start it with: cd registry && npm start`);
  process.exit(1);
}

for (const [dir, historical] of PACKAGES) {
  const pkgDir = path.join(ROOT, dir);
  const pkgFile = path.join(pkgDir, "package.json");
  const original = fs.readFileSync(pkgFile, "utf8");
  const pkg = JSON.parse(original);

  if (BUILD) {
    // Install deps (internal @acme/* deps resolve from packages published earlier
    // in this same topological run), then build explicitly: `npm publish` only runs
    // lifecycle hooks (prepare/prepack/prepublishOnly), never a plain "build" script.
    console.log(`[install] ${pkg.name}`);
    // Purge any previously installed @acme/* state first: npm trusts existing
    // node_modules + lockfiles over the registry, so a republished version
    // (possible on the local registry, unlike npmjs) would otherwise be ignored.
    for (const stale of ["node_modules/@acme", "node_modules/.package-lock.json", "package-lock.json"]) {
      fs.rmSync(path.join(pkgDir, stale), { recursive: true, force: true });
    }
    // --prefer-online revalidates cached registry metadata for the same reason.
    run("npm install --no-fund --no-audit --prefer-online", pkgDir);
    console.log(`[build]   ${pkg.name}`);
    run("npm run build --if-present", pkgDir);
  }

  const versions = [...historical, pkg.version];
  for (const version of versions) {
    if (alreadyPublished(pkg.name, version)) {
      console.log(`[skip]    ${pkg.name}@${version} (already in registry)`);
      continue;
    }
    try {
      fs.writeFileSync(pkgFile, JSON.stringify({ ...pkg, version }, null, 2) + "\n");
      const flags = BUILD ? "" : "--ignore-scripts";
      run(`npm publish ${flags} --access public --registry ${REGISTRY}`, pkgDir);
      console.log(`[publish] ${pkg.name}@${version}`);
    } finally {
      fs.writeFileSync(pkgFile, original);
    }
  }
}

console.log("\nall packages published. Browse them at " + REGISTRY);
