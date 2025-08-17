-- Create tables for new features

-- Call uploads and reviews
CREATE TABLE public.call_uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  original_filename TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'audio' or 'video'
  file_size INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'uploading', -- 'uploading', 'processing', 'completed', 'failed'
  transcript TEXT,
  ai_analysis JSONB,
  confidence_score INTEGER,
  objection_handling_scores JSONB, -- {price: 85, timing: 90, trust: 75, competitor: 80}
  strengths TEXT[],
  weaknesses TEXT[],
  better_responses JSONB,
  psychological_insights TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.call_uploads ENABLE ROW LEVEL SECURITY;

-- Create policies for call_uploads
CREATE POLICY "Users can view their own call uploads" 
ON public.call_uploads 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own call uploads" 
ON public.call_uploads 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own call uploads" 
ON public.call_uploads 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Challenges table
CREATE TABLE public.challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  challenge_type TEXT NOT NULL, -- 'upload_calls', 'improve_score', 'complete_replays'
  target_value INTEGER NOT NULL,
  reward_credits INTEGER NOT NULL DEFAULT 0,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User challenge progress
CREATE TABLE public.user_challenge_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id),
  current_progress INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, challenge_id)
);

-- Enable RLS for challenges
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_challenge_progress ENABLE ROW LEVEL SECURITY;

-- Challenges are viewable by everyone
CREATE POLICY "Challenges are viewable by everyone" 
ON public.challenges 
FOR SELECT 
USING (true);

-- User challenge progress policies
CREATE POLICY "Users can view their own challenge progress" 
ON public.user_challenge_progress 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own challenge progress" 
ON public.user_challenge_progress 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own challenge progress" 
ON public.user_challenge_progress 
FOR UPDATE 
USING (auth.uid() = user_id);

-- AI Replays tracking
CREATE TABLE public.ai_replays (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  original_call_id UUID REFERENCES public.call_uploads(id),
  original_score INTEGER,
  new_score INTEGER,
  improvement INTEGER GENERATED ALWAYS AS (new_score - original_score) STORED,
  transcript TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for ai_replays
ALTER TABLE public.ai_replays ENABLE ROW LEVEL SECURITY;

-- AI Replays policies
CREATE POLICY "Users can view their own ai replays" 
ON public.ai_replays 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ai replays" 
ON public.ai_replays 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Update triggers for timestamps
CREATE TRIGGER update_call_uploads_updated_at
BEFORE UPDATE ON public.call_uploads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_challenge_progress_updated_at
BEFORE UPDATE ON public.user_challenge_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample weekly challenges
INSERT INTO public.challenges (name, description, challenge_type, target_value, reward_credits, end_date) VALUES
('Upload Master', 'Upload 3 calls this week for AI review', 'upload_calls', 3, 2, NOW() + INTERVAL '7 days'),
('Price Objection Pro', 'Improve your price objection score by 10%', 'improve_score', 10, 3, NOW() + INTERVAL '7 days'),
('Replay Champion', 'Complete 5 AI replays this week', 'complete_replays', 5, 2, NOW() + INTERVAL '7 days');

-- Add indexes for performance
CREATE INDEX idx_call_uploads_user_id ON public.call_uploads(user_id);
CREATE INDEX idx_call_uploads_status ON public.call_uploads(status);
CREATE INDEX idx_user_challenge_progress_user_id ON public.user_challenge_progress(user_id);
CREATE INDEX idx_ai_replays_user_id ON public.ai_replays(user_id);