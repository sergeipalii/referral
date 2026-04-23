#!/usr/bin/env bash
# Weekly retention: enforce tiered keep policy and reclaim storage.
# --keep-last 3 is a safety floor — a clock glitch can't empty the repo.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_lib.sh
. "$SCRIPT_DIR/_lib.sh"

main() {
  load_env
  require_bin restic
  require_bin curl

  local hc_url="${BACKUP_HEALTHCHECK_PRUNE_URL:-}"
  ping_hc "$hc_url" "/start"
  trap 'rc=$?; [ $rc -ne 0 ] && { log "prune FAILED (exit $rc)"; ping_hc "$hc_url" "/fail"; }; exit $rc' EXIT

  log "applying retention to ${RESTIC_REPOSITORY}"
  restic forget \
    --tag hourly \
    --keep-last 3 \
    --keep-hourly 24 \
    --keep-daily 7 \
    --keep-weekly 4 \
    --keep-monthly 12 \
    --prune

  # Keep the last 30 schema snapshots — they are tiny and history is useful.
  restic forget --tag schema --keep-last 30 --prune

  log "prune OK"
  ping_hc "$hc_url"
}

main "$@"
