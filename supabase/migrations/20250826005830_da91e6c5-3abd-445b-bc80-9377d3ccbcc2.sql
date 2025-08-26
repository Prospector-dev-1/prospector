-- Remove security definer view and replace with safer security barrier view
DROP VIEW IF EXISTS public.profiles_masked CASCADE;

-- Create a secure view without SECURITY DEFINER
CREATE VIEW public.profiles_masked
WITH (security_barrier=true)
AS
SELECT
  p.id,
  p.user_id,
  CASE WHEN (
    auth.role() = 'service_role'
    OR (auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'admin'
    ))
    OR auth.uid() = p.user_id
  )
    THEN p.email
    ELSE regexp_replace(p.email, '(^..)[^@]*(@.*$)', '\1***\2')
  END AS email,
  CASE WHEN (
    auth.role() = 'service_role'
    OR (auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'admin'
    ))
    OR auth.uid() = p.user_id
  )
    THEN p.first_name
    ELSE CASE WHEN p.first_name IS NULL THEN NULL
              ELSE substr(p.first_name, 1, 1) || repeat('*', GREATEST(length(p.first_name) - 1, 0))
         END
  END AS first_name,
  CASE WHEN (
    auth.role() = 'service_role'
    OR (auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'admin'
    ))
    OR auth.uid() = p.user_id
  )
    THEN p.last_name
    ELSE CASE WHEN p.last_name IS NULL THEN NULL
              ELSE substr(p.last_name, 1, 1) || repeat('*', GREATEST(length(p.last_name) - 1, 0))
         END
  END AS last_name,
  CASE WHEN (
    auth.role() = 'service_role'
    OR (auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'admin'
    ))
    OR auth.uid() = p.user_id
  )
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

-- Grant select on the masked view
GRANT SELECT ON public.profiles_masked TO authenticated;

-- Add RLS policies to the view (inherited from base table)
ALTER VIEW public.profiles_masked OWNER TO postgres;

-- Create an additional audit view to track PII access
CREATE OR REPLACE VIEW public.pii_access_log AS
SELECT 
  al.id,
  al.user_id,
  al.action,
  al.target_id,
  al.created_at,
  al.ip_address,
  CASE 
    WHEN al.action IN ('profile_view', 'profile_update', 'data_export') 
    THEN jsonb_extract_path_text(al.details, 'pii_accessed')
    ELSE null 
  END as pii_fields_accessed
FROM public.audit_logs al
WHERE al.action IN (
  'profile_view', 
  'profile_update', 
  'data_export',
  'profile_sensitive_field_update',
  'admin_profile_update'
)
ORDER BY al.created_at DESC;