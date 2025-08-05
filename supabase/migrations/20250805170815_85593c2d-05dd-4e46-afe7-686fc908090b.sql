-- Add unique constraint to profiles email to prevent duplicates
ALTER TABLE public.profiles ADD CONSTRAINT unique_email UNIQUE (email);