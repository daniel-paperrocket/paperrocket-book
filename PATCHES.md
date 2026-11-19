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
- `.github/workflows/paperrocket-image.yml`: on tags `diy-*-pr.*` and manual run, builds the Dockerfile against a postgres container (as upstream's docker-build-and-test action does) and pushes to `ghcr.io/daniel-rae-wanaka/paperrocket-book` as the tag and `sha-<short>`.
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

## OIDC sign-in (patch set 3)

A generic OpenID Connect login (built for Keycloak), driven only by env. No schema change, no client name or host in the repo.
- `packages/features/auth/lib/oidc.ts` (new): reads the env, builds the props the login page needs. The secret never leaves the server.
- `packages/features/auth/lib/next-auth-options.ts`: an `oidc` provider (`type: "oauth"`, `wellKnown`, `idToken`, PKCE and state) added when `OIDC_ISSUER`, `OIDC_CLIENT_ID` and `OIDC_CLIENT_SECRET` are set. In `signIn` a dedicated branch for `oidc` runs before the Google/SAML/Azure logic: it needs `email_verified: true`, finds the user by email (case-insensitive), refuses locked users, and does not change `identityProvider` (the enum has no OIDC value; reusing SAML would mislabel the user). The jwt callback already falls back to its email auto-merge for a provider it does not know. New users only when `OIDC_ALLOW_SIGNUP=true` (next-auth's adapter then creates them as `CAL` users). Two-factor is not asked: the provider owns it. `authorizeCredentials` throws when `DISABLE_PASSWORD_LOGIN=true`.
- `apps/web/server/lib/auth/login/getServerSideProps.tsx`: passes the public props.
- `apps/web/app/(use-page-wrapper)/auth/forgot-password/[id]/page.tsx`: redirects to `/auth/login` when `DISABLE_PASSWORD_LOGIN=true`. `OIDC_PROVIDER_LOGO_URL` is used only when it is an https: URL (`getOidcLogoUrl` in `oidc.ts`).
- `apps/web/modules/auth/login-view.tsx`: also hides the sign-up link when password login is disabled. OIDC button (same Button as Google, optional logo), and with `DISABLE_PASSWORD_LOGIN` the form, "Forgot" link and divider are hidden.
- `apps/web/server/lib/auth/login/getServerSideProps.tsx`: an install with no users is not sent to `/auth/setup` when `DISABLE_PASSWORD_LOGIN=true` (that page is closed and redirects back, which looped). The login page shows the OIDC button, and with `OIDC_ALLOW_SIGNUP=true` the first OIDC sign-in creates the first user (promote it to ADMIN in the database).
- `apps/web/modules/auth/hooks/useLastUsed.tsx`: `"oidc"` added to the type.
- `apps/web/app/(use-page-wrapper)/auth/error/page.tsx`: message for `error=oidc-no-account`.
- `packages/i18n/locales/en/common.json`: `oidc_signin_with`, `oidc_signin_fallback`, `oidc_no_account_error`.
- Env (runtime, server): `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, `OIDC_PROVIDER_LABEL`, `OIDC_PROVIDER_LOGO_URL`, `OIDC_ALLOW_SIGNUP`, `DISABLE_PASSWORD_LOGIN`. Documented in `.env.example`.
- With `DISABLE_PASSWORD_LOGIN=true` the magic-link `EmailProvider` is left out of the providers list (the server refuses it), and the forgot-password and reset-password pages and APIs and the signup page and API (team-invite tokens included) and the first-admin setup page and API (403 even with no users) are closed; make the first admin by starting once with the flag unset, so the OIDC button is the only way in (Google and Microsoft stay governed by their own env).
- OIDC sign-ins skip Cal's own two-factor check, because the identity provider (Keycloak) is responsible for two-factor.
- OIDC email linking is only as safe as the identity provider's `email_verified` claim: on the Keycloak realm self-registration must stay off, and no brokered identity provider (Google, Microsoft) may have "Trust email" on.
- OIDC sign-in matches only existing users by verified email; `OIDC_ALLOW_SIGNUP=true` is the only way to create users through it.
- Not compiled or run locally.

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

## Footer, NZ dates, brand files (15 Nov, PAP-1492)
- `packages/emails/src/components/BaseEmailHtml.tsx`: the footer (name, company, footer lines, reply note, site link) always shows. `hideLogo` (set for platform clients and `hideBranding`) used to hide it, so those emails had no footer lines.
- New: `packages/lib/paperrocketDate.ts` (`formatNzRange`) and its test. One NZ formatter, "Monday 16 November 2026, 4.45 to 5.00pm" (24-hour: "16.45 to 17.00").
- `packages/emails/templates/attendee-scheduled-email.ts` and `packages/emails/lib/utils/date-formatting.ts`: `getFormattedDate()` uses it. This is the `{{date}}` in every email subject (cancel, reschedule, request, reminder), so subjects no longer read "4:45pm - 5:00pm, Monday, November 16, 2026".
- `packages/emails/src/components/WhenInfo.tsx`: uses the same formatter instead of its own copy.
- `apps/web/modules/bookings/views/bookings-single-view.tsx`: the When block on the booking success page (single and recurring) uses it, on one line, timezone after it.
- Not changed: SMS text, the booker's slot list, and the "complete your booking" title (still uses the long localised date).
- `.github/workflows/paperrocket-check.yml`: runs `packages/lib/paperrocketDate.test.ts` too.

## pr.7 (18 Nov, PAP-1652, PAP-1456)
- **Logo route** `apps/web/app/api/logo/route.ts`: with no team logo, the default logo and favicons are read from `public/` on disk (new `readPublicLogo.ts`, own origin, known image types, no path escape) instead of fetched from `WEBAPP_URL`. The fetch 404'd whenever the public host was not reachable from the container, so the signed-in header logo and favicons were broken. Test `readPublicLogo.test.ts`.
- **Login card** `apps/web/modules/auth/login-view.tsx`: shows `PR_LOGIN_LOGO_URL` (https or a same-site path, `getLoginLogoUrl()` in `oidc.ts`, passed with `getOidcPublicProps()`), else `NEXT_PUBLIC_APP_NAME`, never "Cal.diy". The OIDC button grows to fit: logo inside, label wraps. The "Add this app to your home screen" banner is gone (it was only on this page).
- `PR_LOGIN_BUTTON_COLOR` (#rrggbb, `getLoginButtonColor()` in `oidc.ts`) colours the OIDC button with white text (Daniel, 18 Nov: the brand blue). Test `oidc.test.ts`.
- `packages/ui/components/logo/Logo.tsx`: alt and title are the app name.
- **NZ dates on booking pages** `packages/features/bookings/Booker/utils/dates.tsx`: English uses `formatNzDate`, `formatNzTime`, `formatNzTimeRange` (new in `packages/lib/paperrocketDate.ts`, tested): "Thursday 19 November 2026", "9.00am". Other languages keep upstream Intl formatting.
- **Terms line** `PR_HIDE_BOOKER_TERMS=true` hides "By proceeding, you agree to ... Terms and Privacy Policy" on the booking form. Read in the two booking page loaders (`apps/web/server/lib/[user]/[type]/getServerSideProps.ts`, `apps/web/lib/d/[link]/[slug]/getServerSideProps.tsx`), passed as `hideTerms` through `BookerProps` and `Booker.tsx` to `BookEventForm.tsx`. `PR_*` already passes through turbo.
- **OIDC** `next-auth-options.ts`: provider `httpOptions: { timeout: 10000 }` (openid-client's 3.5 s timed out on a cold start), provider built by exported `buildOidcProvider()`. `events.linkAccount` sets `emailVerified` for OIDC users that have none (`markOidcUserEmailVerified`): next-auth 4 creates OAuth users with `emailVerified: null`, which sent the first OIDC sign-up to /auth/verify-email. Only reached after the signIn callback accepted `email_verified: true`. Tests in `next-auth-options.test.ts`.
- **Hidden event types with private links** (new `packages/features/bookings/lib/paperrocketPrivateLink.ts`, tested): bookable only with one of their own unexpired hashed links (`maxUsageCount` 0 stays unlimited), to reschedule a booking of the same event type, or by the signed-in owner (Preview). Slots 2 onwards of a recurring series skip the usage count (slot 1 already counted it) but still need the link; the signal is `prLaterRecurringSlot` in the booking meta, set only by `RecurringBookingService.ts` (`dto/types.d.ts`), never from the request body. A seated booking joined with `bookingUid` passes on the page and the API when it belongs to the same event type. Enforced in `RegularBookingService.ts` (403 "This event can only be booked with its private link.") and on the plain `/<user>/<slug>` page (404). Hidden event types without links behave as upstream. Not added to team event pages: the API check covers them.

## Booking page at 390px and phone country (19 Nov)
- `apps/web/modules/bookings/views/bookings-single-view.tsx`: the host and guest emails and the guest name get `break-all` (the Who column also gets `min-w-0`), so a long email wraps inside the card on the booked and cancelled pages.
- `packages/trpc/server/routers/publicViewer/countryCode.handler.ts`: new env `PR_DEFAULT_PHONE_COUNTRY` (uppercase ISO code, e.g. `NZ`; anything else is ignored) sets the phone field's default country for every visitor. Unset, upstream behaviour (Vercel's geo header, then the browser language, then US).

## Smaller image: standalone output on a slim base (19 Nov)
The image was 7.8 GB: the whole monorepo with every workspace's node_modules (3.2 GB), the full .next folder and the full node:22 base. The run stage now holds only what runs:
- Next's standalone output (the build already set `BUILD_STANDALONE=true`), plus `.next/static` and `public`, on `node:22-slim` with netcat, wget, openssl and CA certificates.
- The Prisma CLI (6.16.1, same as the workspace) in `/prisma-cli`, for `migrate deploy` at start.
- `scripts/seed-app-store.ts` bundled to `scripts/seed-app-store.js` with esbuild at build time; `@prisma/client` and `pg` resolve from the standalone node_modules.
- `start.sh` runs `node apps/web/server.js` instead of `yarn start`, with `HOSTNAME=0.0.0.0`.
- The URL and branding swaps also cover `apps/web/server.js`, which carries the built Next config.
- Source maps are deleted.
Note: the standalone server uses the Next config as built. `next.config.ts` no longer runs at start, so its run-time env defaults (`NEXTAUTH_URL`, `NEXT_PUBLIC_WEBSITE_URL`, `ORGANIZATIONS_ENABLED` from `NEXT_PUBLIC_SINGLE_ORG_SLUG`) must be set in the compose file.
