import { test } from "node:test";
import assert from "node:assert/strict";
import { app } from "../src/server.ts";

test("app is created", () => {
  assert.ok(app);
});
