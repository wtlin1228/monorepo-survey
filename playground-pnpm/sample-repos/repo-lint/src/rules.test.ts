import { describe, it, expect } from "vitest";
import { findMissingReadmes } from "./rules";

describe("findMissingReadmes", () => {
  it("returns an array", () => {
    expect(Array.isArray(findMissingReadmes("."))).toBe(true);
  });
});
