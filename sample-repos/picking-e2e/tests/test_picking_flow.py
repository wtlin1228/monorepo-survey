"""End-to-end picking flow against a deployed order-service."""

import uuid


def test_health_endpoint_reports_ok(api):
    status, body = api.get("/healthz")
    assert status == 200
    assert body["ok"] is True


def test_created_order_starts_pending(api):
    order_id = str(uuid.uuid4())
    status, body = api.post(
        "/orders",
        {
            "id": order_id,
            "status": "pending",
            "quantity": 2,
            "lines": [{"sku": "ABC-123456", "quantity": 2}],
        },
    )
    assert status == 201
    assert body["id"] == order_id
    assert body["status"] == "pending"


def test_order_with_malformed_sku_is_rejected(api):
    status, _ = api.post(
        "/orders",
        {
            "id": str(uuid.uuid4()),
            "status": "pending",
            "quantity": 1,
            "lines": [{"sku": "not-a-sku", "quantity": 1}],
        },
    )
    assert status >= 400, "malformed SKUs must not create orders"
