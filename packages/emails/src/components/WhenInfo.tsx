import type { TFunction } from "i18next";
import { RRule } from "rrule";

import dayjs from "@calcom/dayjs";
// TODO: Use browser locale, implement Intl in Dayjs maybe?
import "@calcom/dayjs/locales";
import { getEveryFreqFor } from "@calcom/lib/recurringStrings";
import type { TimeFormat } from "@calcom/lib/timeFormat";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";
import type { RecurringEvent } from "@calcom/types/Calendar";

import { Info } from "./Info";

export function getRecurringWhen({
  recurringEvent,
  attendee,
}: {
  recurringEvent?: RecurringEvent | null;
  attendee: Pick<Person, "language">;
}) {
  if (recurringEvent) {
    const t = attendee.language.translate;
    const rruleOptions = new RRule(recurringEvent).options;
    const recurringEventConfig: RecurringEvent = {
      freq: rruleOptions.freq,
      count: rruleOptions.count || 1,
      interval: rruleOptions.interval,
    };
    return `${getEveryFreqFor({ t, recurringEvent: recurringEventConfig })}`;
  }
  return "";
}

// paperrocket-book: NZ style, "Friday 20 November 2026, 12.00 to 12.30pm" (24-hour: "13.00 to 13.30").
function formatRange(
  start: (format: string) => string,
  end: (format: string) => string,
  timeFormat: TimeFormat
) {
  const date = start("dddd D MMMM YYYY");
  if (String(timeFormat).includes("H")) {
    return `${date}, ${start("HH.mm")} to ${end("HH.mm")}`;
  }
  const sameHalf = start("a") === end("a");
  const from = sameHalf ? start("h.mm") : start("h.mma");
  return `${date}, ${from} to ${end("h.mma")}`;
}

export function WhenInfo(props: {
  calEvent: CalendarEvent;
  timeZone: string;
  t: TFunction;
  locale: string;
  timeFormat: TimeFormat;
}) {
  const { timeZone, t, calEvent: { recurringEvent } = {}, locale, timeFormat } = props;

  function getRecipientStart(format: string) {
    return dayjs(props.calEvent.startTime).tz(timeZone).locale(locale).format(format);
  }

  function getRecipientEnd(format: string) {
    return dayjs(props.calEvent.endTime).tz(timeZone).locale(locale).format(format);
  }

  const recurringInfo = getRecurringWhen({
    recurringEvent: props.calEvent.recurringEvent,
    attendee: props.calEvent.attendees[0],
  });

  return (
    <div>
      <Info
        label={`${t("when")} ${recurringInfo !== "" ? ` - ${recurringInfo}` : ""}`}
        lineThrough={
          !!props.calEvent.cancellationReason && !props.calEvent.cancellationReason.includes("$RCH$")
        }
        description={
          <span data-testid="when">
            {recurringEvent?.count ? `${t("starting")} ` : ""}
            {formatRange(getRecipientStart, getRecipientEnd, timeFormat)}{" "}
            <span style={{ color: "#4B5563" }}>({timeZone})</span>
          </span>
        }
        withSpacer
      />
    </div>
  );
}
