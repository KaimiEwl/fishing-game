#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="/opt/hookloot"
REPO_DIR="${ROOT_DIR}/repo.git"
RELEASES_DIR="${ROOT_DIR}/releases"
CURRENT_LINK="${ROOT_DIR}/current"
ENV_FILE="${ROOT_DIR}/.env.production"
DATA_DIR="${ROOT_DIR}/data"
BACKUPS_DIR="${ROOT_DIR}/backups"
LOG_FILE="${ROOT_DIR}/logs/deploy.log"
COMPOSE_PROJECT_NAME="hookloot"
KEEP_BACKUPS="${HOOKLOOT_KEEP_BACKUPS:-20}"

REVISION="${1:-refs/heads/main}"
TIMESTAMP="$(date -u +%Y%m%d%H%M%S)"
SHORT_REVISION="$(printf '%s' "${REVISION}" | cut -c1-7)"
RELEASE_DIR="${RELEASES_DIR}/${TIMESTAMP}-${SHORT_REVISION}"
PREVIOUS_TARGET="$(readlink -f "${CURRENT_LINK}" || true)"

mkdir -p "${RELEASE_DIR}" "${ROOT_DIR}/logs" "${ROOT_DIR}/.npm" "${DATA_DIR}" "${BACKUPS_DIR}"

exec > >(tee -a "${LOG_FILE}") 2>&1

echo "[deploy] release=${RELEASE_DIR} revision=${REVISION}"

cleanup_failed_release() {
  if [[ -L "${CURRENT_LINK}" || -e "${CURRENT_LINK}" ]]; then
    rm -f "${CURRENT_LINK}"
  fi

  if [[ -n "${PREVIOUS_TARGET}" && -d "${PREVIOUS_TARGET}" ]]; then
    ln -sfn "${PREVIOUS_TARGET}" "${CURRENT_LINK}"
    docker compose -p "${COMPOSE_PROJECT_NAME}" -f "${CURRENT_LINK}/deploy/vps/compose.yml" up -d --build --force-recreate hookloot-api hookloot-web || true
  fi
}

trap cleanup_failed_release ERR

create_data_backup() {
  if [[ -z "$(find "${DATA_DIR}" -mindepth 1 -maxdepth 1 -print -quit 2>/dev/null)" ]]; then
    echo "[deploy] data backup skipped: ${DATA_DIR} is empty"
    return
  fi

  local backup_file="${BACKUPS_DIR}/hookloot-data-${TIMESTAMP}.tar.gz"
  local previous_compose_file=""

  if [[ -n "${PREVIOUS_TARGET}" && -f "${PREVIOUS_TARGET}/deploy/vps/compose.yml" ]]; then
    previous_compose_file="${PREVIOUS_TARGET}/deploy/vps/compose.yml"
    echo "[deploy] stopping hookloot-api for a consistent data backup"
    docker compose -p "${COMPOSE_PROJECT_NAME}" -f "${previous_compose_file}" stop hookloot-api || true
  fi

  tar -C "${DATA_DIR}" -czf "${backup_file}" .
  chmod 0600 "${backup_file}"
  echo "[deploy] data backup created: ${backup_file}"

  local count=0
  while IFS= read -r backup; do
    count=$((count + 1))
    if (( count > KEEP_BACKUPS )); then
      rm -f "${backup}"
    fi
  done < <(find "${BACKUPS_DIR}" -mindepth 1 -maxdepth 1 -type f -name 'hookloot-data-*.tar.gz' | sort -r)
}

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

create_data_backup
ln -sfn "${RELEASE_DIR}" "${CURRENT_LINK}"
docker compose -p "${COMPOSE_PROJECT_NAME}" -f "${CURRENT_LINK}/deploy/vps/compose.yml" up -d --build --force-recreate hookloot-api hookloot-web
"${ROOT_DIR}/bin/healthcheck.sh"
"${ROOT_DIR}/bin/prune-releases.sh"
"${ROOT_DIR}/bin/healthcheck.sh"

echo "[deploy] success release=${RELEASE_DIR}"
