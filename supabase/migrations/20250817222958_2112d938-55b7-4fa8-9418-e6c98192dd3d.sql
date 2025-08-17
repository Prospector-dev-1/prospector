-- Add columns for credit claiming functionality to user_challenge_progress table
ALTER TABLE public.user_challenge_progress 
ADD COLUMN credits_claimed boolean NOT NULL DEFAULT false,
ADD COLUMN claimed_at timestamp with time zone;

-- Backfill existing completed challenges as already claimed (for backward compatibility)
UPDATE public.user_challenge_progress 
SET credits_claimed = true, claimed_at = now() 
WHERE completed = true;

-- Create index for efficient querying of unclaimed challenges
CREATE INDEX idx_user_challenge_progress_unclaimed ON public.user_challenge_progress(user_id, completed, credits_claimed) WHERE completed = true AND credits_claimed = false;