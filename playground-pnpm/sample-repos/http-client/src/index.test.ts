import { describe, it, expect } from "vitest";
import { backoffDelays } from "./index";

describe("backoffDelays", () => {
  it("doubles each retry", () => {
    expect(backoffDelays({ retries: 3, baseDelayMs: 100 })).toEqual([100, 200, 400]);
  });
});
