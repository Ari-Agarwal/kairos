create table profiles (
  user_id uuid references auth.users primary key,
  grade_level text check (grade_level in ('Freshman','Sophomore','Junior','Senior')) not null,
  gpa decimal not null,
  intended_major text,
  extracurriculars text[],
  location_preference text,
  college_goals text,
  test_scores jsonb,
  subscription_tier text check (subscription_tier in ('free','premium')) default 'free' not null,
  school_id uuid,
  counselor_id uuid,
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
  primary key (user_id, week_start_date)
);

alter table profiles enable row level security;
alter table school_matches enable row level security;
alter table timeline_items enable row level security;
alter table regeneration_log enable row level security;

create policy "own profile" on profiles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own matches" on school_matches for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own timeline" on timeline_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own regen log" on regeneration_log for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create function public.get_student_count()
returns bigint
language sql
security definer
set search_path = public, auth
as $$
  select count(*) from auth.users;
$$;

grant execute on function public.get_student_count() to anon, authenticated;
