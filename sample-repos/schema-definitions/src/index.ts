import { z } from "zod";
import type { Order as ApiOrder } from "@acme/api-types";

export const OrderSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["pending", "picking", "packed", "shipped", "cancelled"]),
  quantity: z.number().int().positive(),
});

export type Order = z.infer<typeof OrderSchema>;

// Keep the runtime enum in sync with the static API contract.
export type OrderStatus = ApiOrder["status"];
const _statusCheck: OrderStatus = OrderSchema.shape.status.options[0];
void _statusCheck;
