"""Audit rules for stock CSV exports (columns: sku, quantity, location)."""

import csv
import re
from dataclasses import dataclass
from typing import Iterable

SKU_PATTERN = re.compile(r"^[A-Z]{3}-\d{6}$")  # same format as the JS fixtures: ABC-123456


@dataclass
class Finding:
    line: int
    sku: str
    problem: str


def audit_rows(rows: Iterable[dict]) -> list[Finding]:
    findings: list[Finding] = []
    seen: dict[str, int] = {}
    for line, row in enumerate(rows, start=2):  # line 1 is the header
        sku = (row.get("sku") or "").strip()
        if not SKU_PATTERN.match(sku):
            findings.append(Finding(line, sku, "malformed sku"))
        if sku in seen:
            findings.append(Finding(line, sku, f"duplicate of line {seen[sku]}"))
        else:
            seen[sku] = line
        try:
            quantity = int(row.get("quantity", ""))
        except ValueError:
            findings.append(Finding(line, sku, "quantity is not an integer"))
            continue
        if quantity < 0:
            findings.append(Finding(line, sku, f"negative quantity {quantity}"))
    return findings


def audit_file(path: str) -> list[Finding]:
    with open(path, newline="") as f:
        return audit_rows(csv.DictReader(f))
