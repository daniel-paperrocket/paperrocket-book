#!/usr/bin/env bash
# paperrocket-book is a public repo: client names, hosts and server paths must not land in it.
#
#   scripts/paperrocket/check-no-infra.sh [base-ref]
#
# Fails if the lines this branch adds (against base-ref, when given) or the files we own match the pattern
# below, case-insensitive. Upstream Cal.diy files are only checked through the added lines, because
# upstream uses 127.0.0.1 and similar in its own docs. Test fixtures with made-up data may use example.* names.
set -euo pipefail

PATTERN='constructive|/srv/|127\.0\.0\.1|pr-vps'
SELF=':(exclude)scripts/paperrocket/check-no-infra.sh'
OWN=(.github docs/cutover.md paperrocket scripts/paperrocket scripts/paperrocket-start.sh PATCHES.md packages/emails/paperrocket-emails.test.ts packages/emails/src/components/paperrocket-letterhead.ts packages/lib/rateLimit.local.test.ts apps/web/app/api/cron/paperrocketReminders)
status=0

echo "Checking the files we own"
if git grep -n -i -E "$PATTERN" -- "${OWN[@]}" "$SELF"; then
  status=1
fi

if [ -n "${1:-}" ]; then
  echo "Checking lines added since $1"
  if git diff -U0 "$1"...HEAD -- . "$SELF" | grep -E '^\+[^+]' | grep -n -i -E "$PATTERN"; then
    status=1
  fi
fi

if [ "$status" -ne 0 ]; then
  echo "FAIL: names a client, host or server path (pattern: $PATTERN). Keep those in the private notes, not this repo." >&2
  exit 1
fi

echo "OK: no client names, hosts or server paths"
