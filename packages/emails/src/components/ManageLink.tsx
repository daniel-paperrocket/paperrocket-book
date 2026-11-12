import { getBookingUrl, getCancelLink, getRescheduleLink } from "@calcom/lib/CalEventParser";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";

import { getBrandColour, PR_COLOURS, PR_FONT_STACK } from "./paperrocket-letterhead";

export function ManageLink(props: { calEvent: CalendarEvent; attendee: Person }) {
  // Only the original attendee can make changes to the event
  // Guests cannot
  const t = props.attendee.language.translate;
  const cancelLink = getCancelLink(
    {
      platformClientId: props.calEvent.platformClientId,
      platformCancelUrl: props.calEvent.platformCancelUrl,
      type: props.calEvent.type,
      organizer: props.calEvent.organizer,
      recurringEvent: props.calEvent.recurringEvent,
      bookerUrl: props.calEvent.bookerUrl,
      uid: props.calEvent.uid,
      attendeeSeatId: props.calEvent.attendeeSeatId,
      team: props.calEvent.team,
    },
    props.attendee
  );
  const rescheduleLink = getRescheduleLink({ calEvent: props.calEvent, attendee: props.attendee });
  const bookingLink = getBookingUrl({
    platformClientId: props.calEvent.platformClientId,
    platformBookingUrl: props.calEvent.platformBookingUrl,
    bookerUrl: props.calEvent.bookerUrl,
    type: props.calEvent.type,
    uid: props.calEvent.uid,
    organizer: props.calEvent.organizer,
    attendeeSeatId: props.calEvent.attendeeSeatId,
  });

  const isOriginalAttendee = props.attendee.email === props.calEvent.attendees[0]?.email;
  const isOrganizer = props.calEvent.organizer.email === props.attendee.email;
  const hasCancelLink = Boolean(cancelLink) && !props.calEvent.disableCancelling;
  const hasRescheduleLink = Boolean(rescheduleLink) && !props.calEvent.disableRescheduling;
  const hasBookingLink = Boolean(bookingLink);
  const isRecurringEvent = props.calEvent.recurringEvent;
  const shouldDisplayRescheduleLink = Boolean(hasRescheduleLink && !isRecurringEvent);
  const isTeamMember = props.calEvent.team?.members.some((member) => props.attendee.email === member.email);

  if (
    (isOriginalAttendee || isOrganizer || isTeamMember) &&
    (hasCancelLink || (!isRecurringEvent && hasRescheduleLink) || hasBookingLink)
  ) {
    // paperrocket-book: buttons instead of a text sentence (Reschedule filled, Cancel outlined).
    const brand = getBrandColour();
    const button = (href: string, label: string, filled: boolean) => (
      <td style={{ padding: "0 8px 8px 0" }}>
        <a
          href={href}
          style={{
            display: "inline-block",
            minWidth: "120px",
            padding: "13px 22px",
            borderRadius: "6px",
            border: `1px solid ${filled ? brand : PR_COLOURS.line}`,
            backgroundColor: filled ? brand : PR_COLOURS.card,
            color: filled ? "#FFFFFF" : PR_COLOURS.ink,
            fontFamily: PR_FONT_STACK,
            fontSize: "16px",
            fontWeight: 600,
            lineHeight: "20px",
            textAlign: "center",
            textDecoration: "none",
          }}>
          {label}
        </a>
      </td>
    );
    return (
      <table role="presentation" cellPadding={0} cellSpacing={0}>
        <tbody>
          <tr>
            {shouldDisplayRescheduleLink && button(rescheduleLink as string, t("reschedule"), true)}
            {hasCancelLink && button(cancelLink as string, t("cancel"), !shouldDisplayRescheduleLink)}
            {props.calEvent.platformClientId && hasBookingLink && button(bookingLink as string, t("check_here"), false)}
          </tr>
        </tbody>
      </table>
    );
  }
  // Don't have the rights to the manage link
  return null;
}
