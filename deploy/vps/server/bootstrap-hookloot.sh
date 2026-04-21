#!/usr/bin/env bash
set -euo pipefail

SOURCE_DIR="${1:-/tmp/hookloot-bootstrap}"
ROOT_DIR="${2:-/opt/hookloot}"
REPO_DIR="${ROOT_DIR}/repo.git"
BIN_DIR="${ROOT_DIR}/bin"
RELEASES_DIR="${ROOT_DIR}/releases"
LOGS_DIR="${ROOT_DIR}/logs"
NPM_CACHE_DIR="${ROOT_DIR}/.npm"

required_files=(
  "${SOURCE_DIR}/deploy-hookloot.sh"
  "${SOURCE_DIR}/healthcheck.sh"
  "${SOURCE_DIR}/prune-releases.sh"
  "${SOURCE_DIR}/post-receive"
)

for file in "${required_files[@]}"; do
  if [[ ! -f "${file}" ]]; then
    echo "Missing bootstrap file: ${file}" >&2
    exit 1
  fi
done

command -v git >/dev/null 2>&1 || { echo "git is required on VPS" >&2; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "docker is required on VPS" >&2; exit 1; }
docker compose version >/dev/null 2>&1 || { echo "docker compose is required on VPS" >&2; exit 1; }

mkdir -p "${ROOT_DIR}" "${BIN_DIR}" "${RELEASES_DIR}" "${LOGS_DIR}" "${NPM_CACHE_DIR}"

if [[ ! -d "${REPO_DIR}" ]]; then
  git init --bare "${REPO_DIR}"
fi

install -m 0755 "${SOURCE_DIR}/deploy-hookloot.sh" "${BIN_DIR}/deploy-hookloot.sh"
install -m 0755 "${SOURCE_DIR}/healthcheck.sh" "${BIN_DIR}/healthcheck.sh"
install -m 0755 "${SOURCE_DIR}/prune-releases.sh" "${BIN_DIR}/prune-releases.sh"
install -m 0755 "${SOURCE_DIR}/post-receive" "${REPO_DIR}/hooks/post-receive"

if [[ ! -f "${ROOT_DIR}/.env.production" ]]; then
  cat > "${ROOT_DIR}/.env.production" <<'EOF'
VITE_BASE_PATH=/
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_WALLETCONNECT_PROJECT_ID=
EOF
  chmod 0600 "${ROOT_DIR}/.env.production"
fi

echo "Hook & Loot VPS bootstrap complete."
echo "Repo: ${REPO_DIR}"
echo "Env: ${ROOT_DIR}/.env.production"
echo "Next: fill env file, wire ingress, then push main to the VPS remote."
