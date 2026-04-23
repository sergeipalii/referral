# Shared helpers for Refledger backup scripts.
# Sourced by backup.sh / schema-dump.sh / prune.sh / restore-test.sh.
# Not executable on its own.

set -euo pipefail

# Resolve repo root from this file's location so scripts work no matter
# where cron invokes them from.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

log() {
  printf '[%s] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" >&2
}

die() {
  log "ERROR: $*"
  exit 1
}

load_env() {
  local env_file="$REPO_ROOT/.env"
  [ -f "$env_file" ] || die ".env not found at $env_file"
  set -a
  # shellcheck disable=SC1090
  . "$env_file"
  set +a

  : "${DB_USERNAME:?DB_USERNAME missing from .env}"
  : "${DB_DATABASE:?DB_DATABASE missing from .env}"
  : "${BACKUP_RESTIC_REPOSITORY:?BACKUP_RESTIC_REPOSITORY missing from .env}"
  : "${BACKUP_RESTIC_PASSWORD:?BACKUP_RESTIC_PASSWORD missing from .env}"
  : "${BACKUP_STAGE_DIR:=/var/backup/refledger/stage}"

  export RESTIC_REPOSITORY="$BACKUP_RESTIC_REPOSITORY"
  export RESTIC_PASSWORD="$BACKUP_RESTIC_PASSWORD"

  if [ -n "${BACKUP_B2_ACCOUNT_ID:-}" ]; then
    export B2_ACCOUNT_ID="$BACKUP_B2_ACCOUNT_ID"
    export B2_ACCOUNT_KEY="${BACKUP_B2_ACCOUNT_KEY:-}"
  fi
}

require_bin() {
  command -v "$1" >/dev/null 2>&1 || die "required binary missing: $1"
}

# Invoke docker compose from the repo root so it reads docker-compose.yml.
compose() {
  (cd "$REPO_ROOT" && docker compose "$@")
}

# Ping a healthchecks.io URL; no-op if empty. Accepts optional suffix
# (e.g. "/fail" or "/start") and optional stdin body.
ping_hc() {
  local url="$1"
  local suffix="${2:-}"
  [ -n "$url" ] || return 0
  if [ -t 0 ]; then
    curl -fsS -m 10 --retry 3 -o /dev/null "${url}${suffix}" || true
  else
    curl -fsS -m 10 --retry 3 --data-binary @- -o /dev/null "${url}${suffix}" || true
  fi
}

# Stream pg_dump from the running postgres container to a host file.
# Fails loudly if the pipe truncates (PIPESTATUS check).
dump_to_file() {
  local target="$1"
  shift # remaining args go to pg_dump
  compose exec -T postgres pg_dump \
    -U "$DB_USERNAME" -d "$DB_DATABASE" \
    --no-owner --no-privileges --clean --if-exists \
    --lock-wait-timeout=30000 \
    "$@" > "$target"
  # PIPESTATUS is not set after a simple redirection, but `set -o pipefail`
  # plus `set -e` already make the redirection fail on a non-zero exit.
  [ -s "$target" ] || die "pg_dump produced an empty file: $target"
}
