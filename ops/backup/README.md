# Refledger backups

End-to-end Postgres backup system:
[`restic`](https://restic.net) + `pg_dump` + host cron + Backblaze B2 +
healthchecks.io.

## What you get

| Schedule                       | Script            | What it does                                                            |
|--------------------------------|-------------------|-------------------------------------------------------------------------|
| Every hour at minute :05       | `backup.sh`       | Full `pg_dump -Fc` pushed to restic (tag `hourly`).                     |
| Daily at 03:00 UTC             | `schema-dump.sh`  | Lightweight `pg_dump --schema-only` (tag `schema`).                     |
| Sundays at 04:00 UTC           | `prune.sh`        | Applies retention, reclaims storage.                                    |
| 1st of month at 05:00 UTC      | `restore-test.sh` | Restores latest snapshot into a throwaway container, runs sanity SQL.   |

Retention policy (enforced by `prune.sh`):

- Last 24 hourly
- Last 7 daily
- Last 4 weekly
- Last 12 monthly
- Last 3 snapshots (safety floor — cron clock glitches can't empty the repo)
- Last 30 schema dumps

RPO: **≤ 1 hour** — in the worst case the most recent hour of data is lost.
RTO: **~5 minutes** to restore the DB on the same host, longer on a fresh box.

## One-time setup (on the host that runs docker compose)

1. **Install restic.**
   ```bash
   # Debian/Ubuntu
   sudo apt install -y restic
   restic self-update   # bring to latest if distro version is old
   ```

2. **Provision a Backblaze B2 bucket.**
   - Create a private bucket, e.g. `refledger-backups`.
   - Create an application key scoped to that bucket (read + write + list).
   - Save `keyID` and `applicationKey`.

3. **Create a healthchecks.io project.** Add three checks:
   - `refledger-backup-hourly` — grace 30 min, period 1 h
   - `refledger-backup-prune`  — grace 4 h, period 1 week
   - `refledger-backup-restore-test` — grace 6 h, period 1 month

4. **Fill `.env`** on the host (values live alongside the existing app env):
   ```
   BACKUP_RESTIC_REPOSITORY=b2:refledger-backups:prod
   BACKUP_RESTIC_PASSWORD=<openssl rand -base64 48>
   BACKUP_B2_ACCOUNT_ID=<keyID>
   BACKUP_B2_ACCOUNT_KEY=<applicationKey>
   BACKUP_HEALTHCHECK_BACKUP_URL=https://hc-ping.com/<uuid>
   BACKUP_HEALTHCHECK_PRUNE_URL=https://hc-ping.com/<uuid>
   BACKUP_HEALTHCHECK_RESTORE_TEST_URL=https://hc-ping.com/<uuid>
   BACKUP_STAGE_DIR=/var/backup/refledger/stage
   ```
   **Record the restic password in a password manager. Losing it makes
   every snapshot in this repo permanently unrecoverable.**

5. **Prepare the staging directory.**
   ```bash
   sudo mkdir -p /var/backup/refledger/stage
   sudo chown "$USER" /var/backup/refledger/stage
   ```

6. **Initialise the restic repo (one-shot).**
   ```bash
   cd /opt/refledger
   ./ops/backup/restic-init.sh
   ```

7. **Install the crontab.**
   ```bash
   sudo cp ops/backup/crontab.example /etc/cron.d/refledger
   # edit /etc/cron.d/refledger to match the real REPO_PATH and the user
   # that should run it (add a `user` column when installing under /etc/cron.d).
   ```
   Or for a user crontab: `crontab -e` and paste the entries.

8. **Smoke test.**
   ```bash
   ./ops/backup/backup.sh        # should exit 0, restic snapshots lists one
   ./ops/backup/restore-test.sh  # should exit 0, sanity queries pass
   ```

## Restore procedures

### List available snapshots

```bash
cd /opt/refledger
set -a; . .env; set +a
export RESTIC_REPOSITORY="$BACKUP_RESTIC_REPOSITORY"
export RESTIC_PASSWORD="$BACKUP_RESTIC_PASSWORD"
export B2_ACCOUNT_ID="$BACKUP_B2_ACCOUNT_ID"
export B2_ACCOUNT_KEY="$BACKUP_B2_ACCOUNT_KEY"
restic snapshots
```

### Restore the latest backup into the live DB (in-place)

> **Warning:** this destroys current data. Take a manual dump first:
> `./ops/backup/backup.sh`.

```bash
# 1. Pull the dump from restic to a scratch dir.
WORK=$(mktemp -d)
restic restore latest --tag hourly --host refledger --target "$WORK"
DUMP=$(find "$WORK" -name '*.pgc' | head -n1)

# 2. Restore into the running postgres container.
docker compose cp "$DUMP" postgres:/tmp/restore.pgc
docker compose exec -T postgres pg_restore \
  --clean --if-exists --no-owner --no-privileges \
  -U "$DB_USERNAME" -d "$DB_DATABASE" /tmp/restore.pgc
docker compose exec -T postgres rm /tmp/restore.pgc

rm -rf "$WORK"
```

### Restore a specific snapshot (e.g. to roll back an hour)

```bash
restic snapshots --tag hourly               # note the snapshot ID
restic restore <snapshot-id> --target /tmp/roll-back
# then same pg_restore procedure as above, with the .pgc file from /tmp/roll-back
```

### Restore to a fresh host (disaster recovery)

1. Provision a new VPS with Docker + docker-compose.
2. `git clone` the repo to `/opt/refledger`.
3. Copy `.env` from a secure store (the restic password is the critical
   piece — without it the snapshots are opaque).
4. `docker compose up -d postgres`
5. Run the "restore the latest backup" procedure above.
6. `docker compose up -d` (brings up backend + frontend).

### Recover from an accidental `DROP TABLE` or bad UPDATE

Because we use hourly snapshots, you can roll back to the snapshot
immediately preceding the incident. Use `restic snapshots --tag hourly`
to find the snapshot you want, then follow "Restore a specific snapshot".

## Key rotation

### Rotate the B2 application key

1. Create a new application key in Backblaze with the same bucket scope.
2. Update `BACKUP_B2_ACCOUNT_ID` and `BACKUP_B2_ACCOUNT_KEY` in `.env`.
3. Run `./ops/backup/backup.sh` to confirm it still writes.
4. Revoke the old key in Backblaze.

### Rotate the restic encryption password

```bash
restic key add          # you will be prompted for the new password
# verify it works
RESTIC_PASSWORD=<new> restic snapshots
# remove the old key
RESTIC_PASSWORD=<new> restic key list
RESTIC_PASSWORD=<new> restic key remove <old-key-id>
```

Then update `BACKUP_RESTIC_PASSWORD` in `.env` and the password manager.

## Monitoring and alerting

- **healthchecks.io** sends email (and Slack/Telegram/webhook if you wire
  them) if a scheduled ping doesn't arrive within the grace window.
- Each script pings `/start` on begin, `/fail` on non-zero exit, and the
  plain URL on success.
- The restic repo itself can be checked with `restic check` — not wired to
  cron because `check --read-data` is expensive on large repos; run it
  manually once a quarter.

## Troubleshooting

- **`pg_dump: error: received non-zero exit status`** — most often a
  long-running migration holding an exclusive lock. `--lock-wait-timeout`
  bails after 30 s so one hour's backup is skipped; cron's next run
  retries. If this persists, inspect `SELECT * FROM pg_locks`.

- **Empty dump file** — almost always a broken `docker compose exec` pipe
  (shell not found, container not running). Check `docker compose ps`.

- **`restic: Fatal: unable to open config file`** — repo not initialised;
  run `./ops/backup/restic-init.sh`.

- **Slow uploads on residential bandwidth** — B2 writes max out around
  upstream bandwidth. Dump compression (`pg_dump -Fc`) already takes care
  of most of the volume; beyond that, accept the minutes-long upload.

## Future upgrade path

If the 1 h RPO ever becomes insufficient, the upgrade path is
[pgBackRest](https://pgbackrest.org) with WAL archiving to the same B2
bucket. That gives seconds-level PITR at the cost of modifying
`postgresql.conf`, a dedicated archive process, and additional disk for
the WAL stream. Not worth it at MVP scale.
