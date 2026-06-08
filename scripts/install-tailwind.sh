#!/bin/bash
set -e

ARCH=$(uname -m)
case "$ARCH" in
    x86_64) ASSET="tailwindcss-linux-x64" ;;
    aarch64|arm64) ASSET="tailwindcss-linux-arm64" ;;
    *) echo "Unsupported architecture: $ARCH" >&2; exit 1 ;;
esac

curl -sLo tailwindcss "https://github.com/tailwindlabs/tailwindcss/releases/latest/download/$ASSET"
chmod +x tailwindcss
echo "Tailwind CLI installed at ./tailwindcss ($ASSET)"
./tailwindcss --help | head -n 1
