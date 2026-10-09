#!/usr/bin/env bash
set -euo pipefail

URL="${1:-${PREVIEW_URL:-}}"

if [ -z "$URL" ]; then
  echo "Usage: $0 <url> or set PREVIEW_URL"
  exit 1
fi

echo "Running smoke test against $URL"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$URL")

if [ "$STATUS" != "200" ]; then
  echo "Smoke test failed: expected HTTP 200, got $STATUS"
  exit 1
fi

curl -s "$URL" | grep -q "Apoio à Rotina" || {
  echo "Smoke test failed: product name not found in response"
  exit 1
}

echo "Smoke test passed"
