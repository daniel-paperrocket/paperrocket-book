// paperrocket-book: new file, not upstream. The in-memory limiter used when UNKEY_ROOT_KEY is not set.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("local rate limiter (no Unkey)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("UNKEY_ROOT_KEY", "");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PR_LOCAL_RATE_LIMIT", "");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("allows 10 core calls a minute per identifier, then refuses the 11th", async () => {
    const { checkRateLimitAndThrowError } = await import("./checkRateLimitAndThrowError");
    for (let i = 0; i < 10; i++) {
      await expect(checkRateLimitAndThrowError({ identifier: "login:a@example.test" })).resolves.toBeTruthy();
    }
    await expect(checkRateLimitAndThrowError({ identifier: "login:a@example.test" })).rejects.toMatchObject({
      statusCode: 429,
    });
  });

  it("counts each identifier on its own", async () => {
    const { checkRateLimitAndThrowError } = await import("./checkRateLimitAndThrowError");
    for (let i = 0; i < 10; i++) await checkRateLimitAndThrowError({ identifier: "login:b@example.test" });
    await expect(
      checkRateLimitAndThrowError({ identifier: "login:c@example.test" })
    ).resolves.toBeTruthy();
  });

  it("is switched off by PR_LOCAL_RATE_LIMIT=false", async () => {
    vi.stubEnv("PR_LOCAL_RATE_LIMIT", "false");
    const { checkRateLimitAndThrowError } = await import("./checkRateLimitAndThrowError");
    for (let i = 0; i < 20; i++) {
      await expect(checkRateLimitAndThrowError({ identifier: "login:d@example.test" })).resolves.toBeTruthy();
    }
  });
});
