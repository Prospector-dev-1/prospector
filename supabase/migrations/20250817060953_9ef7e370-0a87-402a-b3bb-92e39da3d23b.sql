-- Fix security warnings by setting search_path for functions
-- This addresses the function search path mutable warnings

-- Update update_daily_stats_on_call function with proper search_path
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
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public';

-- Update update_consecutive_days function with proper search_path  
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
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public';