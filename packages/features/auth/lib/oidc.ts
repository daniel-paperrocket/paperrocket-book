// paperrocket-book: new file. Generic OpenID Connect sign-in, driven only by env (see PATCHES.md, "OIDC sign-in").

export const OIDC_PROVIDER_ID = "oidc";

export const getOidcConfig = () => {
  const issuer = (process.env.OIDC_ISSUER || "").trim().replace(/\/+$/, "");
  const clientId = (process.env.OIDC_CLIENT_ID || "").trim();
  const clientSecret = process.env.OIDC_CLIENT_SECRET || "";
  if (!issuer || !clientId || !clientSecret) return null;
  return { issuer, clientId, clientSecret };
};

export const isOidcEnabled = () => getOidcConfig() !== null;

export const isOidcSignupAllowed = () => process.env.OIDC_ALLOW_SIGNUP === "true";

export const isPasswordLoginDisabled = () => process.env.DISABLE_PASSWORD_LOGIN === "true";

let warnedLogo = false;
/** Only an https: URL is used as the button logo; anything else is treated as unset (and warned about once). */
export const getOidcLogoUrl = (): string | null => {
  const raw = (process.env.OIDC_PROVIDER_LOGO_URL || "").trim();
  if (!raw) return null;
  let ok = false;
  try {
    ok = new URL(raw).protocol === "https:";
  } catch {
    ok = false;
  }
  if (!ok) {
    if (!warnedLogo) {
      warnedLogo = true;
      console.warn("[oidc] OIDC_PROVIDER_LOGO_URL is not a valid https: URL, so no logo is shown.");
    }
    return null;
  }
  return raw;
};

/**
 * paperrocket-book: logo at the top of the login card, from PR_LOGIN_LOGO_URL. An https: URL, or a
 * path on this site starting with a single / (for example a brand file such as /cal-logo-word-black.svg).
 * Anything else is treated as unset, and the card shows the app name as text.
 */
export const getLoginLogoUrl = (): string | null => {
  const raw = (process.env.PR_LOGIN_LOGO_URL || "").trim();
  if (!raw) return null;
  if (/^\/(?![/\\])/.test(raw)) return raw;
  try {
    return new URL(raw).protocol === "https:" ? raw : null;
  } catch {
    return null;
  }
};

/** paperrocket-book: background of the OIDC button, from PR_LOGIN_BUTTON_COLOR (#rrggbb, white text). Else the theme colour. */
export const getLoginButtonColor = (): string | null => {
  const raw = (process.env.PR_LOGIN_BUTTON_COLOR || "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(raw) ? raw : null;
};

/** Safe to send to the browser: never includes the client secret. */
export const getOidcPublicProps = () => ({
  isOidcLoginEnabled: isOidcEnabled(),
  oidcProviderLabel: (process.env.OIDC_PROVIDER_LABEL || "").trim() || null,
  oidcProviderLogoUrl: getOidcLogoUrl(),
  isPasswordLoginDisabled: isPasswordLoginDisabled(),
  loginLogoUrl: getLoginLogoUrl(),
  loginButtonColor: getLoginButtonColor(),
});
