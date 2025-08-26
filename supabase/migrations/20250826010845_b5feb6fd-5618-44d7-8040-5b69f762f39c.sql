-- Fix pii_access_log - create as proper table instead of view
DROP VIEW IF EXISTS public.pii_access_log;
CREATE TABLE public.pii_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  target_id uuid,
  action text,
  pii_fields_accessed text,
  ip_address text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on the new table
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