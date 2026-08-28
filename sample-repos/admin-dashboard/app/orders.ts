import { fetchWithRetry } from "@acme/http-client";
import type { Order } from "@acme/api-types";

export async function fetchOrders(): Promise<Order[]> {
  const res = await fetchWithRetry("/api/orders", { retries: 2, baseDelayMs: 500 });
  return res.json();
}
