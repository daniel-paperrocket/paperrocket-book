import { describe, expect, it } from "vitest";

import { formatNzDate, formatNzRange, formatNzTime, formatNzTimeRange } from "./paperrocketDate";

describe("formatNzRange", () => {
  it("formats the example from PAP-1492", () => {
    // 16 Nov 2026 16:45 NZDT = 03:45Z
    expect(
      formatNzRange({ start: "2026-11-16T03:45:00.000Z", end: "2026-11-16T04:00:00.000Z", timeZone: "Pacific/Auckland" })
    ).toBe("Monday 16 November 2026, 4.45 to 5.00pm");
  });
  it("shows am and pm on both ends only when the range crosses noon", () => {
    expect(
      formatNzRange({ start: "2026-11-16T23:30:00.000Z", end: "2026-11-17T00:15:00.000Z", timeZone: "Pacific/Auckland" })
    ).toBe("Tuesday 17 November 2026, 12.30 to 1.15pm");
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

describe("NZ date and time parts (booking page)", () => {
  // 19 Nov 2026 09:00 NZDT = 18 Nov 20:00Z
  const start = "2026-11-18T20:00:00.000Z";
  const end = "2026-11-18T21:00:00.000Z";
  const timeZone = "Pacific/Auckland";
  it("formats the date the NZ way, not 'Thursday, November 19, 2026'", () => {
    expect(formatNzDate({ date: start, timeZone })).toBe("Thursday 19 November 2026");
  });
  it("formats one time", () => {
    expect(formatNzTime({ date: start, timeZone })).toBe("9.00am");
    expect(formatNzTime({ date: start, timeZone, is24h: true })).toBe("09.00");
  });
  it("formats a time range, and a zero-length range as one time", () => {
    expect(formatNzTimeRange({ start, end, timeZone })).toBe("9.00 to 10.00am");
    expect(formatNzTimeRange({ start, end: start, timeZone })).toBe("9.00am");
  });
});
