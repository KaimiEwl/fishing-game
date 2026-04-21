#!/usr/bin/env bash
set -euo pipefail

PORT="${HOOKLOOT_BIND_PORT:-18181}"

for path in / /admin /guide /terms /privacy; do
  curl --fail --silent --show-error --max-time 10 "http://127.0.0.1:${PORT}${path}" >/dev/null
done

echo "[healthcheck] ok on 127.0.0.1:${PORT}"
