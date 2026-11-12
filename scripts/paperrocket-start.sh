#!/bin/sh
# paperrocket-book: runtime branding and brand files, run from scripts/start.sh before the app starts.
# New file, not upstream. See paperrocket/README.md and paperrocket/BRAND.md.

WEB_DIR="${PRBOOK_WEB_DIR:-apps/web}"
BRAND_DIR="${PRBOOK_BRAND_DIR:-/calcom/brand}"

# Escape a value for use as the replacement side of sed with "|" as the delimiter.
sed_escape() {
  printf '%s' "$1" | sed -e 's/[\\&|]/\\&/g'
}

# Values land inside JS and JSON string literals in the built output, so these characters would break them.
is_unsafe() {
  case "$1" in
    *'"'* | *'\'* | *'`'* | *'$'*) return 0 ;;
  esac
  return 1
}

SED_ARGS_FILE="$(mktemp)"
trap 'rm -f "$SED_ARGS_FILE"' EXIT

# add_swap <placeholder> <runtime value> <upstream default>
# Unset or unsafe runtime value: fall back to the upstream default, so no placeholder is left in the build.
add_swap() {
  placeholder="$1"
  value="$2"
  default="$3"
  if [ -z "$value" ]; then
    value="$default"
  elif is_unsafe "$value"; then
    echo "paperrocket-book: ignoring value for ${placeholder}: it contains a double quote, backslash, backtick or dollar sign. Using the default." >&2
    value="$default"
  fi
  printf 's|%s|%s|g\n' "$placeholder" "$(sed_escape "$value")" >> "$SED_ARGS_FILE"
}

# The placeholders are baked in by the Dockerfile (ENV lines marked paperrocket-book).
add_swap "PRBOOK_PLACEHOLDER_APP_NAME" "$NEXT_PUBLIC_APP_NAME" "Cal.diy"
add_swap "PRBOOK_PLACEHOLDER_COMPANY_NAME" "$NEXT_PUBLIC_COMPANY_NAME" "Cal.com, Inc."
add_swap "PRBOOK_PLACEHOLDER_SUPPORT_MAIL_ADDRESS" "$NEXT_PUBLIC_SUPPORT_MAIL_ADDRESS" "help@cal.com"
# The URL placeholders include the scheme, so the runtime value must carry its own (as upstream's ensureProtocol expects).
add_swap "https://PRBOOK_PLACEHOLDER_WEBSITE_URL" "$NEXT_PUBLIC_WEBSITE_URL" "$NEXT_PUBLIC_WEBAPP_URL"
add_swap "https://PRBOOK_PLACEHOLDER_PRIVACY_URL" "$NEXT_PUBLIC_WEBSITE_PRIVACY_POLICY_URL" "https://cal.com/privacy"
add_swap "https://PRBOOK_PLACEHOLDER_TERMS_URL" "$NEXT_PUBLIC_WEBSITE_TERMS_URL" "https://cal.com/terms"
# Sign-up is off unless the site says otherwise: the login page hides its sign-up link and the signup routes refuse.
add_swap "PRBOOK_PLACEHOLDER_DISABLE_SIGNUP" "$NEXT_PUBLIC_DISABLE_SIGNUP" "true"

echo "paperrocket-book: swapping build placeholders for runtime branding."
for file in $(grep -rlF "PRBOOK_PLACEHOLDER_" "$WEB_DIR/.next/" "$WEB_DIR/public/" 2>/dev/null); do
  sed -i -f "$SED_ARGS_FILE" "$file"
done

# The web app manifest hard-codes the product name.
if [ -f "$WEB_DIR/public/site.webmanifest" ] && [ -n "$NEXT_PUBLIC_APP_NAME" ] && ! is_unsafe "$NEXT_PUBLIC_APP_NAME"; then
  sed -i -e "s|\"Cal.diy\"|\"$(sed_escape "$NEXT_PUBLIC_APP_NAME")\"|g" "$WEB_DIR/public/site.webmanifest"
fi

# Brand files: overwrite matching files in the web app's public folder from a mounted folder.
if [ -d "$BRAND_DIR" ]; then
  echo "paperrocket-book: applying brand files from ${BRAND_DIR}."
  (cd "$BRAND_DIR" && find . -type f) | while IFS= read -r rel; do
    rel="${rel#./}"
    if [ -f "$WEB_DIR/public/$rel" ]; then
      cp "$BRAND_DIR/$rel" "$WEB_DIR/public/$rel" && echo "  replaced public/$rel"
    else
      echo "  skipped $rel: no matching file in public/ (see paperrocket/BRAND.md for the names)" >&2
    fi
  done
fi
