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

/** Safe to send to the browser: never includes the client secret. */
export const getOidcPublicProps = () => ({
  isOidcLoginEnabled: isOidcEnabled(),
  oidcProviderLabel: (process.env.OIDC_PROVIDER_LABEL || "").trim() || null,
  oidcProviderLogoUrl: (process.env.OIDC_PROVIDER_LOGO_URL || "").trim() || null,
  isPasswordLoginDisabled: isPasswordLoginDisabled(),
});
