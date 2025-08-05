-- Add 100 credits to the user account
UPDATE public.profiles 
SET credits = credits + 100 
WHERE user_id = '6b5388f7-bd0a-483a-8d73-48d8cd07da0c';

-- Log the credit transaction
INSERT INTO public.credit_transactions (user_id, amount, type, description)
VALUES (
  '6b5388f7-bd0a-483a-8d73-48d8cd07da0c',
  100,
  'addition',
  'Manual credit addition - 100 credits added'
);