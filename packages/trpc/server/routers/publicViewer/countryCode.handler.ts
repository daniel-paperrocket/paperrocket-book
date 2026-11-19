import type { CreateInnerContextOptions } from "../../createContext";

type CountryCodeOptions = {
  ctx: CreateInnerContextOptions;
};

export const countryCodeHandler = async ({ ctx }: CountryCodeOptions) => {
  const { req } = ctx;

  // paperrocket-book: PR_DEFAULT_PHONE_COUNTRY (e.g. NZ) sets the phone field's default country for every
  // visitor. Unset, upstream behaviour (Vercel's geo header, then the browser language).
  const countryCode: string | string[] =
    process.env.PR_DEFAULT_PHONE_COUNTRY || req?.headers?.["x-vercel-ip-country"] || "";
  return { countryCode: Array.isArray(countryCode) ? countryCode[0] : countryCode };
};

export default countryCodeHandler;
