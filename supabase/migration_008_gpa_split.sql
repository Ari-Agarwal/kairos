-- Splits the single `gpa` field into unweighted and weighted GPA, since
-- schools compute both differently and admissions comparisons need both.
alter table profiles rename column gpa to unweighted_gpa;
alter table profiles add column weighted_gpa decimal;
update profiles set weighted_gpa = unweighted_gpa where weighted_gpa is null;
alter table profiles alter column weighted_gpa set not null;
