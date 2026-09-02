import { describe, it, expect } from "vitest";
import { Button } from "./Button";

describe("Button", () => {
  it("exports a component", () => {
    expect(Button).toBeTypeOf("function");
  });
});
