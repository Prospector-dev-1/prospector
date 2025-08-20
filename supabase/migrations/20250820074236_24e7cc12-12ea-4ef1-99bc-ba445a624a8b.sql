-- Create storage bucket for call recordings and replays
INSERT INTO storage.buckets (id, name, public) VALUES ('call-recordings', 'call-recordings', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('call-replays', 'call-replays', false);

-- Create call_replays table to store enhanced replay data
CREATE TABLE public.call_replays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES public.calls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  original_audio_url TEXT,
  synthesized_audio_url TEXT,
  do_over_audio_url TEXT,
  per_utterance_timestamps JSONB DEFAULT '[]'::jsonb,
  do_over_transcript JSONB,
  ai_improvements JSONB DEFAULT '{}'::jsonb,
  replay_settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on call_replays
ALTER TABLE public.call_replays ENABLE ROW LEVEL SECURITY;

-- Create policies for call_replays
CREATE POLICY "Users can view their own call replays" 
ON public.call_replays 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own call replays" 
ON public.call_replays 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own call replays" 
ON public.call_replays 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all call replays" 
ON public.call_replays 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create storage policies for call recordings
CREATE POLICY "Users can upload their own call recordings" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'call-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own call recordings" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'call-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own call recordings" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'call-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create storage policies for call replays
CREATE POLICY "Users can upload their own call replays" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'call-replays' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own call replays" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'call-replays' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own call replays" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'call-replays' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add transcript_with_timestamps column to calls table for better replay support
ALTER TABLE public.calls ADD COLUMN IF NOT EXISTS transcript_with_timestamps JSONB DEFAULT '[]'::jsonb;

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_call_replays_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_call_replays_updated_at
BEFORE UPDATE ON public.call_replays
FOR EACH ROW
EXECUTE FUNCTION public.update_call_replays_updated_at();