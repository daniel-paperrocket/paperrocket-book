import { formatDateTime, formatDateTimeRange } from "@calcom/lib/dateTimeFormatter";
import { formatNzDate, formatNzTime, formatNzTimeRange } from "@calcom/lib/paperrocketDate";
import { TimeFormat } from "@calcom/lib/timeFormat";

// paperrocket-book: English booking pages show NZ dates ("Thursday 19 November 2026", "9.00am"), the same
// as the emails. Other languages keep upstream's Intl formatting.
const isEnglish = (language: string) => language === "en" || language.startsWith("en-");

interface EventFromToTime {
  date: string;
  duration: number | null;
  timeFormat: TimeFormat;
  timeZone: string;
  language: string;
}

interface EventFromTime {
  date: string;
  timeFormat: TimeFormat;
  timeZone: string;
  language: string;
}

export const formatEventFromTime = ({ date, timeFormat, timeZone, language }: EventFromTime) => {
  const startDate = new Date(date);
  if (isEnglish(language)) {
    const is24h = timeFormat !== TimeFormat.TWELVE_HOUR;
    return { date: formatNzDate({ date: startDate, timeZone }), time: formatNzTime({ date: startDate, timeZone, is24h }) };
  }

  const formattedDate = formatDateTime(startDate, {
    locale: language,
    timeZone,
    dateStyle: "full",
  });

  const formattedTime = formatDateTime(startDate, {
    locale: language,
    timeZone,
    timeStyle: "short",
    hour12: timeFormat === TimeFormat.TWELVE_HOUR,
  });

  return {
    date: formattedDate,
    time: timeFormat === TimeFormat.TWELVE_HOUR ? formattedTime.toLowerCase() : formattedTime,
  };
};

export const formatEventFromToTime = ({
  date,
  duration,
  timeFormat,
  timeZone,
  language,
}: EventFromToTime) => {
  const startDate = new Date(date);
  const endDate = duration
    ? new Date(new Date(date).setMinutes(startDate.getMinutes() + duration))
    : startDate;
  if (isEnglish(language)) {
    const is24h = timeFormat !== TimeFormat.TWELVE_HOUR;
    return {
      date: formatNzDate({ date: startDate, timeZone }),
      time: formatNzTimeRange({ start: startDate, end: endDate, timeZone, is24h }),
    };
  }

  const formattedDate = formatDateTimeRange(startDate, endDate, {
    locale: language,
    timeZone,
    dateStyle: "full",
  });

  const formattedTime = formatDateTimeRange(startDate, endDate, {
    locale: language,
    timeZone,
    timeStyle: "short",
    hour12: timeFormat === TimeFormat.TWELVE_HOUR,
  });

  return {
    date: formattedDate,
    time: timeFormat === TimeFormat.TWELVE_HOUR ? formattedTime.toLowerCase() : formattedTime,
  };
};

export const FromToTime = (props: EventFromToTime) => {
  const formatted = formatEventFromToTime(props);
  return (
    <>
      {formatted.date}
      <br />
      {formatted.time}
    </>
  );
};

export const FromTime = (props: EventFromTime) => {
  const formatted = formatEventFromTime(props);
  return (
    <>
      {formatted.date}, {formatted.time}
    </>
  );
};
