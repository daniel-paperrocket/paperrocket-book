// paperrocket-book: new file, not upstream. Attendee reminders 24 h and 1 h before an accepted booking.
// Call it every 5 minutes: POST /api/cron/paperrocketReminders with the CRON_API_KEY in the
// `authorization` header (or ?apiKey=). Each booking gets each reminder once (ReminderMail rows).
import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import dayjs from "@calcom/dayjs";
import { sendAttendeeReminderEmails } from "@calcom/emails/email-manager";
import { getCalEventResponses } from "@calcom/features/bookings/lib/getCalEventResponses";
import { getTranslation } from "@calcom/i18n/server";
import { isPrismaObjOrUndefined } from "@calcom/lib/isPrismaObj";
import { parseRecurringEvent } from "@calcom/lib/isRecurringEvent";
import prisma, { bookingMinimalSelect } from "@calcom/prisma";
import { BookingStatus, ReminderType } from "@calcom/prisma/enums";
import type { CalendarEvent } from "@calcom/types/Calendar";

const KINDS = [
  { kind: "24h" as const, type: ReminderType.ATTENDEE_REMINDER_24H, minutes: 24 * 60 },
  { kind: "1h" as const, type: ReminderType.ATTENDEE_REMINDER_1H, minutes: 60 },
];

async function postHandler(request: NextRequest) {
  const apiKey = request.headers.get("authorization") || request.nextUrl.searchParams.get("apiKey");

  if (!process.env.CRON_API_KEY || process.env.CRON_API_KEY !== apiKey) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  let remindersSent = 0;
  const now = dayjs();

  for (const { kind, type, minutes } of KINDS) {
    const bookings = await prisma.booking.findMany({
      where: {
        status: BookingStatus.ACCEPTED,
        // starts within the window, and has not started yet
        startTime: { gt: now.toDate(), lte: now.add(minutes, "minutes").toDate() },
        // booked early enough that this reminder is not just a second confirmation
        createdAt: { lte: now.add(-5, "minutes").toDate() },
      },
      select: {
        ...bookingMinimalSelect,
        createdAt: true,
        location: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            username: true,
            locale: true,
            timeZone: true,
            destinationCalendar: true,
          },
        },
        eventType: { select: { recurringEvent: true, bookingFields: true } },
        responses: true,
        uid: true,
        destinationCalendar: true,
      },
    });

    // Only bookings made more than the window before the start (a 24 h reminder for a booking made
    // 3 h ahead would be noise).
    const candidates = bookings.filter(
      (b) => dayjs(b.startTime).diff(dayjs(b.createdAt), "minutes") > minutes
    );

    const done = await prisma.reminderMail.findMany({
      where: { reminderType: type, referenceId: { in: candidates.map((b) => b.id) } },
      select: { referenceId: true },
    });
    const doneIds = new Set(done.map((d) => d.referenceId));

    for (const booking of candidates.filter((b) => !doneIds.has(b.id))) {
      const { user } = booking;
      const name = user?.name || user?.username;
      if (!user || !name || !user.timeZone) {
        console.error(`Booking ${booking.id} is missing required properties for a reminder`);
        continue;
      }

      // Claim it first, so an overlapping run cannot send twice.
      await prisma.reminderMail.create({
        data: { referenceId: booking.id, reminderType: type, elapsedMinutes: minutes },
      });

      try {
        const tOrganizer = await getTranslation(user.locale ?? "en", "common");
        const attendees = await Promise.all(
          booking.attendees.map(async (attendee) => ({
            name: attendee.name,
            email: attendee.email,
            timeZone: attendee.timeZone,
            language: {
              translate: await getTranslation(attendee.locale ?? "en", "common"),
              locale: attendee.locale ?? "en",
            },
          }))
        );
        const selectedDestinationCalendar = booking.destinationCalendar || user.destinationCalendar;
        const evt: CalendarEvent = {
          type: booking.title,
          title: booking.title,
          description: booking.description || undefined,
          customInputs: isPrismaObjOrUndefined(booking.customInputs),
          ...getCalEventResponses({
            bookingFields: booking.eventType?.bookingFields ?? null,
            booking,
          }),
          location: booking.location ?? "",
          startTime: booking.startTime.toISOString(),
          endTime: booking.endTime.toISOString(),
          organizer: {
            id: user.id,
            email: booking?.userPrimaryEmail ?? user.email,
            name,
            timeZone: user.timeZone,
            language: { translate: tOrganizer, locale: user.locale ?? "en" },
          },
          attendees,
          uid: booking.uid,
          recurringEvent: parseRecurringEvent(booking.eventType?.recurringEvent),
          destinationCalendar: selectedDestinationCalendar ? [selectedDestinationCalendar] : [],
        };
        await sendAttendeeReminderEmails(evt, kind);
        remindersSent++;
      } catch (error) {
        console.error(`Reminder ${kind} for booking ${booking.id} failed`, error);
      }
    }
  }

  return NextResponse.json({ remindersSent });
}

export const POST = defaultResponderForAppDir(postHandler);
