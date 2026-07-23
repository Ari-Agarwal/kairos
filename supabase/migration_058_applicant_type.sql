-- Underserved student populations & edge cases (Software_Timeline.md Section 11):
-- onboarding today implicitly assumes a standard first-time-freshman/senior
-- applying via Common App. Adds a lightweight, optional applicant-type flag
-- so a transfer student, recruited athlete, homeschooled/international
-- student, or returning-adult student isn't silently run through
-- freshman-framed timeline/matches prompts. Nullable and skippable by
-- design -- default/blank is treated as "standard" everywhere it's read,
-- never a required field that blocks account creation.
alter table profiles
  add column if not exists applicant_type text
    check (applicant_type in (
      'standard',
      'transfer',
      'homeschooled',
      'international',
      'recruited_athlete',
      'gap_year'
    ));

-- Cheap, real addition per Section 11's disability/accommodations bullet:
-- a free-text field (not a fixed enum -- disability-services needs are too
-- individual to force into a short pick-list) so a student can note that
-- campus disability-services quality/accessibility matters to their search,
-- parallel to the existing campus_size_pref/campus_setting_pref factors.
-- Optional, never surfaced as required, never used to infer anything about
-- the student beyond what they explicitly wrote.
alter table profiles
  add column if not exists accessibility_pref text check (char_length(accessibility_pref) <= 500);
