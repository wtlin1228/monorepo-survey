//go:build e2e

// End-to-end tests: build the real binary and drive it like a user would.
// Run with: go test -tags e2e ./e2e/  (or `make e2e`)
package e2e

import (
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

func buildCLI(t *testing.T) string {
	t.Helper()
	bin := filepath.Join(t.TempDir(), "acme-barcode")
	cmd := exec.Command("go", "build", "-o", bin, "acme.example/barcode-cli")
	cmd.Dir = ".."
	if out, err := cmd.CombinedOutput(); err != nil {
		t.Fatalf("go build failed: %v\n%s", err, out)
	}
	return bin
}

func TestCheckValidAndInvalid(t *testing.T) {
	bin := buildCLI(t)

	out, err := exec.Command(bin, "check", "ABC-123456").CombinedOutput()
	if err != nil {
		t.Fatalf("valid SKU should exit 0: %v\n%s", err, out)
	}
	if !strings.Contains(string(out), "ABC-123456 ok") {
		t.Errorf("unexpected output: %s", out)
	}

	out, err = exec.Command(bin, "check", "ABC-123456", "bogus").CombinedOutput()
	if err == nil {
		t.Fatalf("invalid SKU should exit non-zero, got 0\n%s", out)
	}
	if !strings.Contains(string(out), "bogus INVALID") {
		t.Errorf("unexpected output: %s", out)
	}
}

func TestGenPipesIntoCheck(t *testing.T) {
	bin := buildCLI(t)

	out, err := exec.Command(bin, "gen", "--prefix", "WHS", "--count", "5", "--start", "100").Output()
	if err != nil {
		t.Fatalf("gen failed: %v", err)
	}
	skus := strings.Fields(string(out))
	if len(skus) != 5 || skus[0] != "WHS-000100" {
		t.Fatalf("unexpected gen output: %q", skus)
	}

	if out, err := exec.Command(bin, append([]string{"check"}, skus...)...).CombinedOutput(); err != nil {
		t.Errorf("generated SKUs failed their own check: %v\n%s", err, out)
	}
}
