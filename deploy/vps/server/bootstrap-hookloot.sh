#!/usr/bin/env bash
set -euo pipefail

SOURCE_DIR="${1:-/tmp/hookloot-bootstrap}"
ROOT_DIR="${2:-/opt/hookloot}"
REPO_DIR="${ROOT_DIR}/repo.git"
BIN_DIR="${ROOT_DIR}/bin"
RELEASES_DIR="${ROOT_DIR}/releases"
LOGS_DIR="${ROOT_DIR}/logs"
NPM_CACHE_DIR="${ROOT_DIR}/.npm"
BACKUPS_DIR="${ROOT_DIR}/backups"

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

mkdir -p "${ROOT_DIR}" "${BIN_DIR}" "${RELEASES_DIR}" "${LOGS_DIR}" "${NPM_CACHE_DIR}" "${ROOT_DIR}/data" "${BACKUPS_DIR}"

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
VITE_WALLETCONNECT_PROJECT_ID=
HOOKLOOT_SESSION_SECRET=
HOOKLOOT_RECEIVER_ADDRESS=0x0266Bd01196B04a7A57372Fc9fB2F34374E6327D
HOOKLOOT_ADMIN_WALLETS=0x0266Bd01196B04a7A57372Fc9fB2F34374E6327D
MONAD_RPC_URL=https://rpc.monad.xyz
EOF
  chmod 0600 "${ROOT_DIR}/.env.production"
fi

echo "Hook & Loot VPS bootstrap complete."
echo "Repo: ${REPO_DIR}"
echo "Env: ${ROOT_DIR}/.env.production"
echo "Next: fill env file, wire ingress, then push main to the VPS remote."
