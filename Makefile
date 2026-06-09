.PHONY: generate build test run

TAILWIND := ./tailwindcss
CSS_IN := internal/assets/static/css/input.css
CSS_OUT := internal/assets/static/css/output.css

generate:
	templ generate
	$(TAILWIND) -i $(CSS_IN) -o $(CSS_OUT) --minify

build: generate
	cd frontend && npm run build
	go build -o imob-app ./cmd/imob-app

test: generate
	go test ./...

run: generate
	go run ./cmd/imob-app
