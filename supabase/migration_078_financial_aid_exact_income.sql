-- Financial aid buildout scope reversal (Software_Timeline.md, decided
-- 2026-07-24): the product now collects the family's exact annual household
-- income instead of a bracket/range. This intentionally increases the
-- sensitivity of what's stored -- still fully gated behind the existing
-- financial_aid_info_consent opt-in, and unchecking consent still clears it.
alter table profiles
  add column if not exists financial_aid_income_exact integer
    check (financial_aid_income_exact is null or financial_aid_income_exact >= 0);

alter table profiles drop column if exists financial_aid_income_bracket;
