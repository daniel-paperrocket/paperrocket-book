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
- `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_COMPANY_NAME`, `NEXT_PUBLIC_SUPPORT_MAIL_ADDRESS`, `NEXT_PUBLIC_WEBSITE_URL`, `NEXT_PUBLIC_WEBSITE_PRIVACY_POLICY_URL`, `NEXT_PUBLIC_WEBSITE_TERMS_URL`: now set at container start, not build.
- `NEXT_PUBLIC_DISABLE_SIGNUP`: now set at container start, default `true`.
- `PRBOOK_BRAND_DIR` (default `/calcom/brand`) and `PRBOOK_WEB_DIR` (default `apps/web`): script locations, for tests.

## Upstream workflows

`.github/workflows/` holds about 50 upstream workflows (e2e, release, crons, labelers, Slack and Docker Hub steps). They are not edited here. Most need secrets we do not have and will fail on this repo. Disable them in the GitHub repo settings (Actions, per workflow) once the repo exists, leaving only `paperrocket image` and `paperrocket check`. Deleting them (as paperrocket-sign did) is the other option, at the cost of rebase noise.

## Not done

- No local build, install or test (yarn runs only in CI). Edits were checked by reading types and call sites only. The shell script has a self-test that passes locally.
