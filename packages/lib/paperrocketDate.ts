// paperrocket-book: not upstream. One NZ-style formatter for booking dates, so emails and the booking page agree:
// "Monday 16 November 2026, 4.45 to 5.00pm" (24-hour: "Monday 16 November 2026, 16.45 to 17.00").
import dayjs from "@calcom/dayjs";

export function formatNzRange({
  start,
  end,
  timeZone,
  locale = "en",
  is24h = false,
}: {
  start: string | Date;
  end: string | Date;
  timeZone: string;
  locale?: string;
  is24h?: boolean;
}) {
  const s = (format: string) => dayjs(start).tz(timeZone).locale(locale).format(format);
  const e = (format: string) => dayjs(end).tz(timeZone).locale(locale).format(format);
  const date = s("dddd D MMMM YYYY");
  if (is24h) return `${date}, ${s("HH.mm")} to ${e("HH.mm")}`;
  const sameHalf = s("a") === e("a");
  return `${date}, ${sameHalf ? s("h.mm") : s("h.mma")} to ${e("h.mma")}`;
}
