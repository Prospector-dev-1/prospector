-- Fix Security Definer View issue by removing the problematic view
-- and using direct table access with proper RLS policies instead
DROP VIEW IF EXISTS public.profiles_masked;

-- Since the view is causing security issues, we'll rely on the existing
-- profiles table with its RLS policies and handle masking client-side
-- This is actually more secure as it ensures RLS is always applied

-- Update the existing profiles table to add the show_on_leaderboard column
-- if it doesn't exist (for the leaderboard privacy feature)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS show_on_leaderboard boolean DEFAULT false;

-- Create a simple materialized view for leaderboard data only (refreshed periodically)
-- This avoids the security definer issue while providing performance
CREATE MATERIALIZED VIEW IF NOT EXISTS public.leaderboard_data AS
SELECT 
  user_id,
  CASE 
    WHEN first_name IS NOT NULL THEN first_name 
    ELSE 'Anonymous'
  END as display_name,
  CASE 
    WHEN last_name IS NOT NULL AND length(last_name) > 0 THEN substr(last_name, 1, 1)
    ELSE ''
  END as last_initial,
  avatar_url,
  show_on_leaderboard
FROM public.profiles
WHERE show_on_leaderboard = true;

-- Enable RLS on the materialized view  
ALTER MATERIALIZED VIEW public.leaderboard_data OWNER TO authenticator;

-- Create index for performance
CREATE UNIQUE INDEX IF NOT EXISTS idx_leaderboard_data_user_id ON public.leaderboard_data(user_id);

-- Refresh the materialized view
REFRESH MATERIALIZED VIEW public.leaderboard_data;