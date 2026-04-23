#!/usr/bin/env bash
# Hourly full backup: pg_dump -Fc → staging file → restic backup → B2.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_lib.sh
. "$SCRIPT_DIR/_lib.sh"

main() {
  load_env
  require_bin restic
  require_bin docker
  require_bin curl

  local hc_url="${BACKUP_HEALTHCHECK_BACKUP_URL:-}"
  ping_hc "$hc_url" "/start"

  # Use a trap so partial failures still hit healthchecks with /fail.
  local dump_file
  trap 'rc=$?; [ $rc -ne 0 ] && { log "backup FAILED (exit $rc)"; ping_hc "$hc_url" "/fail"; }; rm -f "${dump_file:-}"; exit $rc' EXIT

  mkdir -p "$BACKUP_STAGE_DIR"
  local ts
  ts="$(date -u +%Y%m%dT%H%M%SZ)"
  dump_file="$BACKUP_STAGE_DIR/refledger-$ts.pgc"

  log "dumping ${DB_DATABASE} → ${dump_file}"
  dump_to_file "$dump_file" -Fc

  log "backing up to restic repo ${RESTIC_REPOSITORY}"
  restic backup \
    --tag hourly \
    --tag "db:${DB_DATABASE}" \
    --host refledger \
    "$dump_file"

  log "backup OK"
  ping_hc "$hc_url"
}

main "$@"
