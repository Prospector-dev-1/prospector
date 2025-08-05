-- Add missing UPDATE policy for calls table to allow the edge function to update call records
CREATE POLICY "Service can update call records" 
ON public.calls 
FOR UPDATE 
USING (true);