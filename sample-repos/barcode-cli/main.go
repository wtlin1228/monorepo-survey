// acme-barcode: validate and generate warehouse SKU barcodes.
//
//	acme-barcode check ABC-123456 [more...]   exit 1 if any SKU is invalid
//	acme-barcode gen --prefix ABC --count 3   print freshly numbered SKUs
package main

import (
	"flag"
	"fmt"
	"os"

	"acme.example/barcode-cli/internal/sku"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Fprintln(os.Stderr, "usage: acme-barcode <check|gen> ...")
		os.Exit(2)
	}

	switch os.Args[1] {
	case "check":
		if len(os.Args) < 3 {
			fmt.Fprintln(os.Stderr, "usage: acme-barcode check <sku> [sku...]")
			os.Exit(2)
		}
		bad := 0
		for _, s := range os.Args[2:] {
			if sku.Valid(s) {
				fmt.Printf("%s ok\n", s)
			} else {
				fmt.Printf("%s INVALID\n", s)
				bad++
			}
		}
		if bad > 0 {
			os.Exit(1)
		}
	case "gen":
		fs := flag.NewFlagSet("gen", flag.ExitOnError)
		prefix := fs.String("prefix", "ACM", "3-letter SKU prefix")
		count := fs.Int("count", 1, "number of SKUs to generate")
		start := fs.Int("start", 1, "first sequence number")
		fs.Parse(os.Args[2:])
		out, err := sku.Generate(*prefix, *start, *count)
		if err != nil {
			fmt.Fprintln(os.Stderr, "error:", err)
			os.Exit(2)
		}
		for _, s := range out {
			fmt.Println(s)
		}
	default:
		fmt.Fprintf(os.Stderr, "unknown command %q\n", os.Args[1])
		os.Exit(2)
	}
}
