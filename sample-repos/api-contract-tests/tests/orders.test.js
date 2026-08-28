const request = require("supertest");

const api = () => request(process.env.API_URL ?? "http://localhost:8080");

describe("orders API contract", () => {
  it("health endpoint responds", async () => {
    const res = await api().get("/healthz");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("ok", true);
  });

  it("created orders match the shared schema", async () => {
    const { OrderSchema } = await import("@acme/schema-definitions");
    const res = await api()
      .post("/orders")
      .send({
        id: "6b7f1e6e-2f9a-4b64-9a6a-1f2d3c4b5a69",
        status: "pending",
        quantity: 2,
        lines: [{ sku: "ABC-123456", quantity: 2 }],
      });
    expect(res.status).toBe(201);
    expect(OrderSchema.safeParse(res.body).success).toBe(true);
  });
});
