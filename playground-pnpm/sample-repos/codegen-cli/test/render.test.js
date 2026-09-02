const assert = require("assert");
const { renderTemplate } = require("../lib/render");

describe("renderTemplate", () => {
  it("interpolates the name", () => {
    const output = renderTemplate("service", { name: "Order" });
    assert.ok(output.includes("class OrderService"));
  });
});
