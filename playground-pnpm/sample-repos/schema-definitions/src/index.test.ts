import { describe, it, expect } from "vitest";
import { OrderSchema } from "./index";

describe("OrderSchema", () => {
  it("rejects negative quantity", () => {
    const result = OrderSchema.safeParse({
      id: "6b7f1e6e-2f9a-4b64-9a6a-1f2d3c4b5a69",
      status: "pending",
      quantity: -1,
    });
    expect(result.success).toBe(false);
  });
});
