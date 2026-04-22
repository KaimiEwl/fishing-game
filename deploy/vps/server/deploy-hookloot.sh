#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="/opt/hookloot"
REPO_DIR="${ROOT_DIR}/repo.git"
RELEASES_DIR="${ROOT_DIR}/releases"
CURRENT_LINK="${ROOT_DIR}/current"
ENV_FILE="${ROOT_DIR}/.env.production"
LOG_FILE="${ROOT_DIR}/logs/deploy.log"
COMPOSE_PROJECT_NAME="hookloot"

REVISION="${1:-refs/heads/main}"
TIMESTAMP="$(date -u +%Y%m%d%H%M%S)"
SHORT_REVISION="$(printf '%s' "${REVISION}" | cut -c1-7)"
RELEASE_DIR="${RELEASES_DIR}/${TIMESTAMP}-${SHORT_REVISION}"
PREVIOUS_TARGET="$(readlink -f "${CURRENT_LINK}" || true)"

mkdir -p "${RELEASE_DIR}" "${ROOT_DIR}/logs" "${ROOT_DIR}/.npm"

exec > >(tee -a "${LOG_FILE}") 2>&1

echo "[deploy] release=${RELEASE_DIR} revision=${REVISION}"

cleanup_failed_release() {
  if [[ -L "${CURRENT_LINK}" || -e "${CURRENT_LINK}" ]]; then
    rm -f "${CURRENT_LINK}"
  fi

  if [[ -n "${PREVIOUS_TARGET}" && -d "${PREVIOUS_TARGET}" ]]; then
    ln -sfn "${PREVIOUS_TARGET}" "${CURRENT_LINK}"
    docker compose -p "${COMPOSE_PROJECT_NAME}" -f "${CURRENT_LINK}/deploy/vps/compose.yml" up -d --force-recreate hookloot-web || true
  fi
}

trap cleanup_failed_release ERR

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "[deploy] missing ${ENV_FILE}" >&2
  exit 1
fi

git --git-dir="${REPO_DIR}" --work-tree="${RELEASE_DIR}" checkout -f "${REVISION}" -- .
cp "${ENV_FILE}" "${RELEASE_DIR}/.env.production"

docker run --rm \
  -u 0:0 \
  -v "${RELEASE_DIR}:/workspace" \
  -v "${ROOT_DIR}/.npm:/root/.npm" \
  --env-file "${ENV_FILE}" \
  -w /workspace \
  node:20-bookworm \
  bash -lc "npm ci && npm run build"

test -f "${RELEASE_DIR}/dist/index.html"

ln -sfn "${RELEASE_DIR}" "${CURRENT_LINK}"
docker compose -p "${COMPOSE_PROJECT_NAME}" -f "${CURRENT_LINK}/deploy/vps/compose.yml" up -d --force-recreate hookloot-web
"${ROOT_DIR}/bin/healthcheck.sh"
"${ROOT_DIR}/bin/prune-releases.sh"
"${ROOT_DIR}/bin/healthcheck.sh"

echo "[deploy] success release=${RELEASE_DIR}"
