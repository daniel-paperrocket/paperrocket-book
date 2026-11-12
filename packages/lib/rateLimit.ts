import { Ratelimit, type LimitOptions, type RatelimitResponse } from "@unkey/ratelimit";

import { isIpInBanListString } from "./getIP";
import logger from "./logger";

const log = logger.getSubLogger({ prefix: ["RateLimit"] });

export { type RatelimitResponse };

export type RateLimitHelper = {
  rateLimitingType?:
    | "core"
    | "forcedSlowMode"
    | "common"
    | "api"
    | "ai"
    | "sms"
    | "smsMonth"
    | "instantMeeting";
  identifier: string;
  opts?: LimitOptions;
  /**
   * Using a callback instead of a regular return to provide headers even
   * when the rate limit is reached and an error is thrown.
   **/
  onRateLimiterResponse?: (response: RatelimitResponse) => void;
};

export const API_KEY_RATE_LIMIT = 30;

let warned = false;

// paperrocket-book: fixed-window limiter held in this process. Same limits as the Unkey ones below.
// One container per site, so process memory is enough; a restart clears the counts.
const LOCAL_LIMITS: Record<NonNullable<RateLimitHelper["rateLimitingType"]>, { limit: number; windowMs: number }> = {
  core: { limit: 10, windowMs: 60_000 },
  instantMeeting: { limit: 1, windowMs: 10 * 60_000 },
  common: { limit: 200, windowMs: 60_000 },
  forcedSlowMode: { limit: 1, windowMs: 30_000 },
  api: { limit: API_KEY_RATE_LIMIT, windowMs: 60_000 },
  ai: { limit: 20, windowMs: 24 * 60 * 60_000 },
  sms: { limit: 50, windowMs: 5 * 60_000 },
  smsMonth: { limit: 250, windowMs: 30 * 24 * 60 * 60_000 },
};
const localWindows = new Map<string, { count: number; resetAt: number }>();

async function localRateLimit({ rateLimitingType = "core", identifier }: RateLimitHelper) {
  const type = isIpInBanListString(identifier) ? "forcedSlowMode" : rateLimitingType;
  const { limit, windowMs } = LOCAL_LIMITS[type];
  const now = Date.now();
  if (localWindows.size > 5000) {
    localWindows.forEach((w, k) => {
      if (w.resetAt <= now) localWindows.delete(k);
    });
  }
  const key = `${type}:${identifier}`;
  let win = localWindows.get(key);
  if (!win || win.resetAt <= now) {
    win = { count: 0, resetAt: now + windowMs };
    localWindows.set(key, win);
  }
  win.count += 1;
  return {
    success: win.count <= limit,
    limit,
    remaining: Math.max(0, limit - win.count),
    reset: win.resetAt,
  } as RatelimitResponse;
}

export function rateLimiter() {
  const { UNKEY_ROOT_KEY } = process.env;

  if (!UNKEY_ROOT_KEY) {
    // paperrocket-book: without Unkey, use an in-memory limiter (see local limiter below) instead of no limit.
    // Off in tests and when PR_LOCAL_RATE_LIMIT=false.
    if (process.env.NODE_ENV !== "test" && process.env.PR_LOCAL_RATE_LIMIT !== "false") {
      if (!warned) {
        log.warn("UNKEY_ROOT_KEY not set: using the in-memory rate limiter (paperrocket-book).");
        warned = true;
      }
      return localRateLimit;
    }
    if (!warned) {
      log.warn("Disabled because the UNKEY_ROOT_KEY environment variable was not found.");
      warned = true;
    }
    return () => ({ success: true, limit: 10, remaining: 999, reset: 0 }) as RatelimitResponse;
  }
  const timeout = {
    fallback: { success: true, limit: 10, remaining: 999, reset: 0 },
    ms: 5000,
  };

  const onError = (err: Error, identifier: string) => {
    log.error("Unkey rate limiter encountered unknown error", {
      error: err.message,
      stack: err.stack,
      identifier,
      timestamp: new Date().toISOString(),
    });
    return { success: true, limit: 10, remaining: 999, reset: 0 };
  };

  const limiter = {
    core: new Ratelimit({
      rootKey: UNKEY_ROOT_KEY,
      namespace: "core",
      limit: 10,
      duration: "60s",
      timeout,
      onError,
    }),
    instantMeeting: new Ratelimit({
      rootKey: UNKEY_ROOT_KEY,
      namespace: "instantMeeting",
      limit: 1,
      duration: "10m",
      timeout,
      onError,
    }),
    common: new Ratelimit({
      rootKey: UNKEY_ROOT_KEY,
      namespace: "common",
      limit: 200,
      duration: "60s",
      timeout,
      onError,
    }),
    forcedSlowMode: new Ratelimit({
      rootKey: UNKEY_ROOT_KEY,
      namespace: "forcedSlowMode",
      limit: 1,
      duration: "30s",
      timeout,
      onError,
    }),
    api: new Ratelimit({
      rootKey: UNKEY_ROOT_KEY,
      namespace: "api",
      limit: API_KEY_RATE_LIMIT,
      duration: "60s",
      timeout,
      onError,
    }),
    ai: new Ratelimit({
      rootKey: UNKEY_ROOT_KEY,
      namespace: "ai",
      limit: 20,
      duration: "1d",
      timeout,
      onError,
    }),
    sms: new Ratelimit({
      rootKey: UNKEY_ROOT_KEY,
      namespace: "sms",
      limit: 50,
      duration: "5m",
      timeout,
      onError,
    }),
    smsMonth: new Ratelimit({
      rootKey: UNKEY_ROOT_KEY,
      namespace: "smsMonth",
      limit: 250,
      duration: "30d",
      timeout,
      onError,
    }),
  };

  async function rateLimit({ rateLimitingType = "core", identifier, opts }: RateLimitHelper) {
    if (isIpInBanListString(identifier)) {
      return await limiter.forcedSlowMode.limit(identifier, opts);
    }

    return await limiter[rateLimitingType].limit(identifier, opts);
  }

  return rateLimit;
}
