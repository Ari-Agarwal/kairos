-- Week 1: counselor dashboard tables, columns, and RLS policies.
-- Safe to run against the existing live schema (profiles, school_matches,
-- timeline_items, regeneration_log already exist and are NOT recreated here).

create table if not exists schools (
  school_id uuid primary key default gen_random_uuid(),
  name text not null,
  district text,
  license_tier text check (license_tier in ('small','medium','large','district')) not null,
  license_expiry date not null,
  created_at timestamptz default now()
);

create table if not exists counselors (
  counselor_id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  school_id uuid references schools(school_id) not null,
  name text not null,
  email text not null,
  created_at timestamptz default now()
);

create table if not exists counselor_notes (
  id uuid primary key default gen_random_uuid(),
  counselor_id uuid references counselors(counselor_id) not null,
  student_user_id uuid references auth.users not null,
  note_text text,
  updated_at timestamptz default now(),
  unique (counselor_id, student_user_id)
);

create table if not exists reminder_log (
  id uuid primary key default gen_random_uuid(),
  counselor_id uuid references counselors(counselor_id) not null,
  student_user_id uuid references auth.users not null,
  message_text text not null,
  sent_at timestamptz default now()
);

alter table profiles add column if not exists school_id uuid references schools(school_id);
alter table profiles add column if not exists counselor_id uuid references counselors(counselor_id);
alter table profiles add column if not exists last_login_at timestamptz;

alter table schools enable row level security;
alter table counselors enable row level security;
alter table counselor_notes enable row level security;
alter table reminder_log enable row level security;

drop policy if exists "own counselor row" on counselors;
create policy "own counselor row" on counselors for select using (auth.uid() = user_id);

drop policy if exists "counselor reads own school" on schools;
create policy "counselor reads own school" on schools for select using (
  exists (select 1 from counselors c where c.school_id = schools.school_id and c.user_id = auth.uid())
);

drop policy if exists "counselor reads assigned students" on profiles;
create policy "counselor reads assigned students" on profiles for select using (
  exists (
    select 1 from counselors c
    where c.user_id = auth.uid() and c.school_id = profiles.school_id
  )
);

drop policy if exists "counselor reads assigned student matches" on school_matches;
create policy "counselor reads assigned student matches" on school_matches for select using (
  exists (
    select 1 from counselors c
    join profiles p on p.school_id = c.school_id
    where c.user_id = auth.uid() and p.user_id = school_matches.user_id
  )
);

drop policy if exists "counselor reads assigned student timeline" on timeline_items;
create policy "counselor reads assigned student timeline" on timeline_items for select using (
  exists (
    select 1 from counselors c
    join profiles p on p.school_id = c.school_id
    where c.user_id = auth.uid() and p.user_id = timeline_items.user_id
  )
);

drop policy if exists "counselor manages own notes" on counselor_notes;
create policy "counselor manages own notes" on counselor_notes for all using (
  exists (select 1 from counselors c where c.counselor_id = counselor_notes.counselor_id and c.user_id = auth.uid())
) with check (
  exists (select 1 from counselors c where c.counselor_id = counselor_notes.counselor_id and c.user_id = auth.uid())
);

drop policy if exists "counselor manages own reminders" on reminder_log;
create policy "counselor manages own reminders" on reminder_log for all using (
  exists (select 1 from counselors c where c.counselor_id = reminder_log.counselor_id and c.user_id = auth.uid())
) with check (
  exists (select 1 from counselors c where c.counselor_id = reminder_log.counselor_id and c.user_id = auth.uid())
);
