-- Create function to deduct credits safely
CREATE OR REPLACE FUNCTION public.deduct_credits(user_id_param UUID, amount_param INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles 
  SET credits = GREATEST(0, credits - amount_param)
  WHERE user_id = user_id_param;
END;
$$;