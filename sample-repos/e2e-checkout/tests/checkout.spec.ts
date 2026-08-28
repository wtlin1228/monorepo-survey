import { test, expect } from "@playwright/test";
import type { Order } from "@acme/api-types";

const fixtureOrder: Order = {
  id: "order-e2e-1",
  status: "pending",
  lines: [{ sku: "ABC-123456", quantity: 2 }],
  createdAt: "2026-08-27T00:00:00Z",
};

test("guest can reach the checkout page", async ({ page }) => {
  await page.route("**/api/orders", (route) =>
    route.fulfill({ json: { items: [fixtureOrder], cursor: null } })
  );
  await page.goto("/checkout");
  await expect(page.getByRole("heading", { name: /checkout/i })).toBeVisible();
});
