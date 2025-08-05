-- Add overall_pitch_score column to calls table
ALTER TABLE public.calls 
ADD COLUMN overall_pitch_score integer;