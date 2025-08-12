-- 1) Tighten RLS on subscribers: restrict INSERT/UPDATE to service_role only

-- Drop permissive policies if they exist
DROP POLICY IF EXISTS "insert_subscription" ON public.subscribers;
DROP POLICY IF EXISTS "update_own_subscription" ON public.subscribers;

-- Keep existing select policy as-is (users can view their own), or recreate more strictly if needed
-- Recreate secure policies for write operations
CREATE POLICY "Service role can insert subscribers"
ON public.subscribers
FOR INSERT
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update subscribers"
ON public.subscribers
FOR UPDATE
USING (auth.role() = 'service_role');


-- 2) Prevent non-service-role from modifying sensitive profile fields
-- Create a trigger function that blocks updates to credits/subscription fields unless JWT role is service_role
CREATE OR REPLACE FUNCTION public.enforce_profile_sensitive_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claims jsonb;
  role text;
BEGIN
  -- Safely read JWT claims; if not present, treat as non-service
  BEGIN
    claims := current_setting('request.jwt.claims', true)::jsonb;
    role := coalesce(claims->>'role', '');
  EXCEPTION WHEN others THEN
    role := '';
  END;

  -- Block unauthorized changes to sensitive fields
  IF (NEW.credits IS DISTINCT FROM OLD.credits)
     OR (NEW.subscription_type IS DISTINCT FROM OLD.subscription_type)
     OR (NEW.subscription_end IS DISTINCT FROM OLD.subscription_end) THEN
    IF role <> 'service_role' THEN
      RAISE EXCEPTION 'Modifying credits/subscription fields is not allowed for this operation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Attach the trigger to profiles
DROP TRIGGER IF EXISTS trg_enforce_profile_sensitive_fields ON public.profiles;
CREATE TRIGGER trg_enforce_profile_sensitive_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.enforce_profile_sensitive_fields();