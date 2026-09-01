# picking-e2e

End-to-end picking flow tests run against a deployed order-service (pytest counterpart to `api-contract-tests`). No build step, no npm, no package.json — `python3 -m pytest`, pointed at the environment via API_URL; skips cleanly when the service is down.
