-- Add successful_sale column to calls table
ALTER TABLE public.calls 
ADD COLUMN successful_sale boolean DEFAULT false;