import type { TFunction } from "i18next";
import { RRule } from "rrule";

// TODO: Use browser locale, implement Intl in Dayjs maybe?
import "@calcom/dayjs/locales";
import { getEveryFreqFor } from "@calcom/lib/recurringStrings";
import { formatNzRange } from "@calcom/lib/paperrocketDate";
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

export function WhenInfo(props: {
  calEvent: CalendarEvent;
  timeZone: string;
  t: TFunction;
  locale: string;
  timeFormat: TimeFormat;
}) {
  const { timeZone, t, calEvent: { recurringEvent } = {}, locale, timeFormat } = props;

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
            {formatNzRange({
              start: props.calEvent.startTime,
              end: props.calEvent.endTime,
              timeZone,
              locale,
              is24h: String(timeFormat).includes("H"),
            })}{" "}
            <span style={{ color: "#4B5563" }}>({timeZone})</span>
          </span>
        }
        withSpacer
      />
    </div>
  );
}
