from stock_audit import audit_rows


def test_clean_rows_produce_no_findings():
    rows = [
        {"sku": "ABC-123456", "quantity": "4", "location": "A-01"},
        {"sku": "XYZ-000001", "quantity": "0", "location": "B-07"},
    ]
    assert audit_rows(rows) == []


def test_malformed_sku_is_flagged_with_line_number():
    findings = audit_rows([{"sku": "abc-12", "quantity": "1", "location": "A-01"}])
    assert len(findings) == 1
    assert findings[0].line == 2
    assert findings[0].problem == "malformed sku"


def test_duplicate_sku_points_at_first_occurrence():
    rows = [
        {"sku": "ABC-123456", "quantity": "1", "location": "A-01"},
        {"sku": "ABC-123456", "quantity": "2", "location": "A-02"},
    ]
    findings = audit_rows(rows)
    assert [f.problem for f in findings] == ["duplicate of line 2"]


def test_negative_and_non_integer_quantities():
    rows = [
        {"sku": "ABC-123456", "quantity": "-3", "location": "A-01"},
        {"sku": "XYZ-000001", "quantity": "many", "location": "A-02"},
    ]
    problems = {f.problem for f in audit_rows(rows)}
    assert problems == {"negative quantity -3", "quantity is not an integer"}
