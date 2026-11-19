// paperrocket-book: new file. Hidden event types with private links are bookable only with a valid link.
import { describe, expect, it, vi } from "vitest";

vi.mock("@calcom/prisma", () => ({ default: {}, prisma: {} }));

import {
  PRIVATE_LINK_REQUIRED,
  assertCanBookEventType,
  canBookEventType,
  type PrivateLinkDeps,
} from "./paperrocketPrivateLink";

const link = (over: Partial<{ link: string; expiresAt: Date | null; maxUsageCount: number | null; usageCount: number }> = {}) => ({
  link: "staff-link",
  expiresAt: null,
  maxUsageCount: 0,
  usageCount: 0,
  ...over,
});

const deps = (
  access: { hidden: boolean; links: ReturnType<typeof link>[]; ownerId?: number | null } | null,
  rescheduled: Record<string, number> = {}
): PrivateLinkDeps => ({
  findEventTypeAccess: vi.fn(async () => (access ? { ownerId: null, ...access } : null)),
  findRescheduledEventTypeId: vi.fn(async (uid: string) => rescheduled[uid] ?? null),
});

describe("canBookEventType", () => {
  it("allows a public event type, and a hidden one with no private links (upstream behaviour)", async () => {
    expect(await canBookEventType({ eventTypeId: 1 }, deps({ hidden: false, links: [link()] }))).toBe(true);
    expect(await canBookEventType({ eventTypeId: 1 }, deps({ hidden: true, links: [] }))).toBe(true);
    expect(await canBookEventType({ eventTypeId: 1 }, deps(null))).toBe(true);
  });

  it("refuses a hidden event type with private links when no link is given (page and API)", async () => {
    expect(await canBookEventType({ eventTypeId: 2 }, deps({ hidden: true, links: [link()] }))).toBe(false);
    expect(await canBookEventType({ eventTypeId: 2, hashedLink: null }, deps({ hidden: true, links: [link()] }))).toBe(false);
  });

  it("refuses a wrong link, one from another event type, an expired one and a used-up one", async () => {
    const d = deps({ hidden: true, links: [link()] });
    expect(await canBookEventType({ eventTypeId: 2, hashedLink: "guess" }, d)).toBe(false);
    const past = new Date(Date.now() - 86_400_000);
    expect(
      await canBookEventType({ eventTypeId: 2, hashedLink: "staff-link" }, deps({ hidden: true, links: [link({ expiresAt: past })] }))
    ).toBe(false);
    expect(
      await canBookEventType(
        { eventTypeId: 2, hashedLink: "staff-link" },
        deps({ hidden: true, links: [link({ maxUsageCount: 1, usageCount: 1 })] })
      )
    ).toBe(false);
  });

  it("allows the event type's own link, and maxUsageCount 0 stays unlimited", async () => {
    const d = deps({ hidden: true, links: [link({ maxUsageCount: 0, usageCount: 500 })] });
    expect(await canBookEventType({ eventTypeId: 2, hashedLink: "staff-link" }, d)).toBe(true);
    const future = new Date(Date.now() + 86_400_000);
    expect(
      await canBookEventType({ eventTypeId: 2, hashedLink: "staff-link" }, deps({ hidden: true, links: [link({ expiresAt: future })] }))
    ).toBe(true);
  });

  it("allows rescheduling a booking of the same event type, not of another one", async () => {
    const d = deps({ hidden: true, links: [link()] }, { "same-uid": 2, "other-uid": 9 });
    expect(await canBookEventType({ eventTypeId: 2, rescheduleUid: "same-uid" }, d)).toBe(true);
    expect(await canBookEventType({ eventTypeId: 2, rescheduleUid: "other-uid" }, d)).toBe(false);
    expect(await canBookEventType({ eventTypeId: 2, rescheduleUid: "missing" }, d)).toBe(false);
  });
});

describe("canBookEventType, review fixes", () => {
  it("lets the owner see their own hidden event type, nobody else", async () => {
    const d = deps({ hidden: true, links: [link()], ownerId: 5 });
    expect(await canBookEventType({ eventTypeId: 2, viewerUserId: 5 }, d)).toBe(true);
    expect(await canBookEventType({ eventTypeId: 2, viewerUserId: 6 }, d)).toBe(false);
    expect(await canBookEventType({ eventTypeId: 2, viewerUserId: null }, d)).toBe(false);
  });

  it("books slots 2 onwards of a recurring series after slot 1 used up a single-use link", async () => {
    const usedUp = deps({ hidden: true, links: [link({ maxUsageCount: 1, usageCount: 1 })] });
    expect(await canBookEventType({ eventTypeId: 2, hashedLink: "staff-link" }, usedUp)).toBe(false);
    expect(await canBookEventType({ eventTypeId: 2, hashedLink: "staff-link", laterRecurringSlot: true }, usedUp)).toBe(true);
    // still needs the right link, and a time-expired link stays refused
    expect(await canBookEventType({ eventTypeId: 2, hashedLink: "guess", laterRecurringSlot: true }, usedUp)).toBe(false);
    const past = new Date(Date.now() - 86_400_000);
    expect(
      await canBookEventType(
        { eventTypeId: 2, hashedLink: "staff-link", laterRecurringSlot: true },
        deps({ hidden: true, links: [link({ expiresAt: past })] })
      )
    ).toBe(false);
  });
});

describe("assertCanBookEventType", () => {
  it("throws a 403 for the booking API", async () => {
    await expect(assertCanBookEventType({ eventTypeId: 2 }, deps({ hidden: true, links: [link()] }))).rejects.toMatchObject({
      statusCode: 403,
      message: PRIVATE_LINK_REQUIRED,
    });
    await expect(
      assertCanBookEventType({ eventTypeId: 2, hashedLink: "staff-link" }, deps({ hidden: true, links: [link()] }))
    ).resolves.toBeUndefined();
  });
});
