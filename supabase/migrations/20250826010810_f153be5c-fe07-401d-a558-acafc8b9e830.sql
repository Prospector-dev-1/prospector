-- Phase 1: Fix pii_access_log RLS and security issues
-- Enable RLS on pii_access_log table
ALTER TABLE public.pii_access_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for pii_access_log
CREATE POLICY "Admins can view all PII access logs" 
ON public.pii_access_log 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can insert PII access logs" 
ON public.pii_access_log 
FOR INSERT 
WITH CHECK (auth.role() = 'service_role'::text);

CREATE POLICY "Admins can insert PII access logs" 
ON public.pii_access_log 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Fix Security Definer View issues by recreating profiles_masked as regular view
DROP VIEW IF EXISTS public.profiles_masked;
CREATE VIEW public.profiles_masked AS
SELECT 
  id,
  user_id,
  CASE 
    WHEN can_view_pii(user_id) THEN email 
    ELSE regexp_replace(email, '(.{2}).*@', '\1***@')
  END as email,
  CASE 
    WHEN can_view_pii(user_id) THEN first_name 
    ELSE CASE WHEN first_name IS NOT NULL AND length(first_name) > 1 THEN substr(first_name, 1, 1) || '***' ELSE first_name END
  END as first_name,
  CASE 
    WHEN can_view_pii(user_id) THEN last_name 
    ELSE CASE WHEN last_name IS NOT NULL AND length(last_name) > 1 THEN substr(last_name, 1, 1) || '***' ELSE last_name END
  END as last_name,
  CASE 
    WHEN can_view_pii(user_id) THEN phone_number 
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
  billing_cycle_start
FROM public.profiles;

-- Revoke public access to check_email_exists function
REVOKE EXECUTE ON FUNCTION public.check_email_exists FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_email_exists FROM authenticated;

-- Add privacy control column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS show_on_leaderboard boolean DEFAULT false;

-- Create server-side audit logging function
CREATE OR REPLACE FUNCTION public.log_security_event(
  action_name text,
  event_details jsonb DEFAULT '{}'::jsonb,
  target_user_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  client_ip text;
  user_agent text;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  -- Extract IP and user agent from request headers
  BEGIN
    client_ip := current_setting('request.headers', true)::jsonb->>'x-forwarded-for';
    user_agent := current_setting('request.headers', true)::jsonb->>'user-agent';
  EXCEPTION WHEN others THEN
    client_ip := NULL;
    user_agent := NULL;
  END;
  
  -- Validate action name (whitelist approach)
  IF action_name NOT IN ('secure_profile_access', 'secure_profile_update', 'data_export_request', 'pii_access', 'rate_limit_violation') THEN
    RAISE EXCEPTION 'Invalid action name: %', action_name;
  END IF;
  
  -- Limit details size to prevent abuse
  IF jsonb_pretty(event_details)::text LENGTH > 5000 THEN
    event_details := jsonb_build_object('error', 'Details too large, truncated');
  END IF;
  
  -- Insert audit log
  INSERT INTO public.audit_logs (
    user_id,
    action,
    target_id,
    details,
    ip_address,
    user_agent
  ) VALUES (
    COALESCE(current_user_id, '00000000-0000-0000-0000-000000000000'::uuid),
    action_name,
    target_user_id,
    event_details,
    client_ip,
    user_agent
  );
END;
$$;

-- Grant execute permission to authenticated users for specific actions
GRANT EXECUTE ON FUNCTION public.log_security_event TO authenticated;

-- Create storage policies for avatars bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatar uploads
CREATE POLICY "Users can upload their own avatar" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND (storage.extension(name) = 'jpg' OR storage.extension(name) = 'jpeg' OR storage.extension(name) = 'png' OR storage.extension(name) = 'webp')
);

CREATE POLICY "Users can update their own avatar" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatar" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Avatar images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'avatars');

-- Create rate limiting table for edge functions
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL, -- IP or user_id
  endpoint text NOT NULL,
  request_count integer DEFAULT 1,
  window_start timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(identifier, endpoint)
);

-- Enable RLS on rate_limits
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Only service role can manage rate limits
CREATE POLICY "Service role can manage rate limits" 
ON public.rate_limits 
FOR ALL 
USING (auth.role() = 'service_role'::text)
WITH CHECK (auth.role() = 'service_role'::text);