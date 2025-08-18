-- Create AI prospect interaction history table
CREATE TABLE public.ai_prospect_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  prospect_personality TEXT NOT NULL,
  interaction_summary TEXT,
  personality_state JSONB NOT NULL DEFAULT '{"current": "initial", "transitions": []}',
  user_strengths JSONB DEFAULT '[]',
  user_weaknesses JSONB DEFAULT '[]',
  successful_responses TEXT[],
  failed_responses TEXT[],
  objection_types_encountered TEXT[],
  conversation_context JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create AI prospect personality profiles table
CREATE TABLE public.ai_prospect_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  base_personality TEXT NOT NULL,
  personality_traits JSONB NOT NULL DEFAULT '{}',
  objection_patterns JSONB NOT NULL DEFAULT '[]',
  buying_signals JSONB NOT NULL DEFAULT '[]',
  conversation_style JSONB NOT NULL DEFAULT '{}',
  difficulty_level INTEGER NOT NULL DEFAULT 1,
  industry_context TEXT,
  avatar_config JSONB DEFAULT '{}',
  created_by UUID,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create conversation analytics table
CREATE TABLE public.conversation_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_id TEXT NOT NULL,
  conversation_flow JSONB NOT NULL DEFAULT '[]',
  objection_handling_patterns JSONB DEFAULT '{}',
  personality_transitions JSONB DEFAULT '[]',
  buying_signal_responses JSONB DEFAULT '{}',
  performance_metrics JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.ai_prospect_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_prospect_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_analytics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for ai_prospect_interactions
CREATE POLICY "Users can view their own AI prospect interactions" 
ON public.ai_prospect_interactions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own AI prospect interactions" 
ON public.ai_prospect_interactions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI prospect interactions" 
ON public.ai_prospect_interactions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all AI prospect interactions" 
ON public.ai_prospect_interactions 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create RLS policies for ai_prospect_profiles
CREATE POLICY "Users can view public AI prospect profiles" 
ON public.ai_prospect_profiles 
FOR SELECT 
USING (is_public = true OR created_by = auth.uid());

CREATE POLICY "Users can create their own AI prospect profiles" 
ON public.ai_prospect_profiles 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own AI prospect profiles" 
ON public.ai_prospect_profiles 
FOR UPDATE 
USING (auth.uid() = created_by);

CREATE POLICY "Admins can manage all AI prospect profiles" 
ON public.ai_prospect_profiles 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create RLS policies for conversation_analytics
CREATE POLICY "Users can view their own conversation analytics" 
ON public.conversation_analytics 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversation analytics" 
ON public.conversation_analytics 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all conversation analytics" 
ON public.conversation_analytics 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for better performance
CREATE INDEX idx_ai_prospect_interactions_user_id ON public.ai_prospect_interactions(user_id);
CREATE INDEX idx_ai_prospect_interactions_personality ON public.ai_prospect_interactions(prospect_personality);
CREATE INDEX idx_ai_prospect_profiles_personality ON public.ai_prospect_profiles(base_personality);
CREATE INDEX idx_ai_prospect_profiles_public ON public.ai_prospect_profiles(is_public);
CREATE INDEX idx_conversation_analytics_user_session ON public.conversation_analytics(user_id, session_id);

-- Create trigger for updating timestamps
CREATE TRIGGER update_ai_prospect_interactions_updated_at
  BEFORE UPDATE ON public.ai_prospect_interactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_prospect_profiles_updated_at
  BEFORE UPDATE ON public.ai_prospect_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some default AI prospect profiles
INSERT INTO public.ai_prospect_profiles (name, base_personality, personality_traits, objection_patterns, buying_signals, conversation_style, difficulty_level, industry_context, is_public) VALUES 
('The Skeptical CFO', 'skeptical', 
  '{"trust_level": "low", "decision_speed": "slow", "price_sensitivity": "high", "data_driven": true}',
  '[{"type": "budget", "intensity": "high", "triggers": ["price", "cost", "expensive"]}, {"type": "authority", "intensity": "medium", "triggers": ["decision", "approval", "boss"]}]',
  '[{"signal": "asking_for_references", "probability": 0.7}, {"signal": "detailed_questions", "probability": 0.8}]',
  '{"formality": "high", "directness": "medium", "technical_depth": "high"}',
  3, 'finance', true),

('The Eager Startup Founder', 'enthusiastic', 
  '{"trust_level": "medium", "decision_speed": "fast", "price_sensitivity": "medium", "innovation_focused": true}',
  '[{"type": "timing", "intensity": "medium", "triggers": ["too_busy", "later", "next_quarter"]}, {"type": "features", "intensity": "low", "triggers": ["missing_feature", "integration"]}]',
  '[{"signal": "implementation_questions", "probability": 0.9}, {"signal": "timeline_inquiry", "probability": 0.8}]',
  '{"formality": "low", "directness": "high", "technical_depth": "medium"}',
  2, 'technology', true),

('The Cautious Enterprise Manager', 'professional', 
  '{"trust_level": "medium", "decision_speed": "slow", "price_sensitivity": "low", "process_oriented": true}',
  '[{"type": "security", "intensity": "high", "triggers": ["security", "compliance", "data"]}, {"type": "process", "intensity": "medium", "triggers": ["approval", "process", "policy"]}]',
  '[{"signal": "compliance_questions", "probability": 0.9}, {"signal": "pilot_program_interest", "probability": 0.6}]',
  '{"formality": "high", "directness": "low", "technical_depth": "high"}',
  4, 'enterprise', true);