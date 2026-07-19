-- The aggregate view was a single point-in-time snapshot with no way to
-- tell if timeline completion or at-risk counts are trending up or down.
-- This stores a daily per-school-per-grade snapshot (written by a cron job,
-- see api/cron/aggregate-snapshot) that the live view can diff against.

create table if not exists aggregate_snapshots (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(school_id) not null,
  grade_level text not null,
  snapshot_date date not null,
  student_count int not null,
  avg_gpa numeric,
  avg_timeline_completion_pct int,
  at_risk_count int not null,
  created_at timestamptz default now(),
  unique (school_id, grade_level, snapshot_date)
);

alter table aggregate_snapshots enable row level security;

drop policy if exists "counselor reads own school snapshots" on aggregate_snapshots;
create policy "counselor reads own school snapshots" on aggregate_snapshots for select using (
  exists (select 1 from counselors c where c.school_id = aggregate_snapshots.school_id and c.user_id = auth.uid())
);
