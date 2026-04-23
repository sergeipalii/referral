#!/usr/bin/env bash
# Nightly schema-only dump. Small, human-readable, useful for cross-version
# restores and drift diagnosis. Runs alongside the hourly full dumps.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_lib.sh
. "$SCRIPT_DIR/_lib.sh"

main() {
  load_env
  require_bin restic
  require_bin docker

  local dump_file
  trap 'rc=$?; [ $rc -ne 0 ] && log "schema-dump FAILED (exit $rc)"; rm -f "${dump_file:-}"; exit $rc' EXIT

  mkdir -p "$BACKUP_STAGE_DIR"
  local ts
  ts="$(date -u +%Y%m%dT%H%M%SZ)"
  dump_file="$BACKUP_STAGE_DIR/refledger-schema-$ts.sql"

  log "dumping schema of ${DB_DATABASE} → ${dump_file}"
  dump_to_file "$dump_file" --schema-only

  log "backing up schema snapshot to restic"
  restic backup \
    --tag schema \
    --tag "db:${DB_DATABASE}" \
    --host refledger \
    "$dump_file"

  log "schema-dump OK"
}

main "$@"
