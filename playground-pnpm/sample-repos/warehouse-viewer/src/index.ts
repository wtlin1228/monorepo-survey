import { fetchWithRetry } from "@acme/http-client";
import type { Order } from "@acme/api-types";

export function boot(): string {
  return "warehouse-viewer booted";
}

export async function loadActiveOrders(): Promise<Order[]> {
  const res = await fetchWithRetry("/api/orders?status=picking", { retries: 5, baseDelayMs: 1000 });
  return res.json();
}

console.log(boot());
