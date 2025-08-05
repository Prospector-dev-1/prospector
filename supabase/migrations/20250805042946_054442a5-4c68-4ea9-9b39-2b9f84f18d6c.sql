-- Remove the overly permissive policy and create a more secure one
DROP POLICY "Service can update call records" ON public.calls;

-- Create a more secure policy that allows the service role to update calls
CREATE POLICY "Service role can update call records" 
ON public.calls 
FOR UPDATE 
USING (auth.role() = 'service_role');