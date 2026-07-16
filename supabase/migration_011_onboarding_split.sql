-- Phase 3, Section 1: onboarding split. Minimal account creation (name, grade,
-- current school) now reaches a first real match without also requiring
-- campus preferences / schools-already-considering up front -- those move to
-- a post-match, contextual "complete your profile" nudge instead (existing
-- ProfileCompletenessModal.tsx + /profile edit). GPA, major, extracurriculars,
-- and test scores stay required in onboarding since they're the actual inputs
-- the matching methodology depends on (see schoolMatchingPrompt in
-- src/lib/anthropic.ts); only the fields that don't gate match *quality* move.
alter table profiles
  alter column schools_already_considering drop not null,
  alter column campus_size_pref drop not null,
  alter column campus_setting_pref drop not null;
