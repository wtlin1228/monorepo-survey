// Package sku implements the acme SKU format: 3 uppercase letters, a dash,
// 6 digits (e.g. ABC-123456) — the same format the JS repos use in fixtures.
package sku

import (
	"fmt"
	"regexp"
)

var pattern = regexp.MustCompile(`^[A-Z]{3}-\d{6}$`)

func Valid(s string) bool {
	return pattern.MatchString(s)
}

func Generate(prefix string, start, count int) ([]string, error) {
	if len(prefix) != 3 || !regexp.MustCompile(`^[A-Z]{3}$`).MatchString(prefix) {
		return nil, fmt.Errorf("prefix must be 3 uppercase letters, got %q", prefix)
	}
	if start < 1 || count < 1 || start+count-1 > 999999 {
		return nil, fmt.Errorf("sequence out of range: start=%d count=%d", start, count)
	}
	out := make([]string, 0, count)
	for i := 0; i < count; i++ {
		out = append(out, fmt.Sprintf("%s-%06d", prefix, start+i))
	}
	return out, nil
}
