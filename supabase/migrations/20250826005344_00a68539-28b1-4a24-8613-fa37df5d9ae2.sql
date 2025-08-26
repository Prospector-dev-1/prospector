-- Defense-in-depth masking: function and security barrier view for profiles
CREATE OR REPLACE FUNCTION public.can_view_pii(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT (
    auth.role() = 'service_role'
    OR public.has_role(auth.uid(), 'admin')
    OR auth.uid() = target_user_id
  );
$$;

-- Create a masking view that redacts PII unless caller is owner/admin/service
DROP VIEW IF EXISTS public.profiles_masked CASCADE;
CREATE VIEW public.profiles_masked
WITH (security_barrier=true)
AS
SELECT
  p.id,
  p.user_id,
  CASE WHEN public.can_view_pii(p.user_id)
       THEN p.email
       ELSE regexp_replace(p.email, '(^..)[^@]*(@.*$)', '\1***\2')
  END AS email,
  CASE WHEN public.can_view_pii(p.user_id)
       THEN p.first_name
       ELSE CASE WHEN p.first_name IS NULL THEN NULL
                 ELSE substr(p.first_name, 1, 1) || repeat('*', GREATEST(length(p.first_name) - 1, 0))
            END
  END AS first_name,
  CASE WHEN public.can_view_pii(p.user_id)
       THEN p.last_name
       ELSE CASE WHEN p.last_name IS NULL THEN NULL
                 ELSE substr(p.last_name, 1, 1) || repeat('*', GREATEST(length(p.last_name) - 1, 0))
            END
  END AS last_name,
  CASE WHEN public.can_view_pii(p.user_id)
       THEN p.phone_number
       ELSE CASE WHEN p.phone_number IS NULL THEN NULL
                 ELSE regexp_replace(p.phone_number, '(.{3}).*(.{2})$', '\1***\2')
            END
  END AS phone_number,
  p.credits,
  p.subscription_type,
  p.subscription_end,
  p.avatar_url,
  p.monthly_credits_used,
  p.monthly_coaching_unlimited,
  p.monthly_credits_limit,
  p.monthly_custom_scripts_used,
  p.monthly_custom_scripts_limit,
  p.billing_cycle_start,
  p.created_at,
  p.updated_at
FROM public.profiles p;

-- Optional: Grant select on view to authenticated users (underlying RLS still applies)
GRANT SELECT ON public.profiles_masked TO authenticated;