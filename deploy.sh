#!/bin/bash
set -e

APP_NAME="imob"
BINARY="imob-app"
MAIN="./cmd/imob-app"
CSS_IN="internal/assets/static/css/input.css"
CSS_OUT="internal/assets/static/css/output.css"

echo "→ Generating templates..."
$(go env GOPATH)/bin/templ generate

echo "→ Building CSS..."
./tailwindcss -i "$CSS_IN" -o "$CSS_OUT" --minify

echo "→ Building React frontend..."
(cd frontend && npm run build)

echo "→ Building..."
go build -o "$BINARY" "$MAIN"

echo "→ Restarting service..."
sudo systemctl restart "$APP_NAME"

echo "→ Done. Status:"
sudo systemctl status "$APP_NAME" --no-pager -l
