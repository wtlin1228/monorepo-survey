import { fetchWithRetry } from "@acme/http-client";
import type { Order, Paginated } from "@acme/api-types";

export async function listOrders(): Promise<Paginated<Order>> {
  const res = await fetchWithRetry("/api/orders", { retries: 3, baseDelayMs: 200 });
  return res.json();
}
