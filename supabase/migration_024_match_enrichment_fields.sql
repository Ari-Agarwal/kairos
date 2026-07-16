-- Migration 024: additional profile fields that improve match quality but
-- weren't part of the original onboarding form or the Section 1 restructure.
-- Collected contextually via the pre-generation mini-onboarding (matches),
-- not added to the blocking signup flow — same pattern as migration_011.
-- (legacy status already exists as `legacy_school`, migration_010 — not
-- duplicated here.)
alter table profiles
  add column if not exists internships_research text,
  add column if not exists achievements text;
