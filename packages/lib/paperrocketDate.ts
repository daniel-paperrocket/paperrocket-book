// paperrocket-book: not upstream. One NZ-style formatter for booking dates, so emails and the booking page agree:
// "Monday 16 November 2026, 4.45 to 5.00pm" (24-hour: "Monday 16 November 2026, 16.45 to 17.00").
import dayjs from "@calcom/dayjs";

type When = string | Date;

const at = (when: When, timeZone: string, locale: string) => dayjs(when).tz(timeZone).locale(locale);

/** "Thursday 19 November 2026" */
export function formatNzDate({ date, timeZone, locale = "en" }: { date: When; timeZone: string; locale?: string }) {
  return at(date, timeZone, locale).format("dddd D MMMM YYYY");
}

/** "9.00am", or "09.00" on a 24-hour clock */
export function formatNzTime({
  date,
  timeZone,
  locale = "en",
  is24h = false,
}: {
  date: When;
  timeZone: string;
  locale?: string;
  is24h?: boolean;
}) {
  return at(date, timeZone, locale).format(is24h ? "HH.mm" : "h.mma");
}

/** "4.45 to 5.00pm", "11.45am to 12.15pm", or "16.45 to 17.00". A zero-length range is one time. */
export function formatNzTimeRange({
  start,
  end,
  timeZone,
  locale = "en",
  is24h = false,
}: {
  start: When;
  end: When;
  timeZone: string;
  locale?: string;
  is24h?: boolean;
}) {
  const s = (format: string) => at(start, timeZone, locale).format(format);
  const e = (format: string) => at(end, timeZone, locale).format(format);
  if (dayjs(start).valueOf() === dayjs(end).valueOf()) return formatNzTime({ date: start, timeZone, locale, is24h });
  if (is24h) return `${s("HH.mm")} to ${e("HH.mm")}`;
  const sameHalf = s("a") === e("a");
  return `${sameHalf ? s("h.mm") : s("h.mma")} to ${e("h.mma")}`;
}

export function formatNzRange({
  start,
  end,
  timeZone,
  locale = "en",
  is24h = false,
}: {
  start: When;
  end: When;
  timeZone: string;
  locale?: string;
  is24h?: boolean;
}) {
  return `${formatNzDate({ date: start, timeZone, locale })}, ${formatNzTimeRange({ start, end, timeZone, locale, is24h })}`;
}
