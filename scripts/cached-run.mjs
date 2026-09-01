#!/usr/bin/env node
// A from-scratch build cache for the sample repos: content-addressed local
// cache + optional remote cache, with task ordering and affected detection
// falling out of the cache-key design.
//
//   node scripts/cached-run.mjs                # cached `npm run build` across all repos
//   node scripts/cached-run.mjs --no-remote    # local cache only
//
// Cache key for a repo's build = sha256 of:
//   - content hashes of the repo's source files (outputs/node_modules excluded)
//   - the build command string
//   - the node major version + tool version
//   - the cache keys of its internal @acme/* dependencies (recursive!)
// The last line is what makes the dependency graph and affected detection part
// of the cache: editing @acme/logger changes the keys of every dependent task
// and nothing else.

import { spawnSync, execSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPOS_DIR = path.join(ROOT, "sample-repos");
const CACHE_DIR = path.join(ROOT, ".cache");
const REMOTE = process.argv.includes("--no-remote") ? null : "http://localhost:4874";
const TOKEN = process.env.CACHE_WRITE_TOKEN ?? "local-ci-token";
const TOOL_VERSION = "1";

// Directories/files that are outputs or ambient state, never inputs.
const IGNORED = new Set([
  "node_modules", ".git", "dist", "bin", ".next", "out", ".parcel-cache",
  "coverage", "storybook-static", "test-results", "playwright-report",
  "blob-report", ".cache",
]);
const IGNORED_FILES = /(\.tsbuildinfo|next-env\.d\.ts|\.log)$/;
// `lib` is build output for these repos (it is source in codegen-cli):
const LIB_IS_OUTPUT = new Set(["date-utils", "validation-helpers"]);

// Declared outputs per repo (default: dist/).
const OUTPUTS = {
  "date-utils": ["lib"],
  "validation-helpers": ["lib"],
  "deploy-cli": ["bin"],
  "admin-dashboard": [".next"],
};

fs.mkdirSync(CACHE_DIR, { recursive: true });

// ---- dependency graph, derived from package.json (no hand-maintained order) ----
// Non-npm repos (Go/Python/Rust) have no package.json and stay outside this
// npm-only graph — exactly the gap the "Non-JS tasks" comparison row is about.
const repos = fs.readdirSync(REPOS_DIR, { withFileTypes: true })
  .filter((e) => e.isDirectory()).map((e) => e.name).sort()
  .filter((r) => fs.existsSync(path.join(REPOS_DIR, r, "package.json")));
const pkgs = Object.fromEntries(repos.map((r) => [
  r, JSON.parse(fs.readFileSync(path.join(REPOS_DIR, r, "package.json"), "utf8")),
]));
const byName = Object.fromEntries(Object.entries(pkgs).map(([r, p]) => [p.name, r]));
const internalDeps = (r) =>
  Object.keys({ ...pkgs[r].dependencies, ...pkgs[r].devDependencies })
    .filter((d) => d in byName).map((d) => byName[d]);

function topoSort() {
  const order = [], state = {}; // 1=visiting 2=done
  const visit = (r, chain) => {
    if (state[r] === 2) return;
    if (state[r] === 1) throw new Error(`dependency cycle: ${[...chain, r].join(" -> ")}`);
    state[r] = 1;
    for (const d of internalDeps(r)) visit(d, [...chain, r]);
    state[r] = 2;
    order.push(r);
  };
  for (const r of repos) visit(r, []);
  return order;
}

// ---- cache key ----
function hashRepoFiles(repo) {
  const repoDir = path.join(REPOS_DIR, repo);
  const files = [];
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (IGNORED.has(e.name)) continue;
        if (e.name === "lib" && LIB_IS_OUTPUT.has(repo) && dir === repoDir) continue;
        walk(full);
      } else if (!IGNORED_FILES.test(e.name)) {
        files.push(full);
      }
    }
  })(repoDir);
  const h = crypto.createHash("sha256");
  for (const f of files) {
    h.update(path.relative(repoDir, f));
    h.update("\0");
    h.update(crypto.createHash("sha256").update(fs.readFileSync(f)).digest());
  }
  return h.digest("hex");
}

const keys = {};
function cacheKey(repo) {
  if (keys[repo]) return keys[repo];
  const depKeys = internalDeps(repo).sort().map((d) => `${d}:${cacheKey(d)}`);
  keys[repo] = crypto.createHash("sha256").update(JSON.stringify({
    tool: TOOL_VERSION,
    node: process.version.split(".")[0],
    repo,
    command: pkgs[repo].scripts?.build ?? null,
    inputs: hashRepoFiles(repo),
    deps: depKeys,
  })).digest("hex");
  return keys[repo];
}

// ---- local + remote store ----
const localPath = (key, ext) => path.join(CACHE_DIR, `${key}${ext}`);

async function remoteGet(key, ext) {
  if (!REMOTE) return null;
  try {
    const res = await fetch(`${REMOTE}/v1/artifacts/${key}${ext}`);
    return res.ok ? Buffer.from(await res.arrayBuffer()) : null;
  } catch { return null; }
}

async function remotePut(key, ext, body, attempt = 1) {
  if (!REMOTE) return;
  try {
    const res = await fetch(`${REMOTE}/v1/artifacts/${key}${ext}`, {
      method: "PUT", headers: { authorization: `Bearer ${TOKEN}` }, body,
    });
    if (res.status !== 201) console.warn(`  (remote upload of ${key.slice(0, 12)}${ext} rejected: ${res.status})`);
  } catch (err) {
    // A pooled connection can go stale while a long build runs; retry once fresh.
    if (attempt === 1) return remotePut(key, ext, body, 2);
    console.warn(`  (remote upload of ${key.slice(0, 12)}${ext} failed: ${err.cause?.code ?? err.message})`);
  }
}

function restore(repo, key) {
  const repoDir = path.join(REPOS_DIR, repo);
  for (const out of OUTPUTS[repo] ?? ["dist"]) fs.rmSync(path.join(repoDir, out), { recursive: true, force: true });
  execSync(`tar -xzf ${localPath(key, ".tar.gz")} -C ${repoDir}`);
}

// ---- main ----
const order = topoSort().filter((r) => pkgs[r].scripts?.build);
const stats = { built: 0, local: 0, remote: 0 };
const started = Date.now();

for (const repo of order) {
  const key = cacheKey(repo);
  const repoDir = path.join(REPOS_DIR, repo);
  const t0 = Date.now();

  if (fs.existsSync(localPath(key, ".tar.gz"))) {
    restore(repo, key);
    console.log(`${repo.padEnd(20)} HIT  (local)  ${key.slice(0, 12)}`);
    stats.local++;
    continue;
  }

  const [blob, meta] = await Promise.all([remoteGet(key, ".tar.gz"), remoteGet(key, ".json")]);
  if (blob) {
    fs.writeFileSync(localPath(key, ".tar.gz"), blob);
    if (meta) fs.writeFileSync(localPath(key, ".json"), meta);
    restore(repo, key);
    console.log(`${repo.padEnd(20)} HIT  (remote) ${key.slice(0, 12)}`);
    stats.remote++;
    continue;
  }

  const run = spawnSync("npm", ["run", "build"], { cwd: repoDir, encoding: "utf8" });
  if (run.status !== 0) {
    console.error(`${repo.padEnd(20)} FAILED\n${run.stdout}\n${run.stderr}`);
    process.exit(1);
  }
  const outputs = (OUTPUTS[repo] ?? ["dist"]).filter((o) => fs.existsSync(path.join(repoDir, o)));
  const exclude = repo === "admin-dashboard" ? "--exclude=.next/cache" : "";
  execSync(`tar -czf ${localPath(key, ".tar.gz")} ${exclude} -C ${repoDir} ${outputs.join(" ")}`);
  fs.writeFileSync(localPath(key, ".json"), JSON.stringify({
    repo, key, command: pkgs[repo].scripts.build, createdAt: new Date().toISOString(),
    durationMs: Date.now() - t0, outputs,
  }, null, 2));
  await remotePut(key, ".tar.gz", fs.readFileSync(localPath(key, ".tar.gz")));
  await remotePut(key, ".json", fs.readFileSync(localPath(key, ".json")));
  console.log(`${repo.padEnd(20)} MISS (built in ${((Date.now() - t0) / 1000).toFixed(1)}s) ${key.slice(0, 12)}`);
  stats.built++;
}

console.log(`\n${order.length} tasks: ${stats.built} executed, ${stats.local} local hits, ${stats.remote} remote hits — ${((Date.now() - started) / 1000).toFixed(1)}s total`);
