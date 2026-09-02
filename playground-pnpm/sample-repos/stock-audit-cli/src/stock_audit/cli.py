import argparse
import json
from dataclasses import asdict

from stock_audit.audit import audit_file


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="acme-stock-audit")
    parser.add_argument("csv_file", help="stock export with columns sku,quantity,location")
    parser.add_argument("--json", action="store_true", help="machine-readable output")
    args = parser.parse_args(argv)

    findings = audit_file(args.csv_file)
    if args.json:
        print(json.dumps([asdict(f) for f in findings], indent=2))
    else:
        for f in findings:
            print(f"line {f.line}: {f.sku or '<empty>'}: {f.problem}")
        print(f"{len(findings)} finding(s)")
    return 1 if findings else 0
