// paperrocket-book: letterhead settings for every email. New file, not upstream.
import { APP_NAME, COMPANY_NAME, WEBAPP_URL, WEBSITE_URL } from "@calcom/lib/constants";

export const PR_FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

export const PR_COLOURS = {
  page: "#F6F6F4",
  card: "#FFFFFF",
  cardBorder: "#ECECE8",
  ink: "#141414",
  muted: "#5C5C58",
  label: "#8A8A85",
  line: "#D9D9D4",
} as const;

const HEX = /^#[0-9a-fA-F]{6}$/;

/** Brand colour for the rule under the letterhead. Env PR_EMAIL_BRAND_COLOR (#rrggbb), else ink. */
export const getBrandColour = (): string => {
  const value = process.env.PR_EMAIL_BRAND_COLOR?.trim();
  return value && HEX.test(value) ? value : PR_COLOURS.ink;
};

/** Optional absolute https logo URL (PR_EMAIL_LOGO_URL). Unset means a text wordmark, never the upstream logo. */
export const getLogoUrl = (): string | undefined => {
  const value = process.env.PR_EMAIL_LOGO_URL?.trim();
  return value && /^https:\/\//.test(value) ? value : undefined;
};

/** Name guests see. Env PR_EMAIL_NAME (for example "Paper Rocket"), else the app name. */
export const getLetterheadName = (): string => process.env.PR_EMAIL_NAME?.trim() || APP_NAME;

/** Optional footer lines under the name (address, phone). Env PR_EMAIL_FOOTER_LINES, separated by | . */
export const getFooterLines = (): string[] =>
  (process.env.PR_EMAIL_FOOTER_LINES ?? "")
    .split("|")
    .map((l) => l.trim())
    .filter(Boolean);
export const getFooterName = (): string => COMPANY_NAME;
export const getHomeUrl = (): string => WEBSITE_URL || WEBAPP_URL;
