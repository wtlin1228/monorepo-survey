"""Shared fixtures. API_URL points at a running order-service (same
convention as api-contract-tests); the whole suite skips when it is down,
so a bare `pytest` never fails on a laptop without the environment up."""

import json
import os
import urllib.error
import urllib.request

import pytest

API_URL = os.environ.get("API_URL", "http://localhost:8080")


class ApiClient:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip("/")

    def request(self, method: str, path: str, body: dict | None = None):
        req = urllib.request.Request(
            f"{self.base_url}{path}",
            method=method,
            data=json.dumps(body).encode() if body is not None else None,
            headers={"content-type": "application/json"},
        )
        try:
            with urllib.request.urlopen(req, timeout=10) as res:
                return res.status, json.loads(res.read() or "null")
        except urllib.error.HTTPError as err:  # non-2xx still has a body
            return err.code, json.loads(err.read() or "null")

    def get(self, path: str):
        return self.request("GET", path)

    def post(self, path: str, body: dict):
        return self.request("POST", path, body)


@pytest.fixture(scope="session")
def api() -> ApiClient:
    client = ApiClient(API_URL)
    try:
        status, _ = client.get("/healthz")
    except OSError:
        pytest.skip(f"order-service not reachable at {API_URL} — start it first")
    if status != 200:
        pytest.skip(f"order-service unhealthy at {API_URL} (healthz -> {status})")
    return client
