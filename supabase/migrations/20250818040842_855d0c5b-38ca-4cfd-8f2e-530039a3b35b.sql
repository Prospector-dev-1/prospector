-- Add fallback indicator to call_uploads table
ALTER TABLE public.call_uploads 
ADD COLUMN fallback_used boolean DEFAULT false;