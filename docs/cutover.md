# Moving a Cal.com install to paperrocket-book

A generic outline. Host names, paths, container names and ports are placeholders: the real values live in the private runbook, not in this public repo. Do every step on a copy first.

## Before
- CI is green on the tag you will run and the image `ghcr.io/daniel-paperrocket/paperrocket-book:<tag>` exists.
- Brand settings are in your secret store (`paperrocket/README.md` lists them), plus a new random `CRON_API_KEY`.
- The brand folder with the logo files is ready (`paperrocket/BRAND.md`).
- The image is pulled and the host has enough free memory (about 1.5 GB for the app, 0.5 GB for Postgres).

## 1. Back up
Take a full dump of the live database with `pg_dump -Fc --no-owner`, write it to your backup folder, check it is not empty and that `pg_restore -l` reads it, and keep a copy of the current compose file. Keep both for at least a week.

## 2. Rehearse on a copy
Restore the dump into a scratch Postgres that publishes no port, run the new image's `prisma migrate deploy` against it, and compare row counts for users, event types, bookings, attendees, schedules and credentials before and after. Check the schedule time zone and hours. Delete the dump and the scratch database when done. Print counts only, never rows.

## 3. Swap
Change the app image to the new tag, add the brand env vars and the brand folder volume, keep the database service untouched, and start the app. It runs the migrations on start. Add a job that calls `POST /api/cron/paperrocketReminders` every 5 minutes with `CRON_API_KEY` in the `authorization` header.

## 4. Smoke test
- Login page and a public booking page answer 200 from outside.
- Sign in: event types, lengths, hidden flags, availability hours and time zone, and existing bookings are all there.
- The connected calendar still shows and still blocks busy times (check this against your own credentials).
- Make a test booking on a hidden event type and cancel it. Both emails arrive with the letterhead, NZ date and time format, "Organiser", and no Cal.com wording.
- The reminder route returns `{"remindersSent":0}` with the key and 401 without it.
- The uptime monitor is green and your booking links open.

## 5. Roll back
If a check fails and cannot be fixed quickly: stop the new app, drop and recreate the database, restore the pre-swap dump, put the old compose file back and start it. The new migrations drop some old tables, so never run the old image against the migrated database. Bookings made after the swap are lost with a restore, so list them first and re-enter them by hand. Remove the reminder job and record what failed.
