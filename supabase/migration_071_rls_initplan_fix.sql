-- Supabase performance-advisor backlog (Software_Timeline.md Section 1, item 5).
-- Fixes the auth_rls_initplan finding across all 41 flagged policies as of
-- 2026-07-23: `auth.uid()`/`auth.role()` re-evaluates per row inside an RLS
-- policy unless wrapped as `(select auth.uid())`, which lets Postgres
-- evaluate it once per statement (an initplan) instead. ALTER POLICY
-- preserves the policy's existing roles/command scope and only replaces
-- the USING/WITH CHECK expression, so this is purely a perf change with no
-- behavior change -- every policy here used the same simple
-- `auth.uid() = column` or `EXISTS (... auth.uid() ...)` shape, audited via
-- pg_policies before generating this migration, so the wrap-in-select
-- pattern applies uniformly and safely across all of them.

alter policy "own activity evaluations" on public.activity_evaluations using (((select auth.uid()) = user_id)) with check (((select auth.uid()) = user_id));
alter policy "counselor reads own school snapshots" on public.aggregate_snapshots using ((EXISTS ( SELECT 1 FROM counselors c WHERE ((c.school_id = aggregate_snapshots.school_id) AND (c.user_id = (select auth.uid()))))));
alter policy "own outcomes" on public.application_outcomes using (((select auth.uid()) = user_id)) with check (((select auth.uid()) = user_id));
alter policy "counselor manages own at-risk dismissals" on public.at_risk_dismissals using ((EXISTS ( SELECT 1 FROM counselors c WHERE ((c.counselor_id = at_risk_dismissals.counselor_id) AND (c.user_id = (select auth.uid())))))) with check ((EXISTS ( SELECT 1 FROM counselors c WHERE ((c.counselor_id = at_risk_dismissals.counselor_id) AND (c.user_id = (select auth.uid()))))));
alter policy owner_manages_own_blocks on public.blocks using (((select auth.uid()) = blocker_id)) with check (((select auth.uid()) = blocker_id));
alter policy "authenticated users can read career path cache" on public.career_path_cache using (((select auth.role()) = 'authenticated'::text));
alter policy "authenticated users can read college photo cache" on public.college_photo_cache using (((select auth.role()) = 'authenticated'::text));
alter policy "authenticated users can read college stats cache" on public.college_stats_cache using (((select auth.role()) = 'authenticated'::text));
alter policy "counselor manages own notes" on public.counselor_notes using ((EXISTS ( SELECT 1 FROM counselors c WHERE ((c.counselor_id = counselor_notes.counselor_id) AND (c.user_id = (select auth.uid())))))) with check ((EXISTS ( SELECT 1 FROM counselors c WHERE ((c.counselor_id = counselor_notes.counselor_id) AND (c.user_id = (select auth.uid()))))));
alter policy "counselor manages own student notes" on public.counselor_student_notes using ((EXISTS ( SELECT 1 FROM counselors c WHERE ((c.counselor_id = counselor_student_notes.counselor_id) AND (c.user_id = (select auth.uid())))))) with check ((EXISTS ( SELECT 1 FROM counselors c WHERE ((c.counselor_id = counselor_student_notes.counselor_id) AND (c.user_id = (select auth.uid()))))));
alter policy "own counselor row" on public.counselors using (((select auth.uid()) = user_id));
alter policy "counselor reads shared student essay feedback" on public.essay_feedback_history using ((EXISTS ( SELECT 1 FROM (counselors c JOIN profiles p ON ((p.school_id = c.school_id))) WHERE ((c.user_id = (select auth.uid())) AND (p.user_id = essay_feedback_history.user_id) AND (p.share_narrative_with_counselor = true)))));
alter policy "own essay feedback history" on public.essay_feedback_history using (((select auth.uid()) = user_id)) with check (((select auth.uid()) = user_id));
alter policy "own generation jobs" on public.generation_jobs using (((select auth.uid()) = user_id)) with check (((select auth.uid()) = user_id));
alter policy owner_all on public.interview_sessions using (((select auth.uid()) = user_id)) with check (((select auth.uid()) = user_id));
alter policy participants_read_messages on public.mentor_messages using ((EXISTS ( SELECT 1 FROM mentor_requests r WHERE ((r.id = mentor_messages.request_id) AND (((select auth.uid()) = r.mentee_id) OR ((select auth.uid()) = r.mentor_id))))));
alter policy participants_send_messages on public.mentor_messages with check ((((select auth.uid()) = sender_id) AND (EXISTS ( SELECT 1 FROM mentor_requests r WHERE ((r.id = mentor_messages.request_id) AND (r.status = 'accepted'::text) AND (((select auth.uid()) = r.mentee_id) OR ((select auth.uid()) = r.mentor_id)))))));
alter policy mentee_creates on public.mentor_requests with check (((select auth.uid()) = mentee_id));
alter policy mentor_responds on public.mentor_requests using (((select auth.uid()) = mentor_id)) with check (((select auth.uid()) = mentor_id));
alter policy participants_read on public.mentor_requests using ((((select auth.uid()) = mentee_id) OR ((select auth.uid()) = mentor_id)));
alter policy "counselor reads shared student narrative" on public.narrative_profiles using ((EXISTS ( SELECT 1 FROM (counselors c JOIN profiles p ON ((p.school_id = c.school_id))) WHERE ((c.user_id = (select auth.uid())) AND (p.user_id = narrative_profiles.user_id) AND (p.share_narrative_with_counselor = true)))));
alter policy owner_all on public.narrative_profiles using (((select auth.uid()) = user_id)) with check (((select auth.uid()) = user_id));
alter policy "Users can manage their own profile" on public.profiles using (((select auth.uid()) = user_id));
alter policy "counselor reads assigned students" on public.profiles using ((EXISTS ( SELECT 1 FROM counselors c WHERE ((c.user_id = (select auth.uid())) AND (c.school_id = profiles.school_id)))));
alter policy owner_all on public.recommenders using (((select auth.uid()) = user_id)) with check (((select auth.uid()) = user_id));
alter policy "Users can manage their own regeneration log" on public.regeneration_log using (((select auth.uid()) = user_id));
alter policy "counselor manages own reminders" on public.reminder_log using ((EXISTS ( SELECT 1 FROM counselors c WHERE ((c.counselor_id = reminder_log.counselor_id) AND (c.user_id = (select auth.uid())))))) with check ((EXISTS ( SELECT 1 FROM counselors c WHERE ((c.counselor_id = reminder_log.counselor_id) AND (c.user_id = (select auth.uid()))))));
alter policy reporter_creates_and_reads_own on public.reports using (((select auth.uid()) = reporter_id)) with check (((select auth.uid()) = reporter_id));
alter policy "counselor reads assigned student review requests" on public.review_requests using ((EXISTS ( SELECT 1 FROM (counselors c JOIN profiles p ON ((p.school_id = c.school_id))) WHERE ((c.user_id = (select auth.uid())) AND (p.user_id = review_requests.user_id)))));
alter policy "counselor updates assigned student review requests" on public.review_requests using ((EXISTS ( SELECT 1 FROM (counselors c JOIN profiles p ON ((p.school_id = c.school_id))) WHERE ((c.user_id = (select auth.uid())) AND (p.user_id = review_requests.user_id))))) with check ((EXISTS ( SELECT 1 FROM (counselors c JOIN profiles p ON ((p.school_id = c.school_id))) WHERE ((c.user_id = (select auth.uid())) AND (p.user_id = review_requests.user_id)))));
alter policy "student owns review requests" on public.review_requests using (((select auth.uid()) = user_id)) with check (((select auth.uid()) = user_id));
alter policy "authenticated users can read scholarship logo cache" on public.scholarship_logo_cache using (((select auth.role()) = 'authenticated'::text));
alter policy "own scholarship tracker" on public.scholarship_tracker using (((select auth.uid()) = user_id)) with check (((select auth.uid()) = user_id));
alter policy "Users can manage their own school matches" on public.school_matches using (((select auth.uid()) = user_id));
alter policy "counselor reads assigned student matches" on public.school_matches using ((EXISTS ( SELECT 1 FROM (counselors c JOIN profiles p ON ((p.school_id = c.school_id))) WHERE ((c.user_id = (select auth.uid())) AND (p.user_id = school_matches.user_id)))));
alter policy "counselor reads own school" on public.schools using ((EXISTS ( SELECT 1 FROM counselors c WHERE ((c.school_id = schools.school_id) AND (c.user_id = (select auth.uid()))))));
alter policy owner_all on public.shared_links using (((select auth.uid()) = user_id)) with check (((select auth.uid()) = user_id));
alter policy "student reads own match reactions" on public.shared_list_reactions using ((EXISTS ( SELECT 1 FROM school_matches sm WHERE ((sm.id = shared_list_reactions.school_match_id) AND (sm.user_id = (select auth.uid()))))));
alter policy "Users can manage their own timeline items" on public.timeline_items using (((select auth.uid()) = user_id));
alter policy "counselor assigns tasks to own students" on public.timeline_items with check (((assigned_by_counselor_id IS NOT NULL) AND (EXISTS ( SELECT 1 FROM (counselors c JOIN profiles p ON ((p.school_id = c.school_id))) WHERE ((c.counselor_id = timeline_items.assigned_by_counselor_id) AND (c.user_id = (select auth.uid())) AND (p.user_id = timeline_items.user_id))))));
alter policy "counselor reads assigned student timeline" on public.timeline_items using ((EXISTS ( SELECT 1 FROM (counselors c JOIN profiles p ON ((p.school_id = c.school_id))) WHERE ((c.user_id = (select auth.uid())) AND (p.user_id = timeline_items.user_id)))));
