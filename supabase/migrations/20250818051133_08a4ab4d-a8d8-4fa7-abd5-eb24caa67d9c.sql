-- Add moments analysis to call_uploads table
ALTER TABLE public.call_uploads 
ADD COLUMN call_moments jsonb DEFAULT '[]'::jsonb;

-- Add index for better performance when querying moments
CREATE INDEX idx_call_uploads_moments ON public.call_uploads USING GIN(call_moments);

-- Add trigger to update updated_at when call_moments is modified
CREATE OR REPLACE FUNCTION update_call_uploads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_call_uploads_updated_at_trigger
  BEFORE UPDATE ON public.call_uploads
  FOR EACH ROW
  EXECUTE FUNCTION update_call_uploads_updated_at();

-- Create table for storing individual replay sessions
CREATE TABLE public.moment_replays (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  call_upload_id UUID NOT NULL,
  moment_id TEXT NOT NULL,
  session_transcript TEXT,
  original_score INTEGER,
  replay_score INTEGER,
  improvement INTEGER,
  duration_seconds INTEGER,
  coaching_feedback JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on moment_replays
ALTER TABLE public.moment_replays ENABLE ROW LEVEL SECURITY;

-- RLS policies for moment_replays
CREATE POLICY "Users can view their own moment replays" 
ON public.moment_replays 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own moment replays" 
ON public.moment_replays 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own moment replays" 
ON public.moment_replays 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage moment_replays" 
ON public.moment_replays 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_moment_replays_updated_at
  BEFORE UPDATE ON public.moment_replays
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();