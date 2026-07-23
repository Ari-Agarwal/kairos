-- 076_split_all_policies_merge_permissive.sql
-- Splits broad ALL "owner" policies into explicit per-action policies on
-- essay_feedback_history, narrative_profiles, profiles, review_requests,
-- school_matches, timeline_items, then merges each with its overlapping
-- narrower counselor-scoped policy via OR so net access is unchanged but
-- Postgres evaluates fewer permissive policies per query action.

-- ============ essay_feedback_history ============
DROP POLICY IF EXISTS "own essay feedback history" ON public.essay_feedback_history;
DROP POLICY IF EXISTS "counselor reads shared student essay feedback" ON public.essay_feedback_history;

CREATE POLICY "select own or counselor-shared essay feedback"
  ON public.essay_feedback_history FOR SELECT
  USING (
    (select auth.uid()) = user_id
    OR EXISTS (
      SELECT 1 FROM counselors c JOIN profiles p ON p.school_id = c.school_id
      WHERE c.user_id = (select auth.uid())
        AND p.user_id = essay_feedback_history.user_id
        AND p.share_narrative_with_counselor = true
    )
  );

CREATE POLICY "insert own essay feedback"
  ON public.essay_feedback_history FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "update own essay feedback"
  ON public.essay_feedback_history FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "delete own essay feedback"
  ON public.essay_feedback_history FOR DELETE
  USING ((select auth.uid()) = user_id);

-- ============ narrative_profiles ============
DROP POLICY IF EXISTS "owner_all" ON public.narrative_profiles;
DROP POLICY IF EXISTS "counselor reads shared student narrative" ON public.narrative_profiles;

CREATE POLICY "select own or counselor-shared narrative"
  ON public.narrative_profiles FOR SELECT
  USING (
    (select auth.uid()) = user_id
    OR EXISTS (
      SELECT 1 FROM counselors c JOIN profiles p ON p.school_id = c.school_id
      WHERE c.user_id = (select auth.uid())
        AND p.user_id = narrative_profiles.user_id
        AND p.share_narrative_with_counselor = true
    )
  );

CREATE POLICY "insert own narrative"
  ON public.narrative_profiles FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "update own narrative"
  ON public.narrative_profiles FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "delete own narrative"
  ON public.narrative_profiles FOR DELETE
  USING ((select auth.uid()) = user_id);

-- ============ profiles ============
DROP POLICY IF EXISTS "Users can manage their own profile" ON public.profiles;
DROP POLICY IF EXISTS "counselor reads assigned students" ON public.profiles;

CREATE POLICY "select own or counselor same-school profile"
  ON public.profiles FOR SELECT
  USING (
    (select auth.uid()) = user_id
    OR EXISTS (
      SELECT 1 FROM counselors c
      WHERE c.user_id = (select auth.uid())
        AND c.school_id = profiles.school_id
    )
  );

CREATE POLICY "insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "update own profile"
  ON public.profiles FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "delete own profile"
  ON public.profiles FOR DELETE
  USING ((select auth.uid()) = user_id);

-- ============ review_requests ============
DROP POLICY IF EXISTS "student owns review requests" ON public.review_requests;
DROP POLICY IF EXISTS "counselor reads assigned student review requests" ON public.review_requests;
DROP POLICY IF EXISTS "counselor updates assigned student review requests" ON public.review_requests;

CREATE POLICY "select own or counselor-assigned review requests"
  ON public.review_requests FOR SELECT
  USING (
    (select auth.uid()) = user_id
    OR EXISTS (
      SELECT 1 FROM counselors c JOIN profiles p ON p.school_id = c.school_id
      WHERE c.user_id = (select auth.uid())
        AND p.user_id = review_requests.user_id
    )
  );

CREATE POLICY "insert own review requests"
  ON public.review_requests FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "update own or counselor-assigned review requests"
  ON public.review_requests FOR UPDATE
  USING (
    (select auth.uid()) = user_id
    OR EXISTS (
      SELECT 1 FROM counselors c JOIN profiles p ON p.school_id = c.school_id
      WHERE c.user_id = (select auth.uid())
        AND p.user_id = review_requests.user_id
    )
  )
  WITH CHECK (
    (select auth.uid()) = user_id
    OR EXISTS (
      SELECT 1 FROM counselors c JOIN profiles p ON p.school_id = c.school_id
      WHERE c.user_id = (select auth.uid())
        AND p.user_id = review_requests.user_id
    )
  );

CREATE POLICY "delete own review requests"
  ON public.review_requests FOR DELETE
  USING ((select auth.uid()) = user_id);

-- ============ school_matches ============
DROP POLICY IF EXISTS "Users can manage their own school matches" ON public.school_matches;
DROP POLICY IF EXISTS "counselor reads assigned student matches" ON public.school_matches;

CREATE POLICY "select own or counselor-assigned school matches"
  ON public.school_matches FOR SELECT
  USING (
    (select auth.uid()) = user_id
    OR EXISTS (
      SELECT 1 FROM counselors c JOIN profiles p ON p.school_id = c.school_id
      WHERE c.user_id = (select auth.uid())
        AND p.user_id = school_matches.user_id
    )
  );

CREATE POLICY "insert own school matches"
  ON public.school_matches FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "update own school matches"
  ON public.school_matches FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "delete own school matches"
  ON public.school_matches FOR DELETE
  USING ((select auth.uid()) = user_id);

-- ============ timeline_items ============
DROP POLICY IF EXISTS "Users can manage their own timeline items" ON public.timeline_items;
DROP POLICY IF EXISTS "counselor assigns tasks to own students" ON public.timeline_items;
DROP POLICY IF EXISTS "counselor reads assigned student timeline" ON public.timeline_items;

CREATE POLICY "select own or counselor-assigned timeline items"
  ON public.timeline_items FOR SELECT
  USING (
    (select auth.uid()) = user_id
    OR EXISTS (
      SELECT 1 FROM counselors c JOIN profiles p ON p.school_id = c.school_id
      WHERE c.user_id = (select auth.uid())
        AND p.user_id = timeline_items.user_id
    )
  );

CREATE POLICY "insert own or counselor-assigned timeline items"
  ON public.timeline_items FOR INSERT
  WITH CHECK (
    (select auth.uid()) = user_id
    OR (
      assigned_by_counselor_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM counselors c JOIN profiles p ON p.school_id = c.school_id
        WHERE c.counselor_id = timeline_items.assigned_by_counselor_id
          AND c.user_id = (select auth.uid())
          AND p.user_id = timeline_items.user_id
      )
    )
  );

CREATE POLICY "update own timeline items"
  ON public.timeline_items FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "delete own timeline items"
  ON public.timeline_items FOR DELETE
  USING ((select auth.uid()) = user_id);
