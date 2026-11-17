// paperrocket-book: new file. A hidden event type that has private (hashed) links can only be booked with
// one of those links. Upstream only checks links on the /d/<link>/<slug> page, so a hidden event type was
// bookable from its plain /<user>/<slug> page and from the booking API with only its eventTypeId.
import { isLinkExpired } from "@calcom/lib/hashedLinksUtils";
import { HttpError } from "@calcom/lib/http-error";
import prisma from "@calcom/prisma";

export const PRIVATE_LINK_REQUIRED = "This event can only be booked with its private link.";

type PrivateLink = {
  link: string;
  expiresAt: Date | null;
  maxUsageCount: number | null;
  usageCount: number;
};

export type PrivateLinkDeps = {
  /** null when the event type does not exist */
  findEventTypeAccess: (eventTypeId: number) => Promise<{ hidden: boolean; links: PrivateLink[] } | null>;
  /** the event type of the booking (or booking seat) being rescheduled, or null */
  findRescheduledEventTypeId: (uid: string) => Promise<number | null>;
};

export const prismaPrivateLinkDeps: PrivateLinkDeps = {
  findEventTypeAccess: async (eventTypeId) => {
    const eventType = await prisma.eventType.findUnique({
      where: { id: eventTypeId },
      select: {
        hidden: true,
        hashedLink: { select: { link: true, expiresAt: true, maxUsageCount: true, usageCount: true } },
      },
    });
    return eventType ? { hidden: eventType.hidden, links: eventType.hashedLink } : null;
  },
  findRescheduledEventTypeId: async (uid) => {
    const booking = await prisma.booking.findUnique({ where: { uid }, select: { eventTypeId: true } });
    if (booking) return booking.eventTypeId ?? null;
    const seat = await prisma.bookingSeat.findUnique({
      where: { referenceUid: uid },
      select: { booking: { select: { eventTypeId: true } } },
    });
    return seat?.booking.eventTypeId ?? null;
  },
};

/**
 * true when this request may book the event type:
 * - it is not hidden, or it is hidden but has no private links (upstream behaviour), or
 * - it carries one of the event type's own private links that has not expired
 *   (maxUsageCount 0 or null means unlimited, as upstream), or
 * - it reschedules an existing booking of this same event type (the reschedule link in the email).
 */
export async function canBookEventType(
  {
    eventTypeId,
    hashedLink,
    rescheduleUid,
  }: { eventTypeId: number; hashedLink?: string | null; rescheduleUid?: string | null },
  deps: PrivateLinkDeps = prismaPrivateLinkDeps
): Promise<boolean> {
  const access = await deps.findEventTypeAccess(eventTypeId);
  if (!access || !access.hidden || access.links.length === 0) return true;
  if (hashedLink) {
    const match = access.links.find((l) => l.link === hashedLink);
    if (match && !isLinkExpired(match)) return true;
  }
  if (rescheduleUid) {
    const rescheduledEventTypeId = await deps.findRescheduledEventTypeId(rescheduleUid);
    if (rescheduledEventTypeId === eventTypeId) return true;
  }
  return false;
}

/** For the booking service: throws a 403 when canBookEventType says no. */
export async function assertCanBookEventType(
  input: { eventTypeId: number; hashedLink?: string | null; rescheduleUid?: string | null },
  deps: PrivateLinkDeps = prismaPrivateLinkDeps
) {
  if (!(await canBookEventType(input, deps))) {
    throw new HttpError({ statusCode: 403, message: PRIVATE_LINK_REQUIRED });
  }
}
