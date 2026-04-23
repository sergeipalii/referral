#!/usr/bin/env bash
# One-shot helper to initialise the restic repository on first run.
# Idempotent: if the repo already exists, reports and exits 0.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_lib.sh
. "$SCRIPT_DIR/_lib.sh"

main() {
  load_env
  require_bin restic

  if restic cat config >/dev/null 2>&1; then
    log "restic repo already initialised at ${RESTIC_REPOSITORY}"
    return 0
  fi

  log "initialising restic repo at ${RESTIC_REPOSITORY}"
  restic init
  log "done. Keep BACKUP_RESTIC_PASSWORD in a password manager — losing it"
  log "means every backup in this repo becomes unrecoverable."
}

main "$@"
