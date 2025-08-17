-- Update reward for the "Master Closer" challenge to 10 credits
-- This assumes the challenge exists either by name or by type key

-- Ensure the column can store 10.0 (previously set to numeric(3,1) in earlier migration)
-- If not already numeric with at least one decimal, this will be a no-op on most setups
ALTER TABLE public.challenges
  ALTER COLUMN reward_credits TYPE numeric(4,1);

-- Update by exact name match (case-insensitive)
UPDATE public.challenges
SET reward_credits = 10.0
WHERE lower(name) = 'master closer';

-- Also update by challenge_type as a safeguard if naming differs
UPDATE public.challenges
SET reward_credits = 10.0
WHERE challenge_type = 'master_closes';