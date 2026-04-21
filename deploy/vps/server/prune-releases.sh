#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="/opt/hookloot"
RELEASES_DIR="${ROOT_DIR}/releases"
CURRENT_TARGET="$(readlink -f "${ROOT_DIR}/current" || true)"
KEEP_COUNT="${HOOKLOOT_KEEP_RELEASES:-5}"

mapfile -t releases < <(find "${RELEASES_DIR}" -mindepth 1 -maxdepth 1 -type d | sort -r)

count=0
for release in "${releases[@]}"; do
  if [[ "${release}" == "${CURRENT_TARGET}" ]]; then
    continue
  fi

  count=$((count + 1))
  if (( count >= KEEP_COUNT )); then
    rm -rf "${release}"
  fi
done
