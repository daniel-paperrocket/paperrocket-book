-- paperrocket-book: two reminder kinds for attendee reminder emails (24 h and 1 h before)
ALTER TYPE "ReminderType" ADD VALUE IF NOT EXISTS 'ATTENDEE_REMINDER_24H';
ALTER TYPE "ReminderType" ADD VALUE IF NOT EXISTS 'ATTENDEE_REMINDER_1H';
