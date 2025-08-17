-- Add new challenge types for live call integration
-- Insert enhanced challenge types that include live calls

-- Weekly Live Call Challenges (only insert if they don't already exist)
INSERT INTO public.challenges (name, description, challenge_type, target_value, reward_credits, end_date) 
SELECT * FROM (VALUES
  ('Prospect Grinder', 'Complete 5 live calls this week to build your momentum', 'live_calls', 5, 25, NOW() + INTERVAL '7 days'),
  ('Call Marathon', 'Complete 10 live calls with difficulty 5+ this week', 'difficulty_calls', 10, 50, NOW() + INTERVAL '7 days'),
  ('Rookie Closer', 'Complete 3 live calls at difficulty 1-3 this week', 'rookie_calls', 3, 15, NOW() + INTERVAL '7 days'),
  ('Pro Closer', 'Complete 3 live calls at difficulty 7-10 this week', 'pro_calls', 3, 40, NOW() + INTERVAL '7 days'),
  ('Master Closer', 'Successfully close 2 sales at difficulty 8+ this week', 'master_closes', 2, 75, NOW() + INTERVAL '7 days'),
  ('Closing Champion', 'Achieve 3 successful sales this week', 'successful_closes', 3, 35, NOW() + INTERVAL '7 days'),
  ('Objection Handler', 'Score 80+ on objection handling in 3 live calls', 'objection_expert', 3, 30, NOW() + INTERVAL '7 days'),
  ('Smooth Talker', 'Score 85+ on tone in 5 consecutive calls', 'tone_master', 5, 40, NOW() + INTERVAL '7 days'),
  ('Consistent Caller', 'Complete at least 1 call per day for 5 days', 'daily_calls', 5, 45, NOW() + INTERVAL '7 days'),
  ('Closing Streak', 'Get 3 successful sales in a row', 'closing_streak', 3, 60, NOW() + INTERVAL '7 days'),
  ('Complete Seller', 'Upload 2 calls + Complete 3 live calls + 1 AI replay', 'mixed_challenge', 6, 55, NOW() + INTERVAL '7 days'),
  ('Skills Showcase', 'Score 75+ in all categories in one live call', 'skills_showcase', 1, 35, NOW() + INTERVAL '7 days')
) AS new_challenges(name, description, challenge_type, target_value, reward_credits, end_date)
WHERE NOT EXISTS (
  SELECT 1 FROM public.challenges 
  WHERE challenges.challenge_type = new_challenges.challenge_type
);