# Reminder settings (FEAT-4)

**Goal:** the owner decides how automatic payment reminders behave, and can silence one client without silencing everyone.

**Behaviour**
- Per user: `reminders_enabled` (master switch, default on), `remind_before_days` (0-30, default 3, 0 = no due-soon notice), `overdue_repeat_days` (0-60, default 0 = only the first overdue notice, as today; N = repeat every N days while overdue).
- Per client: `reminders_enabled` (default on). Off means no automatic reminder for that client's invoices.
- The daily tasks still move invoices to `overdue` regardless; only the emails are gated.
- A reminder is skipped when one went out in the last 20 hours (the activity timeline is the memory), so a re-run of the task does not mail twice. Repeats are measured from the last reminder of any kind.
- The manual "Send reminder" button is an explicit act and ignores both switches.
- UI: Settings → Invoicing "Payment reminders"; client form "Send automatic payment reminders".

**Non-goals:** quiet hours, per-invoice overrides, a cap on repeats (turn the client off), SMS.

**Tests:** disabled user / disabled client sends nothing but still marks overdue; custom lead time; repeat cadence; no double send within a day; manual reminder ignores opt-out.
