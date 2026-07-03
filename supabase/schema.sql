create table schools (
  school_id uuid primary key default gen_random_uuid(),
  name text not null,
  district text,
  license_tier text check (license_tier in ('small','medium','large','district')) not null,
  license_expiry date not null,
  created_at timestamptz default now()
);

create table counselors (
  counselor_id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  school_id uuid references schools(school_id) not null,
  name text not null,
  email text not null,
  created_at timestamptz default now()
);

create table profiles (
  user_id uuid references auth.users primary key,
  grade_level text check (grade_level in ('Freshman','Sophomore','Junior','Senior')) not null,
  gpa decimal not null,
  intended_major text not null,
  current_school text not null,
  extracurriculars text[],
  schools_already_considering text not null,
  test_scores jsonb,
  campus_size_pref text check (campus_size_pref in ('Small','Medium','Large','No preference')) not null,
  campus_setting_pref text check (campus_setting_pref in ('Urban','Suburban','Rural','No preference')) not null,
  subscription_tier text check (subscription_tier in ('free','premium')) default 'free' not null,
  stripe_customer_id text unique,
  school_id uuid references schools(school_id),
  counselor_id uuid references counselors(counselor_id),
  last_login_at timestamptz,
  created_at timestamptz default now()
);

create table school_matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  school_name text not null,
  category text check (category in ('reach','target','safety')) not null,
  percentage int not null,
  why_text text not null,
  factors jsonb not null,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table timeline_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  title text not null,
  due_date date,
  school_tags text[],
  tier text check (tier in ('free','premium')) not null,
  is_strategic boolean default false not null,
  completed boolean default false not null,
  profile_sync_field text,
  why_text text not null,
  what_to_do jsonb not null,
  created_at timestamptz default now()
);

create table regeneration_log (
  user_id uuid references auth.users not null,
  week_start_date date not null,
  count int default 0 not null,
  timeline_count int default 0 not null,
  primary key (user_id, week_start_date)
);

create table counselor_notes (
  id uuid primary key default gen_random_uuid(),
  counselor_id uuid references counselors(counselor_id) not null,
  student_user_id uuid references auth.users not null,
  note_text text,
  updated_at timestamptz default now(),
  unique (counselor_id, student_user_id)
);

create table reminder_log (
  id uuid primary key default gen_random_uuid(),
  counselor_id uuid references counselors(counselor_id) not null,
  student_user_id uuid references auth.users not null,
  message_text text not null,
  sent_at timestamptz default now()
);

create table college_stats_cache (
  school_name text primary key,
  acceptance_rate numeric,
  enrollment integer,
  ownership text,
  found boolean not null default true,
  fetched_at timestamptz default now() not null
);

alter table schools enable row level security;
alter table counselors enable row level security;
alter table profiles enable row level security;
alter table school_matches enable row level security;
alter table timeline_items enable row level security;
alter table regeneration_log enable row level security;
alter table counselor_notes enable row level security;
alter table reminder_log enable row level security;
alter table college_stats_cache enable row level security;

create policy "authenticated users can read college stats cache" on college_stats_cache
  for select using (auth.role() = 'authenticated');

create policy "own profile" on profiles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own matches" on school_matches for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own timeline" on timeline_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own regen log" on regeneration_log for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own counselor row" on counselors for select using (auth.uid() = user_id);

create policy "counselor reads own school" on schools for select using (
  exists (select 1 from counselors c where c.school_id = schools.school_id and c.user_id = auth.uid())
);

create policy "counselor reads assigned students" on profiles for select using (
  exists (
    select 1 from counselors c
    where c.user_id = auth.uid() and c.school_id = profiles.school_id
  )
);

create policy "counselor reads assigned student matches" on school_matches for select using (
  exists (
    select 1 from counselors c
    join profiles p on p.school_id = c.school_id
    where c.user_id = auth.uid() and p.user_id = school_matches.user_id
  )
);

create policy "counselor reads assigned student timeline" on timeline_items for select using (
  exists (
    select 1 from counselors c
    join profiles p on p.school_id = c.school_id
    where c.user_id = auth.uid() and p.user_id = timeline_items.user_id
  )
);

create policy "counselor manages own notes" on counselor_notes for all using (
  exists (select 1 from counselors c where c.counselor_id = counselor_notes.counselor_id and c.user_id = auth.uid())
) with check (
  exists (select 1 from counselors c where c.counselor_id = counselor_notes.counselor_id and c.user_id = auth.uid())
);

create policy "counselor manages own reminders" on reminder_log for all using (
  exists (select 1 from counselors c where c.counselor_id = reminder_log.counselor_id and c.user_id = auth.uid())
) with check (
  exists (select 1 from counselors c where c.counselor_id = reminder_log.counselor_id and c.user_id = auth.uid())
);

create function public.get_student_count()
returns bigint
language sql
security definer
set search_path = public, auth
as $$
  select count(*) from auth.users;
$$;

grant execute on function public.get_student_count() to anon, authenticated;

create index idx_counselors_school_id on counselors(school_id);
create index idx_profiles_school_id on profiles(school_id);
create index idx_profiles_counselor_id on profiles(counselor_id);
create index idx_school_matches_user_id on school_matches(user_id) where is_active;
create index idx_timeline_items_user_id on timeline_items(user_id);
create index idx_timeline_items_user_due on timeline_items(user_id, due_date) where not completed;
create index idx_counselor_notes_counselor_id on counselor_notes(counselor_id);
create index idx_reminder_log_counselor_id on reminder_log(counselor_id);
create index idx_reminder_log_student_user_id on reminder_log(student_user_id);
