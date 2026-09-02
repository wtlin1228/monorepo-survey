#!/usr/bin/env node
const { createLogger } = require("@acme/logger");

const log = createLogger("info");
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");

function plan(env) {
  return [`fetch manifest for ${env}`, `push images for ${env}`, `restart services in ${env}`];
}

const env = args.find((a) => !a.startsWith("--")) ?? "staging";
for (const step of plan(env)) {
  log.info(dryRun ? `[dry-run] ${step}` : `[exec] ${step}`, { env });
}

module.exports = { plan };
