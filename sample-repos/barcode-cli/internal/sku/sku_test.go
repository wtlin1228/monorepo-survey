package sku

import "testing"

func TestValid(t *testing.T) {
	cases := map[string]bool{
		"ABC-123456":  true,
		"XYZ-000001":  true,
		"abc-123456":  false,
		"ABC-12345":   false,
		"ABC-1234567": false,
		"ABCD-123456": false,
		"ABC_123456":  false,
		"":            false,
	}
	for in, want := range cases {
		if got := Valid(in); got != want {
			t.Errorf("Valid(%q) = %v, want %v", in, got, want)
		}
	}
}

func TestGenerate(t *testing.T) {
	got, err := Generate("ABC", 41, 3)
	if err != nil {
		t.Fatal(err)
	}
	want := []string{"ABC-000041", "ABC-000042", "ABC-000043"}
	for i := range want {
		if got[i] != want[i] {
			t.Errorf("Generate[%d] = %q, want %q", i, got[i], want[i])
		}
		if !Valid(got[i]) {
			t.Errorf("Generate produced invalid SKU %q", got[i])
		}
	}
}

func TestGenerateRejectsBadPrefix(t *testing.T) {
	for _, p := range []string{"ab", "ABCD", "ab1", "abc"} {
		if _, err := Generate(p, 1, 1); err == nil {
			t.Errorf("Generate(%q) should fail", p)
		}
	}
}
