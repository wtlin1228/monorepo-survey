const { test } = require("node:test");
const assert = require("node:assert/strict");
const { plan } = require("../src/main.js");

test("plan targets the given environment", () => {
  const steps = plan("prod");
  assert.equal(steps.length, 3);
  assert.ok(steps.every((s) => s.includes("prod")));
});
