"""End-to-end: run the CLI as a subprocess, the way CI and operators do."""

import json
import os
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]


def run_cli(*args: str) -> subprocess.CompletedProcess:
    env = dict(os.environ, PYTHONPATH=str(REPO_ROOT / "src"))
    return subprocess.run(
        [sys.executable, "-m", "stock_audit", *args],
        capture_output=True, text=True, env=env, cwd=REPO_ROOT,
    )


def write_csv(tmp_path: Path, body: str) -> Path:
    path = tmp_path / "stock.csv"
    path.write_text("sku,quantity,location\n" + body)
    return path


def test_clean_file_exits_zero(tmp_path):
    csv = write_csv(tmp_path, "ABC-123456,4,A-01\n")
    result = run_cli(str(csv))
    assert result.returncode == 0, result.stderr
    assert "0 finding(s)" in result.stdout


def test_bad_file_exits_one_with_findings(tmp_path):
    csv = write_csv(tmp_path, "ABC-123456,-2,A-01\nbogus,1,A-02\n")
    result = run_cli(str(csv))
    assert result.returncode == 1
    assert "negative quantity -2" in result.stdout
    assert "malformed sku" in result.stdout


def test_json_output_is_parseable(tmp_path):
    csv = write_csv(tmp_path, "bogus,1,A-01\n")
    result = run_cli(str(csv), "--json")
    findings = json.loads(result.stdout)
    assert findings[0]["problem"] == "malformed sku"
    assert findings[0]["line"] == 2
