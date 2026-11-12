# paperrocket-book patches

Local changes on top of upstream Cal.diy. Re-apply on each rebase. Every touched upstream line carries a comment starting `paperrocket-book:` (the Dockerfile and shell lines say so in their own comment syntax).

Upstream pinned at `ef7954d16a` (calcom/cal.diy main, 11 Nov 2026), remote `upstream`. Branch `pr/main`.

## Runtime branding

The Dockerfile bakes distinctive `PRBOOK_PLACEHOLDER_*` values into the build for the six branding env vars plus `NEXT_PUBLIC_DISABLE_SIGNUP`. When the container starts, `scripts/paperrocket-start.sh` swaps them in `apps/web/.next/` and `apps/web/public/` for the runtime env (or the upstream default when unset), with sed-safe escaping. It also rewrites the product name in `site.webmanifest`. The URL placeholders include their `https://` so the runtime value brings its own scheme.

APP_NAME and COMPANY_NAME are used in UI text, titles and email text only (checked by grep at this commit: no ids, slugs, cookies or URLs are built from them), so a longer or shorter value is safe.

Upstream files touched:
- `Dockerfile`: builder-stage ENV uses the placeholders for `NEXT_PUBLIC_APP_NAME`, `COMPANY_NAME`, `SUPPORT_MAIL_ADDRESS`, `WEBSITE_URL` and `DISABLE_SIGNUP`; `WEBSITE_TERMS_URL` and `WEBSITE_PRIVACY_POLICY_URL` keep their build args but default to a placeholder (`${VAR:-placeholder}`).
- `scripts/start.sh`: one line calling `scripts/paperrocket-start.sh` before the database wait.

## Brand files

`scripts/paperrocket-start.sh` also copies files from `/calcom/brand` over matching files in `apps/web/public/`. Names in `paperrocket/BRAND.md`. No extra upstream file touched.

## Strips

- `apps/web/modules/bookings/components/Booker.tsx`: new constant `PRBOOK_HIDE_OVERLAY_CALENDAR`; `renderOverlay` returns null when it is true, so "Overlay my calendar" and its login modals are gone on the full page as well as embeds.
- Login sign-up link: upstream's `login-view.tsx` already hides it when `NEXT_PUBLIC_DISABLE_SIGNUP === "true"`, but that value is read at build and upstream's Dockerfile never sets it, so the link always showed. No source change: the Dockerfile placeholder plus the start script default of `true` fix it. The signup page and `/api/auth/signup` read the same variable, so they now refuse too.
- `apps/web/modules/onboarding/getting-started/onboarding-view.tsx`: this commit has no paid-plan upsell, but its first step is a plan picker (Personal, Team) and Team leads to a page that does not exist in Cal.diy. New constant `PRBOOK_SKIP_PLAN_STEP` makes the existing redirect effect send everyone straight to `/onboarding/personal/settings`, and shows the loading card meanwhile. Side effect: the back button on personal settings goes to the picker, which forwards again.
- `packages/app-store/_utils/getDefaultLocations.ts`: when `PR_DEFAULT_LOCATION` is set and the user has no default conferencing app, new event types get that location type. Unset keeps upstream behaviour (Cal Video if keyed). The app behind the location must be installed for the user.

## New files (not upstream)

- `scripts/paperrocket-start.sh`
- `paperrocket/README.md`, `paperrocket/BRAND.md`, `paperrocket/test-runtime-brand.sh`
- `.github/workflows/paperrocket-image.yml`: on tags `diy-*-pr.*` and manual run, builds the Dockerfile against a postgres container (as upstream's docker-build-and-test action does) and pushes to `ghcr.io/daniel-paperrocket/paperrocket-book` as the tag and `sha-<short>`.
- `.github/workflows/paperrocket-check.yml`: on pushes to `pr/**`, `yarn install --immutable` then type-check `@calcom/web` and `@calcom/app-store`.

## Env vars our build adds or changes

- `PR_DEFAULT_LOCATION` (server, new).
- `PR_EMAIL_BRAND_COLOR`, `PR_EMAIL_LOGO_URL`, `PR_LOCAL_RATE_LIMIT` (server, new; see Letterhead emails and Local rate limiter).
- `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_COMPANY_NAME`, `NEXT_PUBLIC_SUPPORT_MAIL_ADDRESS`, `NEXT_PUBLIC_WEBSITE_URL`, `NEXT_PUBLIC_WEBSITE_PRIVACY_POLICY_URL`, `NEXT_PUBLIC_WEBSITE_TERMS_URL`: now set at container start, not build.
- `NEXT_PUBLIC_DISABLE_SIGNUP`: now set at container start, default `true`.
- `PRBOOK_BRAND_DIR` (default `/calcom/brand`) and `PRBOOK_WEB_DIR` (default `apps/web`): script locations, for tests.

## Letterhead emails (patch set 2)

- `packages/emails/src/components/BaseEmailHtml.tsx`: rewritten. Letterhead (text wordmark from `NEXT_PUBLIC_APP_NAME`, or a logo when `PR_EMAIL_LOGO_URL` is an https URL), a short rule in the brand colour, plain title and subtitle, details, the manage links, and a quiet footer with `NEXT_PUBLIC_COMPANY_NAME`. Same props as upstream so every template using it compiles; `headerType` is accepted and ignored (the round icon images are not used). Upstream's footer logo and MSO wrapper are gone. `hideLogo` now hides the footer name.
- `PR_EMAIL_BRAND_COLOR` (`#rrggbb`, default ink `#141414`) sets the rule colour. Decided overnight by book-build-2, Daniel can reverse: an env var, not the organiser's own `brandColor`, because that needs plumbing through every booking path and one site has one brand. Round 2 can read the organiser's colour.
- `packages/i18n/locales/en/common.json`: values (not keys) reworded for booked, moved, cancelled, request received, declined, "need to change it" and the recipients line; "Canceled" now "Cancelled". Other locales are untouched and fall back to their old wording.
- Not changed yet: organizer-facing emails, verification and password emails, calendar invite (`.ics`) text, V2BaseEmailHtml (used by recording and transcript emails). They still carry upstream styling.
- New: `packages/emails/src/components/paperrocket-letterhead.ts` (settings), `packages/emails/paperrocket-emails.test.ts` (renders seven emails, checks letterhead, wording, brand colour, no upstream images, no em dash, size under 80 KB, and writes them to `PR_SNAPSHOT_DIR`; CI uploads them as the `email-snapshots` artifact).

## Attendee reminders (patch set 2)

24 h and 1 h before an accepted booking. Upstream Cal.diy has no attendee reminder (workflows are not in it).
- `packages/prisma/schema.prisma`: two new `ReminderType` values, `ATTENDEE_REMINDER_24H` and `ATTENDEE_REMINDER_1H`. Migration `20261113000000_paperrocket_attendee_reminders` (additive, `ADD VALUE IF NOT EXISTS`).
- `packages/emails/email-manager.ts`: import and `sendAttendeeReminderEmails` at the end of the file.
- `packages/emails/src/templates/index.ts`: one export line.
- `packages/i18n/locales/en/common.json`: four `pr_reminder_*` keys above the marker line.
- New: `apps/web/app/api/cron/paperrocketReminders/route.ts`, `packages/emails/templates/attendee-reminder-email.ts`, `packages/emails/src/templates/AttendeeReminderEmail.tsx`.
- Call `POST /api/cron/paperrocketReminders` every 5 minutes with `authorization: <CRON_API_KEY>` (refuses when `CRON_API_KEY` is unset). A booking gets each reminder once (a `ReminderMail` row is written before sending, so an overlapping run cannot double send). A reminder is skipped when the booking was made less than the reminder's lead time before the start (no 24 h reminder for a booking made 3 h ahead).

## Local rate limiter (patch set 2)

Upstream only rate-limits when `UNKEY_ROOT_KEY` is set. Without it every limit (login, email code, booking) is open.
- `packages/lib/rateLimit.ts`: when `UNKEY_ROOT_KEY` is unset, `rateLimiter()` returns an in-memory fixed-window limiter with the same limits as the Unkey ones (login is `core`: 10 a minute per hashed email). Off in tests and when `PR_LOCAL_RATE_LIMIT=false`. Counts live in the Node process: a restart clears them, and Next may hold one copy per server bundle, so the real ceiling can be a small multiple. The Cloudflare rate limit rule on `book` login stays as the outer layer.
- New: `packages/lib/rateLimit.local.test.ts`.

## Upstream workflows removed

Only `paperrocket-check.yml` and `paperrocket-image.yml` run in this fork. The other 50 upstream workflows under `.github/workflows/` are deleted (13 Nov 2026, as paperrocket-sign did): they need secrets we do not have. On a rebase, if upstream changes one of them, keep it deleted. `.github/actions/` is left in place.

## Not done

- No local build, install or test (yarn runs only in CI). Edits were checked by reading types and call sites; CI is the compile.
- The shell script has a self-test that passes locally.

## Letterhead round 2 (13 Nov)
- `packages/emails/src/components/BaseEmailHtml.tsx`: logo tile (72 px, `PR_EMAIL_LOGO_URL`), 4 px brand stripe on the card, eyebrow and left-aligned title, centred footer (name, company, `PR_EMAIL_FOOTER_LINES`, reply note, site link). New optional prop `eyebrow` (booking emails pass "Booking").
- `Info.tsx` (label left, value right rows), `WhenInfo.tsx` (NZ format, "Friday 20 November 2026, 2.00 to 2.30pm"), `WhoInfo.tsx` (name, role, email), `ManageLink.tsx` and `CallToAction.tsx` (table buttons in the brand colour), `LocationInfo.tsx` ("Cal Video" shows as "Video call").
- `packages/i18n/locales/en/common.json`: `organizer` is "Organiser".
- `packages/emails/email-manager.ts`: attendee cancel email no longer runs the booking title through `getEventName` a second time (it repeated "between X and Y" in the subject and body) unless the event type has a custom event name.
- New env: `PR_EMAIL_NAME` (name guests see, default the app name), `PR_EMAIL_FOOTER_LINES` (address and phone, separated by |). Also set `NEXT_PUBLIC_SUPPORT_MAIL_ADDRESS`: upstream defaults to help@cal.com and the password and verification emails print it.

## Public-repo leak check (13 Nov)
- `scripts/paperrocket/check-no-infra.sh` (copied from paperrocket-sign, own-file list adapted) and a step at the top of `.github/workflows/paperrocket-check.yml` (also now runs on pull requests). It fails if our own files, or any line we add since the pinned upstream commit, name a client, a host, a server path or a loopback address. The real cutover runbook is private; `docs/cutover.md` is a generic outline. Update the base commit in the workflow when upstream is merged.

## Turbo env pass-through (13 Nov)
- `turbo.json`: `PR_*` added to `globalEnv`. The image starts the app with `yarn start`, which runs turbo, and turbo strict env mode only passes the variables it lists. Without this every `PR_*` setting (email name, brand colour, logo, footer lines, default location, limiter switch) was silently ignored at runtime. Found in the preview on 13 Nov.
