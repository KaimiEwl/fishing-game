#!/usr/bin/env bash
set -euo pipefail

PORT="${HOOKLOOT_BIND_PORT:-18181}"
PATHS=(/ /admin /guide /terms /privacy)

for path in "${PATHS[@]}"; do
  healthy=0

  for attempt in {1..20}; do
    if curl --fail --silent --show-error --max-time 5 "http://127.0.0.1:${PORT}${path}" >/dev/null; then
      healthy=1
      break
    fi

    echo "[healthcheck] waiting for ${path} on 127.0.0.1:${PORT} (attempt ${attempt}/20)" >&2
    sleep 1
  done

  if [[ "${healthy}" != "1" ]]; then
    echo "[healthcheck] failed ${path} on 127.0.0.1:${PORT}" >&2
    exit 1
  fi
done

echo "[healthcheck] ok on 127.0.0.1:${PORT}"
