// paperrocket-book: new file, not upstream. Reminder sent to attendees 24 h and 1 h before a booking.
import { AttendeeScheduledEmail } from "./AttendeeScheduledEmail";

export const AttendeeReminderEmail = (
  props: React.ComponentProps<typeof AttendeeScheduledEmail> & { reminderKind?: "24h" | "1h" }
) => {
  const { reminderKind = "24h", ...rest } = props;
  return (
    <AttendeeScheduledEmail
      title={reminderKind === "1h" ? "pr_reminder_title_1h" : "pr_reminder_title_24h"}
      subtitle={<>{props.attendee.language.translate("pr_reminder_subtitle")}</>}
      headerType="calendarCircle"
      {...rest}
    />
  );
};
