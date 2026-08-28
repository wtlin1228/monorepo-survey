import { expect } from "chai";
import { isWeekend, addBusinessDays } from "../src";

describe("date-utils", () => {
  it("detects weekends", () => {
    expect(isWeekend(new Date("2026-08-29T00:00:00Z"))).to.equal(true);
  });

  it("skips weekends when adding business days", () => {
    const friday = new Date("2026-08-28T00:00:00Z");
    expect(addBusinessDays(friday, 1).getUTCDay()).to.equal(1);
  });
});
