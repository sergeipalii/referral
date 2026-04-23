#!/usr/bin/env bash
# Monthly verification: restore the latest hourly snapshot into a throwaway
# postgres container, run real sanity queries, tear down. Proves backups
# are restorable end-to-end — otherwise they are Schrödinger's backups.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_lib.sh
. "$SCRIPT_DIR/_lib.sh"

# Random-ish port in the ephemeral range, avoids collisions with the live DB.
readonly TEST_PORT="${RESTORE_TEST_PORT:-54329}"
readonly TEST_CONTAINER="refledger-restore-test-$$"
readonly TEST_DB="restore_test"
readonly TEST_USER="restore_test"
readonly TEST_PASSWORD="restore_test_pw"

cleanup() {
  local rc=$?
  if docker ps -a --format '{{.Names}}' | grep -q "^${TEST_CONTAINER}$"; then
    log "cleaning up test container ${TEST_CONTAINER}"
    docker rm -f "$TEST_CONTAINER" >/dev/null 2>&1 || true
  fi
  rm -rf "${RESTORE_WORK_DIR:-}"
  return $rc
}

main() {
  load_env
  require_bin restic
  require_bin docker
  require_bin curl

  local hc_url="${BACKUP_HEALTHCHECK_RESTORE_TEST_URL:-}"
  ping_hc "$hc_url" "/start"

  RESTORE_WORK_DIR="$(mktemp -d -t refledger-restore-test-XXXXXX)"
  export RESTORE_WORK_DIR

  trap 'rc=$?; cleanup; if [ $rc -ne 0 ]; then log "restore-test FAILED (exit $rc)"; ping_hc "'"$hc_url"'" "/fail"; fi; exit $rc' EXIT

  log "fetching latest hourly snapshot from ${RESTIC_REPOSITORY}"
  restic restore latest \
    --tag hourly \
    --host refledger \
    --target "$RESTORE_WORK_DIR"

  # restic restore preserves the original path structure.
  local dump_path
  dump_path="$(find "$RESTORE_WORK_DIR" -type f -name '*.pgc' | head -n1)"
  [ -n "$dump_path" ] || die "no .pgc file found in restored snapshot"
  [ -s "$dump_path" ] || die "restored dump file is empty: $dump_path"
  log "restored dump: $dump_path ($(du -h "$dump_path" | cut -f1))"

  log "starting throwaway postgres container on port ${TEST_PORT}"
  docker run -d \
    --name "$TEST_CONTAINER" \
    --rm \
    -e POSTGRES_USER="$TEST_USER" \
    -e POSTGRES_PASSWORD="$TEST_PASSWORD" \
    -e POSTGRES_DB="$TEST_DB" \
    -p "127.0.0.1:${TEST_PORT}:5432" \
    postgres:16-alpine >/dev/null

  log "waiting for test postgres to become ready"
  local ready=0
  for _ in $(seq 1 30); do
    if docker exec "$TEST_CONTAINER" pg_isready -U "$TEST_USER" -d "$TEST_DB" >/dev/null 2>&1; then
      ready=1
      break
    fi
    sleep 1
  done
  [ $ready -eq 1 ] || die "test postgres failed to become ready within 30s"

  log "pg_restore into test database"
  docker cp "$dump_path" "$TEST_CONTAINER:/tmp/restore.pgc"
  docker exec -e PGPASSWORD="$TEST_PASSWORD" "$TEST_CONTAINER" \
    pg_restore --clean --if-exists --no-owner --no-privileges \
      -U "$TEST_USER" -d "$TEST_DB" /tmp/restore.pgc

  log "running sanity queries"
  local failures=0
  for table in users partners conversion_events; do
    local count
    count="$(docker exec -e PGPASSWORD="$TEST_PASSWORD" "$TEST_CONTAINER" \
      psql -U "$TEST_USER" -d "$TEST_DB" -tAc "SELECT COUNT(*) FROM ${table};" 2>&1 || echo 'QUERY_FAILED')"
    if [[ "$count" == "QUERY_FAILED" ]]; then
      log "sanity FAIL: query on ${table} errored"
      failures=$((failures + 1))
    else
      log "sanity: ${table} row count = ${count}"
    fi
  done

  [ $failures -eq 0 ] || die "$failures sanity query/queries failed"

  log "restore-test OK"
  ping_hc "$hc_url"
}

main "$@"
