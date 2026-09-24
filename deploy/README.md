# Deployment and SQLite operations

This directory provides a **local single-instance deployment drill**, not a public release configuration. The API currently rejects `NODE_ENV=production` because WeChat authentication is not implemented. Do not put the development identity endpoint behind a public domain or treat local test resonance as live user data.

## Local container drill

Use Node.js 22-24 and pnpm 10 for the host backup tooling. Docker Compose is optional; it was not required for normal pnpm development.

1. Copy `apps/api/.env.example` to `apps/api/.env`, replace `JWT_SECRET` and `DEV_AUTH_PEPPER` with independent random values, and retain `NODE_ENV=development` and `ENABLE_DEV_AUTH=true` **only for local testing**.
2. Create `data/` on a local persistent disk, restricted to the operator and container user (UID 1000 in the example image). Do not use NFS, SMB, or another network filesystem. The Compose example mounts this one host directory into one API replica.
3. Run `docker compose -f deploy/docker/compose.yaml up --build -d` from the repository root. Check `http://127.0.0.1:3000/v1/health/ready`. Only the host loopback address is published; do not add public port bindings or scale `api` above one replica.
4. Stop with `docker compose -f deploy/docker/compose.yaml down`. Keep `data/`; `down` does not remove the bind-mounted database.

The image builds the shared packages and API from the lockfile. It runs as a non-root user with a read-only application filesystem. Host development defaults to `HOST=127.0.0.1`; Compose explicitly uses `HOST=0.0.0.0` inside the container while binding its published port to the host loopback only. The API enables SQLite WAL, foreign keys, a 5-second busy timeout, and runs explicit migrations at startup. `/v1/health/live` checks the process; `/v1/health/ready` checks the database connection. Compose sends SIGTERM with a 30-second grace period and the Nest app enables shutdown hooks. No second writer may share this SQLite file.

## Backup, restore drill, and retention

These commands run on a host with this workspace's dependencies installed (`pnpm install --frozen-lockfile`). Use an **encrypted, access-restricted, separate storage location** for the backup directory. Never mount backups into the API container or let online queries read them. The scripts deliberately reject a backup directory nested under the online database directory.

```powershell
node deploy/scripts/sqlite-ops-cli.mjs backup --db data/mood-record.sqlite3 --backup-dir D:/private-mood-backups
node deploy/scripts/sqlite-ops-cli.mjs restore-drill --backup D:/private-mood-backups/mood-record-YYYYMMDDTHHMMSSmmmZ-UUIDHEX.sqlite3
node deploy/scripts/sqlite-ops-cli.mjs cleanup --backup-dir D:/private-mood-backups --dry-run
node deploy/scripts/sqlite-ops-cli.mjs cleanup --backup-dir D:/private-mood-backups
```

Schedule the `backup` command at least daily and `cleanup` daily using the host scheduler, and alert on missed runs. The backup uses SQLite's online backup API, not a raw copy of a live WAL file. It validates `integrity_check` and `foreign_key_check` before publishing the snapshot. The restore drill copies the snapshot into a new temporary directory, opens and checks it there, then removes the drill copy. It **never overwrites the online database**. A successful integrity check is not a complete application restore test: also validate migration compatibility and representative read paths against a disposable service before relying on the snapshot. Cleanup defaults to 29 days so a daily scheduler can finish before the 30-day limit; it only targets this tool's timestamped snapshot names and refuses a retention value above 30 days. Verify that external storage and its own versioning/lifecycle rules also remove copies within 30 days.

Do not copy a backup over the online database while the API runs. For a real recovery, stop the API, preserve the failed database for investigation, restore a validated snapshot to a new local disk path, verify it with `verify --db PATH`, then point a single API instance at the restored path. Test schema compatibility before cutover; this project currently runs migrations on startup rather than providing a migration dry-run command. A restored snapshot can include records that users deleted since that snapshot. Reconcile deletion requests before reconnecting users; otherwise restoration would undo the privacy deletion guarantee.

## Future HTTPS release boundary

`docker/Caddyfile.example` is a reverse-proxy shape only. It is **not** wired to the development Compose service and must not be used to expose development authentication. After implementing and testing WeChat login, use a verified HTTPS certificate and a dedicated API domain, terminate TLS at the proxy, and forward only to a single private API instance. Do not claim production readiness before the following checks are complete:

- Obtain a real Mini Program account/AppID, implement WeChat auth and fail-closed production configuration, then test authorization and account deletion end to end.
- Complete Mini Program filing and privacy agreement review; configure the exact HTTPS `request` domain in WeChat's console and test on device.
- Verify the API domain owner's ICP filing, HTTPS certificate chain and renewal. Confirm with the relevant authority/provider whether public-security network filing applies; an existing ICP filing does not imply either Mini Program or public-security filing is done.
- Check database migration/backup/restore on a disposable copy, API readiness, rate limits, logs, retention and deletion handling. Test rollback compatibility before applying any non-additive migration.
- Keep TEST and LIVE databases and identities separate. The unrelated Cloudflare-hosted frontend project is not part of this topology or evidence of this service's compliance.
