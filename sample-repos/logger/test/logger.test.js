const { test } = require("node:test");
const assert = require("node:assert/strict");

test("logger module loads", async () => {
  const { createLogger } = await import("../src/index.js");
  const log = createLogger("warn");
  assert.equal(typeof log.error, "function");
});
