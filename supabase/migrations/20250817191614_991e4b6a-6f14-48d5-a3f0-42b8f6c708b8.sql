-- Create provider health table for circuit breaker
CREATE TABLE IF NOT EXISTS public.provider_health (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text UNIQUE NOT NULL,
  state text NOT NULL DEFAULT 'closed', -- 'closed' | 'open' | 'half-open'
  open_until timestamptz,
  failure_count integer NOT NULL DEFAULT 0,
  success_count integer NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Trigger to keep updated_at fresh
CREATE OR REPLACE TRIGGER update_provider_health_updated_at
BEFORE UPDATE ON public.provider_health
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS and restrict to service role
ALTER TABLE public.provider_health ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role can manage provider_health" ON public.provider_health;
CREATE POLICY "Service role can manage provider_health"
ON public.provider_health
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Create AI analysis cache table
CREATE TABLE IF NOT EXISTS public.ai_analysis_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hash text UNIQUE NOT NULL,
  model text,
  response jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_analysis_cache_expires_at ON public.ai_analysis_cache (expires_at);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_cache_hash ON public.ai_analysis_cache (hash);

-- Enable RLS and restrict to service role
ALTER TABLE public.ai_analysis_cache ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role can manage ai_analysis_cache" ON public.ai_analysis_cache;
CREATE POLICY "Service role can manage ai_analysis_cache"
ON public.ai_analysis_cache
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');