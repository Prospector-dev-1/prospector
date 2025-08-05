-- Add 1000 credits to the specific user account yaacovmc@gmail.com
UPDATE public.profiles 
SET credits = credits + 1000 
WHERE email = 'yaacovmc@gmail.com';