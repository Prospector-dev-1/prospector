-- Update reward_credits to support decimal values (0.5-3.0)
ALTER TABLE public.challenges 
ALTER COLUMN reward_credits TYPE numeric(3,1);

-- Update existing challenges with proper credit rewards based on difficulty
-- Easy challenges: 0.5-1.0 credits
UPDATE public.challenges 
SET reward_credits = 0.5 
WHERE target_value <= 3;

UPDATE public.challenges 
SET reward_credits = 1.0 
WHERE target_value > 3 AND target_value <= 5;

-- Hard challenges: 1.5-3.0 credits  
UPDATE public.challenges 
SET reward_credits = 1.5 
WHERE target_value > 5 AND target_value <= 10;

UPDATE public.challenges 
SET reward_credits = 2.0 
WHERE target_value > 10 AND target_value <= 15;

UPDATE public.challenges 
SET reward_credits = 3.0 
WHERE target_value > 15;