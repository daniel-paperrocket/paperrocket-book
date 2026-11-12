# Cutover: book.paperrocket.nz from Cal.com v6.2.0 to paperrocket-book

Written 13 Nov 2026 (book-build-2, PAP-1453). Needs Daniel's explicit go on the day. Nothing here has been run against the live site. The migration step was rehearsed on a scratch copy (see "Rehearsal result").

Live today (pr-vps, `/srv/paperrocket/scheduler`): `scheduler-calcom-1` (image `calcom/cal.com:v6.2.0`, `127.0.0.1:3030`) and `scheduler-db-1` (`postgres:16`, user `calcom`, database `calendso`, volume `db-data`). The public name comes through the tunnel. Secrets live in Infisical (compose header names the project) and are never printed.

Window: about 10 minutes. Pick a quiet time. No booking can be made while the container restarts.

## 0. Before the day
- [ ] CI green on the tag you will run (`diy-<date>-pr.<n>`), image `ghcr.io/daniel-paperrocket/paperrocket-book:<tag>` exists (check the Actions run).
- [ ] Decide the brand values and put them in Infisical (same project as the live Cal): `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_COMPANY_NAME`, `NEXT_PUBLIC_SUPPORT_MAIL_ADDRESS`, `NEXT_PUBLIC_WEBSITE_URL`, `PR_EMAIL_NAME` ("Paper Rocket"), `PR_EMAIL_BRAND_COLOR`, `PR_EMAIL_LOGO_URL` (https), `PR_EMAIL_FOOTER_LINES` (address and phone, separated by `|`), `PR_DEFAULT_LOCATION` if wanted, `CRON_API_KEY` (new, random).
- [ ] Put the logo files in a brand folder on the VPS, for example `/srv/paperrocket/scheduler/brand`, file names in `paperrocket/BRAND.md`.
- [ ] Pull the image now: `docker pull ghcr.io/daniel-paperrocket/paperrocket-book:<tag>` (the repo is public, no login).
- [ ] `free -m` shows at least 3 GB available.

## 1. Backup (always, even though the rehearsal passed)
```
cd /srv/paperrocket/scheduler
STAMP=$(date +%Y-%m-%dT%H%M)
docker exec scheduler-db-1 pg_dump -U calcom -d calendso -Fc --no-owner > /srv/backup/calcom-pre-book-$STAMP.pgc
ls -l /srv/backup/calcom-pre-book-$STAMP.pgc        # not empty (the rehearsal dump was about 590 KB)
docker exec scheduler-db-1 pg_restore -l < /srv/backup/calcom-pre-book-$STAMP.pgc | head -3   # readable
cp compose.yml compose.yml.pre-book-$STAMP           # the old file, for rollback
```
Keep the dump until the new site has run for a week.

## 2. Swap
1. Edit `compose.yml` (keep the `db` service untouched):
   - `calcom.image`: `ghcr.io/daniel-paperrocket/paperrocket-book:<tag>`
   - add the brand env vars above and `CRON_API_KEY`
   - add the brand folder as a volume: `./brand:/calcom/brand:ro`
   - keep `127.0.0.1:3030:3000`, `NEXT_PUBLIC_WEBAPP_URL`, `NEXTAUTH_URL`, `NEXT_PUBLIC_DISABLE_SIGNUP`, the email settings and `GOOGLE_API_CREDENTIALS` as they are
   - optional `mem_limit: 1500m`
2. Start with the usual secrets wrapper (see the compose header): `infisical run --projectId <project> --env dev -- docker compose up -d calcom`
3. The container runs `prisma migrate deploy` on start (about a minute, 596 migrations on the rehearsal copy, none failed). Watch: `docker compose logs -f calcom` until the app answers.
4. Add the reminder job (every 5 minutes, from the VPS):
   `*/5 * * * * curl -s -X POST -H "authorization: $CRON_API_KEY" http://127.0.0.1:3030/api/cron/paperrocketReminders`
   (read the key from the same place the compose gets it; never write it into a file other people can read).

## 3. Smoke test (call it done only when every line passes)
- [ ] `curl -sI http://127.0.0.1:3030/auth/login` is 200, and `https://book.paperrocket.nz/daniel` is 200 from outside (the uptime monitor expects this).
- [ ] Sign in as Daniel at `/auth/login`. Event types `chat`, `session`, `connect` (public) and `quick`, `ops-review` (hidden) are all there, with the same lengths.
- [ ] Availability shows 09:00 to 17:00, Pacific/Auckland. Open a public event page: first slot is 9:00am NZ, not an odd hour.
- [ ] Existing bookings are listed (12 on the rehearsal copy).
- [ ] Google Calendar still connected (Settings, Calendars). Busy times from it block slots. **Unverified**: Cal.diy against the existing two credentials.
- [ ] Make a test booking on the hidden `quick` event with a mailbox you own, then cancel it. Both emails arrive from `hello@paperrocket.nz` with the Paper Rocket letterhead, "Organiser", NZ time format, no "Cal Video" or "Cal.com". Delete the test booking afterwards from Bookings (it is cancelled, so only history).
- [ ] Reminder route answers: `curl -s -X POST -H "authorization: $CRON_API_KEY" http://127.0.0.1:3030/api/cron/paperrocketReminders` returns `{"remindersSent":0}` (or a number if a booking is due), and 401 without the key.
- [ ] Uptime Kuma group "Paper Rocket apps" is green. Both Gmail signatures' Book a call link (`/daniel/chat`) opens the booking page.

## 4. Rollback
Use this if any smoke test fails and cannot be fixed in 10 minutes.
1. Stop the new container: `docker compose stop calcom`.
2. The new image's migrations dropped a few old tables, so do not run v6.2.0 against the migrated database. Restore the dump:
   ```
   docker exec scheduler-db-1 psql -U calcom -d postgres -c 'DROP DATABASE calendso;' -c 'CREATE DATABASE calendso OWNER calcom;'
   docker exec -i scheduler-db-1 pg_restore -U calcom -d calendso --no-owner < /srv/backup/calcom-pre-book-$STAMP.pgc
   ```
   Any booking made after the swap is lost with this step. Look at Bookings in the new site first and re-enter them by hand if there are any.
3. Put the old file back: `cp compose.yml.pre-book-$STAMP compose.yml` and start with the secrets wrapper: `docker compose up -d calcom`.
4. Check `https://book.paperrocket.nz/daniel` is 200 and the existing bookings are there.
5. Remove the cron line. Write what failed in STATUS and on PAP-1453.

## Rehearsal result (13 Nov 2026, book-build-2)
A read-only `pg_dump` of the live database was restored into a scratch Postgres 16 (no published port, own network, 768 MB), then the fork image `sha-db7d636` ran `prisma migrate deploy` against it. Counts matched before and after (1 user, 5 event types, 12 bookings, 13 attendees, 1 schedule, 1 availability, 2 credentials). 596 migrations applied, 0 failed, the last one is our reminder migration. Daniel's schedule is Pacific/Auckland, 09:00 to 17:00. The dump and the scratch database were deleted after. No rows or emails were printed. Not covered: the app actually running on the migrated copy (login, bookings page) and Google Calendar credentials.
