import express from "express";
import { createLogger } from "@acme/logger";
import { OrderSchema } from "@acme/schema-definitions";
import { isSku } from "@acme/validation-helpers";
import type { Order } from "@acme/api-types";

const log = createLogger("info");
export const app = express();
app.use(express.json());

app.get("/healthz", (_req, res) => {
  res.json({ ok: true });
});

app.post("/orders", (req, res) => {
  const parsed = OrderSchema.safeParse(req.body);
  if (!parsed.success || !req.body.lines?.every((l: Order["lines"][number]) => isSku(l.sku))) {
    res.status(400).json({ error: "invalid order" });
    return;
  }
  log.info("order accepted", { id: parsed.data.id });
  res.status(201).json(parsed.data);
});

if (process.env.NODE_ENV !== "test") {
  app.listen(8080, () => log.info("order-service listening", { port: 8080 }));
}
