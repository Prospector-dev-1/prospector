-- Allow users to view basic profile information of other users for leaderboard
CREATE POLICY "Allow viewing basic profile info for leaderboard" 
ON public.profiles 
FOR SELECT 
USING (true);