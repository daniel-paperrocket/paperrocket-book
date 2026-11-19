import { formatNzRange } from "@calcom/lib/paperrocketDate";
import { TimeFormat } from "@calcom/lib/timeFormat";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";

// paperrocket-book: NZ style, "Monday 16 November 2026, 4.45 to 5.00pm"
export function getFormattedDate(calEvent: CalendarEvent, attendee: Person): string {
  const inviteeTimeFormat = calEvent.organizer.timeFormat || TimeFormat.TWELVE_HOUR;
  return formatNzRange({
    start: calEvent.startTime,
    end: calEvent.endTime,
    timeZone: attendee.timeZone,
    locale: attendee.language.locale,
    is24h: String(inviteeTimeFormat).includes("H"),
  });
}
