-- Personalization beyond function (Software_Timeline.md Section 15) --
-- an optional accent-color preference, constrained to a small set of
-- alternates that stay inside the locked palette's guardrails (CLAUDE.md
-- design rules): only the brand-accent hue changes, never the reserved
-- --red (reach-tier/errors) or --premium (premium tier) meanings, and tier
-- distinction keeps reading primarily by shade/label, not by this choice.
alter table profiles
  add column accent_color text not null default 'forest'
    check (accent_color in ('forest', 'navy', 'mustard'));
