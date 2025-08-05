-- Change credits column to support decimal values
ALTER TABLE public.profiles 
ALTER COLUMN credits TYPE NUMERIC(10, 2) USING credits::NUMERIC(10, 2);

-- Update default value to be numeric as well
ALTER TABLE public.profiles 
ALTER COLUMN credits SET DEFAULT 1.0;