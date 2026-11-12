#!/bin/sh
# paperrocket-book: self-test for scripts/paperrocket-start.sh. Builds a fake web app folder, runs the script, checks the output.
set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

mkdir -p "$TMP/web/.next/server" "$TMP/web/public/emails" "$TMP/brand/emails"
cat > "$TMP/web/.next/server/page.js" <<'JS'
var a="PRBOOK_PLACEHOLDER_APP_NAME",b="PRBOOK_PLACEHOLDER_COMPANY_NAME",c="PRBOOK_PLACEHOLDER_SUPPORT_MAIL_ADDRESS";
var d="https://PRBOOK_PLACEHOLDER_WEBSITE_URL",e="https://PRBOOK_PLACEHOLDER_PRIVACY_URL",f="https://PRBOOK_PLACEHOLDER_TERMS_URL";
var g="PRBOOK_PLACEHOLDER_DISABLE_SIGNUP";
JS
printf 'old' > "$TMP/web/public/emails/logo.png"
printf 'old' > "$TMP/web/public/favicon-16x16.png"
printf '{"name":"Cal.diy"}' > "$TMP/web/public/site.webmanifest"
printf 'new-email-logo' > "$TMP/brand/emails/logo.png"
printf 'stray' > "$TMP/brand/not-in-public.png"

# Set: awkward characters (space, ampersand, slash, pipe, apostrophe).
PRBOOK_WEB_DIR="$TMP/web" PRBOOK_BRAND_DIR="$TMP/brand" \
NEXT_PUBLIC_WEBAPP_URL="http://localhost:3000" \
NEXT_PUBLIC_APP_NAME="Smith & Sons | Bookings" \
NEXT_PUBLIC_COMPANY_NAME="Smith's Plumbing/Gas Ltd" \
NEXT_PUBLIC_SUPPORT_MAIL_ADDRESS="hi@smith.example" \
NEXT_PUBLIC_WEBSITE_URL="https://smith.example" \
NEXT_PUBLIC_WEBSITE_PRIVACY_POLICY_URL="https://smith.example/privacy?a=1&b=2" \
NEXT_PUBLIC_WEBSITE_TERMS_URL="https://smith.example/terms" \
NEXT_PUBLIC_DISABLE_SIGNUP="false" \
  sh "$ROOT/scripts/paperrocket-start.sh" > "$TMP/out.txt" 2>&1

js="$TMP/web/.next/server/page.js"
grep -qF 'a="Smith & Sons | Bookings"' "$js"
grep -qF 'b="Smith'"'"'s Plumbing/Gas Ltd"' "$js"
grep -qF 'e="https://smith.example/privacy?a=1&b=2"' "$js"
grep -qF 'g="false"' "$js"
! grep -q PRBOOK_PLACEHOLDER_ "$js"
grep -qF '"Smith & Sons | Bookings"' "$TMP/web/public/site.webmanifest"
[ "$(cat "$TMP/web/public/emails/logo.png")" = "new-email-logo" ]
[ "$(cat "$TMP/web/public/favicon-16x16.png")" = "old" ]

# Unset: upstream defaults, nothing left behind.
cat > "$js" <<'JS'
var a="PRBOOK_PLACEHOLDER_APP_NAME",d="https://PRBOOK_PLACEHOLDER_WEBSITE_URL",g="PRBOOK_PLACEHOLDER_DISABLE_SIGNUP";
JS
env -u NEXT_PUBLIC_APP_NAME -u NEXT_PUBLIC_WEBSITE_URL -u NEXT_PUBLIC_DISABLE_SIGNUP \
  PRBOOK_WEB_DIR="$TMP/web" PRBOOK_BRAND_DIR="$TMP/none" NEXT_PUBLIC_WEBAPP_URL="http://localhost:3000" \
  sh "$ROOT/scripts/paperrocket-start.sh" > /dev/null 2>&1
grep -qF 'a="Cal.diy"' "$js"
grep -qF 'd="http://localhost:3000"' "$js"
grep -qF 'g="true"' "$js"

echo "paperrocket-book runtime brand self-test passed"
