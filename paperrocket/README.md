# paperrocket-book

Paper Rocket's own build of [Cal.diy](https://github.com/calcom/cal.diy) (the MIT community edition of Cal.com). It is one Docker image run for several small NZ businesses, each with its own look from settings only: env vars and a mounted brand folder, no rebuild per site.

Every change to upstream is listed in `PATCHES.md` at the repo root. Upstream is the `upstream` remote, pinned at `ef7954d` (11 Nov 2026).

## Per-site settings

Set these as container env vars. They are swapped into the built app when the container starts (`scripts/paperrocket-start.sh`). Unset means the upstream default.

| Env var | Default if unset |
| --- | --- |
| `NEXT_PUBLIC_WEBAPP_URL` | upstream behaviour (already swapped at start by upstream's script) |
| `NEXT_PUBLIC_APP_NAME` | `Cal.diy` |
| `NEXT_PUBLIC_COMPANY_NAME` | `Cal.com, Inc.` |
| `NEXT_PUBLIC_SUPPORT_MAIL_ADDRESS` | `help@cal.com` |
| `NEXT_PUBLIC_WEBSITE_URL` | the web app URL |
| `NEXT_PUBLIC_WEBSITE_PRIVACY_POLICY_URL` | `https://cal.com/privacy` |
| `NEXT_PUBLIC_WEBSITE_TERMS_URL` | `https://cal.com/terms` |
| `NEXT_PUBLIC_DISABLE_SIGNUP` | `true` in this build (upstream: signup open) |
| `PR_DEFAULT_LOCATION` | unset: upstream behaviour (Cal Video). Example: `integrations:google:meet`, `integrations:office365_video` |
| `PR_EMAIL_NAME` | the app name. The name guests see in emails (for example `Paper Rocket`) |
| `PR_EMAIL_BRAND_COLOR` | ink `#141414`. Stripe and buttons, `#rrggbb` |
| `PR_EMAIL_LOGO_URL` | text wordmark. Absolute https URL of a square logo, shown 72 px |
| `PR_EMAIL_FOOTER_LINES` | none. Address, phone, separated by a vertical bar |
| `PR_LOCAL_RATE_LIMIT` | on. `false` switches the in-memory login limiter off |
| `CRON_API_KEY` | unset: the reminder route answers 401. Call it every 5 minutes (see docs/cutover.md) |

Rules for the text values: no double quotes, backslashes, backticks or dollar signs (they would break the JS strings the value lands in; such a value is ignored with a warning and the default used). Spaces, ampersands, slashes and apostrophes are fine. The three URL values need their `https://`.

`PR_DEFAULT_LOCATION` is read by the server when a new event type is created, and only when the user has not picked a default conferencing app. The app behind it must be installed for the user.

All the usual Cal.diy env vars (database, `NEXTAUTH_SECRET`, `CALENDSO_ENCRYPTION_KEY`, SMTP, Google and Microsoft credentials) still apply, set at runtime as upstream documents.

## Brand folder

Mount a folder at `/calcom/brand`. Files in it replace the same-named files in the web app's public folder. File names are in `BRAND.md`. Override the location with `PRBOOK_BRAND_DIR` if needed.

## Tags and images

Image: `ghcr.io/daniel-paperrocket/paperrocket-book`.

Release tag scheme: `diy-<YYYY.MM.DD of the upstream commit>-pr.<n>`, for example `diy-2026.11.11-pr.1`. The date is the commit date of the upstream commit we are based on; `n` counts our releases on top of that commit, starting at 1. Pushing a tag matching `diy-*-pr.*` runs `.github/workflows/paperrocket-image.yml`, which publishes the tag and `sha-<short>` to GHCR.

## Lockfile and CI

`yarn.lock` is upstream's yarn lockfile, kept untouched so upstream merges stay clean. Yarn runs only in GitHub Actions (`paperrocket-check.yml` on `pr/**` branches, the image workflow on tags), never on a developer PC. Do not run `yarn`, `npm` or `npx` locally in this repo.

## Files in this folder

- `README.md`: this file.
- `BRAND.md`: brand folder file names.
- `test-runtime-brand.sh`: a shell self-test of `scripts/paperrocket-start.sh` (also run in CI).
