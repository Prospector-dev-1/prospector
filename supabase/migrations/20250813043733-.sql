-- Add new fields to profiles table for subscription management
ALTER TABLE public.profiles 
ADD COLUMN monthly_credits_limit INTEGER DEFAULT 0,
ADD COLUMN monthly_credits_used INTEGER DEFAULT 0,
ADD COLUMN monthly_coaching_unlimited BOOLEAN DEFAULT false,
ADD COLUMN monthly_custom_scripts_limit INTEGER DEFAULT 0,
ADD COLUMN monthly_custom_scripts_used INTEGER DEFAULT 0,
ADD COLUMN billing_cycle_start TIMESTAMPTZ;

-- Create a trigger to reset monthly usage at billing cycle start
CREATE OR REPLACE FUNCTION public.reset_monthly_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE profiles 
  SET 
    monthly_credits_used = 0,
    monthly_custom_scripts_used = 0
  WHERE billing_cycle_start IS NOT NULL 
    AND billing_cycle_start <= NOW() - INTERVAL '1 month';
END;
$$;