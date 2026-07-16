-- Phase 3, Section 5: SMS-first nudges. TCPA-style explicit opt-in --
-- consent is its own field/timestamp, never inferred from providing a phone
-- number, and is not a condition of using the rest of the product.

alter table profiles
  add column if not exists phone_number text check (char_length(phone_number) <= 20),
  add column if not exists sms_opt_in boolean not null default false,
  add column if not exists sms_opt_in_at timestamptz,
  add column if not exists sms_notification_prefs jsonb not null default
    '{"deadline_reminders": true, "weekly_essay_prompt": true, "odds_updates": true}';
