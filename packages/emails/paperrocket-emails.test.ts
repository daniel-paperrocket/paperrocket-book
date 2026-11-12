// paperrocket-book: new file, not upstream. Renders every booking email we reworded and checks the letterhead,
// the wording and the brand settings. Set PR_SNAPSHOT_DIR to also write each email as an .html file (CI uploads them).
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@calcom/prisma", () => ({ prisma: {} }));

const en = JSON.parse(
  readFileSync(path.join(__dirname, "../i18n/locales/en/common.json"), "utf8")
) as Record<string, string>;

const translate = ((key: string, vars: Record<string, string> = {}) =>
  (en[key] ?? key).replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(vars[name] ?? ""))) as never;

const person = (name: string, email: string, tz = "Pacific/Auckland") => ({
  name,
  email,
  timeZone: tz,
  language: { translate, locale: "en" },
});

const maria = person("Maria", "maria@example.test");
const organizer = person("Daniel Rae", "daniel@example.test");
const calEvent = {
  type: "Chat",
  title: "Chat between Daniel Rae and Maria",
  startTime: "2026-11-20T01:00:00.000Z",
  endTime: "2026-11-20T01:30:00.000Z",
  organizer: person("Daniel Rae", "daniel@example.test"),
  attendees: [maria],
  uid: "test-uid-1",
  location: "https://meet.example.test/abc",
  additionalNotes: "Bring the roof photos.",
  bookerUrl: "https://book.example.test",
  recurringEvent: null,
  destinationCalendar: [],
  responses: {},
  customInputs: null,
} as never;

type Render = (template: string, props: Record<string, unknown>) => Promise<string>;
let render: Render;

const CASES: Array<{
  template: string;
  heading: string;
  extra?: Record<string, unknown>;
  noAttendee?: boolean;
}> = [
  { template: "AttendeeScheduledEmail", heading: "You are booked" },
  { template: "AttendeeRescheduledEmail", heading: "Your booking has moved" },
  { template: "AttendeeCancelledEmail", heading: "Your booking has been cancelled" },
  { template: "AttendeeRequestEmail", heading: "Request received" },
  { template: "AttendeeDeclinedEmail", heading: "That booking request was declined" },
  { template: "AttendeeReminderEmail", heading: "Your booking is tomorrow", extra: { reminderKind: "24h" } },
  { template: "AttendeeReminderEmail", heading: "Your booking starts in an hour", extra: { reminderKind: "1h" } },
  { template: "OrganizerScheduledEmail", heading: "You have a new booking", extra: { attendee: organizer } },
  { template: "OrganizerCancelledEmail", heading: "Your booking has been cancelled", extra: { attendee: organizer } },
  {
    template: "ForgotPasswordEmail",
    heading: "Hi Maria",
    noAttendee: true,
    extra: { language: translate, user: { name: "Maria", email: "maria@example.test" }, resetLink: "https://book.example.test/reset/abc" },
  },
  {
    template: "VerifyEmailByCode",
    heading: "Hi Maria",
    noAttendee: true,
    extra: { language: translate, user: { name: "Maria", email: "maria@example.test" }, verificationEmailCode: "123456", isVerifyingEmail: true },
  },
];

describe("paperrocket-book emails", () => {
  beforeAll(async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_NAME", "Test Booking");
    vi.stubEnv("NEXT_PUBLIC_COMPANY_NAME", "Test Company Ltd");
    vi.stubEnv("NEXT_PUBLIC_WEBSITE_URL", "https://www.example.test");
    vi.stubEnv("PR_EMAIL_BRAND_COLOR", "#0A7C66");
    vi.stubEnv("PR_EMAIL_NAME", "Test Booking");
    vi.stubEnv("PR_EMAIL_FOOTER_LINES", "1 Example Street, Wanaka | 03 555 0100");
    vi.stubEnv("NEXT_PUBLIC_SUPPORT_MAIL_ADDRESS", "hello@example.test");
    vi.resetModules();
    render = (await import("./src/renderEmail")).default as unknown as Render;
  });

  for (const { template, heading, extra, noAttendee } of CASES) {
    it(`${template}${extra?.reminderKind ? ` (${extra.reminderKind})` : ""} uses the letterhead and plain wording`, async () => {
      const html = await render(template, noAttendee ? { ...extra } : { calEvent, attendee: maria, ...extra });

      expect(html).toContain(heading);
      if (template === "AttendeeScheduledEmail") {
        expect(html).toContain("Friday 20 November 2026, 2.00 to 2.30pm"); // NZ format, 01:00Z is 14:00 NZDT
        expect(html).toContain("Organiser");
      }
      expect(html).toContain("Test Booking"); // letterhead name
      expect(html).toContain("Test Company Ltd"); // footer
      expect(html).toContain("#0A7C66"); // brand rule
      expect(html).not.toMatch(/\/emails\/(logo|checkCircle|xCircle|calendarCircle|teamCircle)/);
      expect(html).not.toContain("Cal.diy");
      expect(html).not.toContain("Cal Video");
      expect(html.toLowerCase()).not.toContain("cal.com");
      expect(html).toContain("1 Example Street, Wanaka"); // footer lines
      expect(html).not.toContain("Organizer"); // NZ spelling
      expect(html).not.toContain("—"); // no em dash
      expect(html.length).toBeLessThan(80_000); // Gmail clips at about 102 KB

      if (process.env.PR_SNAPSHOT_DIR) {
        mkdirSync(process.env.PR_SNAPSHOT_DIR, { recursive: true });
        const name = `${template}${extra?.reminderKind ? `-${extra.reminderKind}` : ""}.html`;
        writeFileSync(path.join(process.env.PR_SNAPSHOT_DIR, name), html);
      }
    });
  }
});

describe("paperrocket-book wording", () => {
  it("has no em dash in any key we changed", () => {
    const keys = [
      "event_cancelled_subject",
      "event_request_declined",
      "event_request_cancelled",
      "your_event_has_been_scheduled",
      "event_has_been_rescheduled",
      "booking_submitted",
      "pr_reminder_title_24h",
      "pr_reminder_title_1h",
      "pr_reminder_subject",
    ];
    for (const key of keys) {
      expect(en[key], key).toBeTruthy();
      expect(en[key], key).not.toContain("—");
    }
  });
});
