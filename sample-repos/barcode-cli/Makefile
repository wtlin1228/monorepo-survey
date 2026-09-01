BIN := bin/acme-barcode

.PHONY: build test e2e clean

build:
	go build -o $(BIN) .

test:
	go test ./...

e2e:
	go test -tags e2e ./e2e/

clean:
	rm -rf bin
