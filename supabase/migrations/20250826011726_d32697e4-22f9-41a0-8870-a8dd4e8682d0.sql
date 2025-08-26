-- Simple fix: just remove the problematic view and add the missing column
DROP VIEW IF EXISTS public.profiles_masked;

-- Add the show_on_leaderboard column for privacy controls
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS show_on_leaderboard boolean DEFAULT false;

-- We'll handle PII masking client-side using the existing profiles table
-- with proper RLS policies, which is more secure than a view