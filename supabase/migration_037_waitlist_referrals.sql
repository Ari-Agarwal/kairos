-- Referral loop for the waitlist (docs/Launch_Plan.md §3.5): every signup
-- gets a shareable code, and a signup can credit whichever code referred it.
-- Queue "position" is derived from created_at order, not stored — no
-- reshuffling logic needed when referrals move someone up in the display.

alter table waitlist_signups
  add column if not exists referral_code text;

create unique index if not exists idx_waitlist_signups_referral_code
  on waitlist_signups(referral_code);

alter table waitlist_signups
  add column if not exists referred_by text references waitlist_signups(referral_code);

create index if not exists idx_waitlist_signups_referred_by
  on waitlist_signups(referred_by);
