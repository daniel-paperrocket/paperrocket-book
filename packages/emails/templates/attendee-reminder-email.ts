// paperrocket-book: new file, not upstream. Reminder sent to attendees 24 h and 1 h before a booking.
import { getReplyToHeader } from "@calcom/lib/getReplyToHeader";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";

import generateIcsFile, { GenerateIcsRole } from "../lib/generateIcsFile";
import renderEmail from "../src/renderEmail";
import AttendeeScheduledEmail from "./attendee-scheduled-email";

export type ReminderKind = "24h" | "1h";

export default class AttendeeReminderEmail extends AttendeeScheduledEmail {
  reminderKind: ReminderKind;

  constructor(calEvent: CalendarEvent, attendee: Person, reminderKind: ReminderKind) {
    super(calEvent, attendee);
    this.name = "SEND_BOOKING_REMINDER";
    this.reminderKind = reminderKind;
  }

  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    return {
      icalEvent: generateIcsFile({
        calEvent: this.calEvent,
        role: GenerateIcsRole.ATTENDEE,
        status: "CONFIRMED",
      }),
      to: `${this.attendee.name} <${this.attendee.email}>`,
      from: `${this.calEvent.organizer.name} <${this.getMailerOptions().from}>`,
      ...getReplyToHeader(this.calEvent),
      subject: `${this.t("pr_reminder_subject", {
        title: this.calEvent.title,
        date: this.getFormattedDate(),
      })}`,
      html: await this.getHtml(this.calEvent, this.attendee),
      text: this.getTextBody(this.reminderKind === "1h" ? "pr_reminder_title_1h" : "pr_reminder_title_24h"),
    };
  }

  async getHtml(calEvent: CalendarEvent, attendee: Person) {
    return await renderEmail("AttendeeReminderEmail", {
      calEvent,
      attendee,
      reminderKind: this.reminderKind,
    });
  }
}
