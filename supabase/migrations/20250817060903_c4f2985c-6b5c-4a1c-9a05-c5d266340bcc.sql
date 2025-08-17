-- Add new challenge types for live call integration
-- Insert enhanced challenge types that include live calls

-- Weekly Live Call Challenges
INSERT INTO public.challenges (name, description, challenge_type, target_value, reward_credits, end_date) VALUES
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
('Skills Showcase', 'Score 75+ in all categories in one live call', 'skills_showcase', 1, 35, NOW() + INTERVAL '7 days');

-- Add table to track daily call streaks and performance
CREATE TABLE IF NOT EXISTS public.user_daily_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  calls_completed INTEGER DEFAULT 0,
  successful_closes INTEGER DEFAULT 0,
  highest_score INTEGER DEFAULT 0,
  consecutive_days INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Enable RLS on user_daily_stats
ALTER TABLE public.user_daily_stats ENABLE ROW LEVEL SECURITY;

-- Create policies for user_daily_stats
CREATE POLICY "Users can view their own daily stats" 
ON public.user_daily_stats 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own daily stats" 
ON public.user_daily_stats 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily stats" 
ON public.user_daily_stats 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates on user_daily_stats
CREATE TRIGGER update_user_daily_stats_updated_at
BEFORE UPDATE ON public.user_daily_stats
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update daily stats when a call is completed
CREATE OR REPLACE FUNCTION public.update_daily_stats_on_call()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process completed calls
  IF NEW.call_status = 'completed' AND OLD.call_status != 'completed' THEN
    INSERT INTO public.user_daily_stats (user_id, date, calls_completed, successful_closes, highest_score)
    VALUES (
      NEW.user_id,
      CURRENT_DATE,
      1,
      CASE WHEN NEW.successful_sale THEN 1 ELSE 0 END,
      COALESCE(NEW.overall_score::integer, 0)
    )
    ON CONFLICT (user_id, date) 
    DO UPDATE SET
      calls_completed = user_daily_stats.calls_completed + 1,
      successful_closes = user_daily_stats.successful_closes + CASE WHEN NEW.successful_sale THEN 1 ELSE 0 END,
      highest_score = GREATEST(user_daily_stats.highest_score, COALESCE(NEW.overall_score::integer, 0)),
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on calls table
CREATE TRIGGER update_daily_stats_trigger
AFTER UPDATE ON public.calls
FOR EACH ROW
EXECUTE FUNCTION public.update_daily_stats_on_call();

-- Function to calculate consecutive days streak
CREATE OR REPLACE FUNCTION public.update_consecutive_days()
RETURNS void AS $$
BEGIN
  UPDATE public.user_daily_stats SET consecutive_days = (
    SELECT COUNT(*)
    FROM public.user_daily_stats s2
    WHERE s2.user_id = user_daily_stats.user_id
      AND s2.date <= user_daily_stats.date
      AND s2.date > user_daily_stats.date - INTERVAL '30 days'
      AND s2.calls_completed > 0
      AND NOT EXISTS (
        SELECT 1 FROM public.user_daily_stats s3
        WHERE s3.user_id = s2.user_id
          AND s3.date = s2.date + INTERVAL '1 day'
          AND s3.date <= user_daily_stats.date
          AND s3.calls_completed = 0
      )
  );
END;
$$ LANGUAGE plpgsql;