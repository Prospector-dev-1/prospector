-- Fix the remaining Security Definer View issue  
-- Drop and recreate profiles_masked view as regular view (not security definer)
DROP VIEW IF EXISTS public.profiles_masked;
CREATE VIEW public.profiles_masked AS
SELECT 
  id,
  user_id,
  CASE 
    WHEN (auth.role() = 'service_role'::text) OR has_role(auth.uid(), 'admin'::app_role) OR (auth.uid() = user_id) THEN email 
    ELSE regexp_replace(email, '(.{2}).*@', '\1***@')
  END as email,
  CASE 
    WHEN (auth.role() = 'service_role'::text) OR has_role(auth.uid(), 'admin'::app_role) OR (auth.uid() = user_id) THEN first_name 
    ELSE CASE WHEN first_name IS NOT NULL AND length(first_name) > 1 THEN substr(first_name, 1, 1) || '***' ELSE first_name END
  END as first_name,
  CASE 
    WHEN (auth.role() = 'service_role'::text) OR has_role(auth.uid(), 'admin'::app_role) OR (auth.uid() = user_id) THEN last_name 
    ELSE CASE WHEN last_name IS NOT NULL AND length(last_name) > 1 THEN substr(last_name, 1, 1) || '***' ELSE last_name END
  END as last_name,
  CASE 
    WHEN (auth.role() = 'service_role'::text) OR has_role(auth.uid(), 'admin'::app_role) OR (auth.uid() = user_id) THEN phone_number 
    ELSE CASE WHEN phone_number IS NOT NULL AND length(phone_number) > 5 THEN substr(phone_number, 1, 3) || '***' || substr(phone_number, -2) ELSE phone_number END
  END as phone_number,
  credits,
  subscription_type,
  subscription_end,
  avatar_url,
  created_at,
  updated_at,
  monthly_credits_used,
  monthly_custom_scripts_used,
  monthly_credits_limit,
  monthly_custom_scripts_limit,
  monthly_coaching_unlimited,
  billing_cycle_start,
  show_on_leaderboard
FROM public.profiles;