import { describe, expect, it } from "vitest";

import { formatNzRange } from "./paperrocketDate";

describe("formatNzRange", () => {
  it("formats the example from PAP-1492", () => {
    // 16 Nov 2026 16:45 NZDT = 03:45Z
    expect(
      formatNzRange({ start: "2026-11-16T03:45:00.000Z", end: "2026-11-16T04:00:00.000Z", timeZone: "Pacific/Auckland" })
    ).toBe("Monday 16 November 2026, 4.45 to 5.00pm");
  });
  it("shows am and pm on both ends when the range crosses noon", () => {
    expect(
      formatNzRange({ start: "2026-11-16T23:30:00.000Z", end: "2026-11-17T00:15:00.000Z", timeZone: "Pacific/Auckland" })
    ).toBe("Tuesday 17 November 2026, 12.30pm to 1.15pm");
    expect(
      formatNzRange({ start: "2026-11-16T22:45:00.000Z", end: "2026-11-16T23:15:00.000Z", timeZone: "Pacific/Auckland" })
    ).toBe("Tuesday 17 November 2026, 11.45am to 12.15pm");
  });
  it("supports 24-hour clocks", () => {
    expect(
      formatNzRange({ start: "2026-11-16T03:45:00.000Z", end: "2026-11-16T04:00:00.000Z", timeZone: "Pacific/Auckland", is24h: true })
    ).toBe("Monday 16 November 2026, 16.45 to 17.00");
  });
});
