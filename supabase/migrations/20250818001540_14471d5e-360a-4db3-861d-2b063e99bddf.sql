-- Admin management policies + extend service-role-only tables for admins

-- Ensure helper: has_role function exists (already present per project context)
-- No schema changes, only RLS policy additions/updates

-- 1) Calls: full admin manage
DROP POLICY IF EXISTS "Admins can manage calls" ON public.calls;
CREATE POLICY "Admins can manage calls"
ON public.calls
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 2) Call uploads: full admin manage
DROP POLICY IF EXISTS "Admins can manage call_uploads" ON public.call_uploads;
CREATE POLICY "Admins can manage call_uploads"
ON public.call_uploads
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 3) Challenges: full admin manage (content management)
DROP POLICY IF EXISTS "Admins can manage challenges" ON public.challenges;
CREATE POLICY "Admins can manage challenges"
ON public.challenges
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 4) Profiles: add missing insert/delete for admins (update/select already exist)
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
CREATE POLICY "Admins can insert profiles"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
CREATE POLICY "Admins can delete profiles"
ON public.profiles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 5) AI replays: full admin manage (affects leaderboard)
DROP POLICY IF EXISTS "Admins can manage ai_replays" ON public.ai_replays;
CREATE POLICY "Admins can manage ai_replays"
ON public.ai_replays
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 6) User challenge progress: full admin manage (affects leaderboard)
DROP POLICY IF EXISTS "Admins can manage user_challenge_progress" ON public.user_challenge_progress;
CREATE POLICY "Admins can manage user_challenge_progress"
ON public.user_challenge_progress
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 7) User daily stats: full admin manage (affects leaderboard streaks/highest)
DROP POLICY IF EXISTS "Admins can manage user_daily_stats" ON public.user_daily_stats;
CREATE POLICY "Admins can manage user_daily_stats"
ON public.user_daily_stats
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 8) Call objectives: admin manage (content mgmt)
DROP POLICY IF EXISTS "Admins can manage call_objectives" ON public.call_objectives;
CREATE POLICY "Admins can manage call_objectives"
ON public.call_objectives
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 9) Business types: admin manage (content mgmt)
DROP POLICY IF EXISTS "Admins can manage business_types" ON public.business_types;
CREATE POLICY "Admins can manage business_types"
ON public.business_types
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 10) Credit transactions: admin full manage
DROP POLICY IF EXISTS "Admins can manage credit_transactions" ON public.credit_transactions;
CREATE POLICY "Admins can manage credit_transactions"
ON public.credit_transactions
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 11) Extend service-role-only tables to allow admins as well
-- ai_analysis_cache
DROP POLICY IF EXISTS "Admins can manage ai_analysis_cache" ON public.ai_analysis_cache;
CREATE POLICY "Admins can manage ai_analysis_cache"
ON public.ai_analysis_cache
FOR ALL
TO authenticated
USING (
  (auth.role() = 'service_role') OR public.has_role(auth.uid(), 'admin'::public.app_role)
)
WITH CHECK (
  (auth.role() = 'service_role') OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- provider_health
DROP POLICY IF EXISTS "Admins can manage provider_health" ON public.provider_health;
CREATE POLICY "Admins can manage provider_health"
ON public.provider_health
FOR ALL
TO authenticated
USING (
  (auth.role() = 'service_role') OR public.has_role(auth.uid(), 'admin'::public.app_role)
)
WITH CHECK (
  (auth.role() = 'service_role') OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Note: We are not removing existing user-facing policies; these additions grant admins full control while preserving user access.
