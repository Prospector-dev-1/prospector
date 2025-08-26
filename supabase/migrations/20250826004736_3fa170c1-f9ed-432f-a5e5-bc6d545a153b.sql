-- Add audit logging for sensitive profile field changes
CREATE OR REPLACE FUNCTION public.audit_profile_sensitive_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  claims jsonb;
  role text;
  user_uuid uuid;
  changes jsonb := '{}'::jsonb;
BEGIN
  -- Safely read JWT claims
  BEGIN
    claims := current_setting('request.jwt.claims', true)::jsonb;
    role := coalesce(claims->>'role', '');
    user_uuid := NULLIF(claims->>'sub', '')::uuid;
  EXCEPTION WHEN others THEN
    role := '';
    user_uuid := NULL;
  END;

  -- Log changes to sensitive fields by admins or service role
  IF (role = 'service_role' OR (user_uuid IS NOT NULL AND public.has_role(user_uuid, 'admin'))) THEN
    IF OLD.credits IS DISTINCT FROM NEW.credits THEN
      changes := jsonb_set(changes, '{credits}', jsonb_build_object('old', OLD.credits, 'new', NEW.credits));
    END IF;
    
    IF OLD.subscription_type IS DISTINCT FROM NEW.subscription_type THEN
      changes := jsonb_set(changes, '{subscription_type}', jsonb_build_object('old', OLD.subscription_type, 'new', NEW.subscription_type));
    END IF;
    
    IF OLD.subscription_end IS DISTINCT FROM NEW.subscription_end THEN
      changes := jsonb_set(changes, '{subscription_end}', jsonb_build_object('old', OLD.subscription_end, 'new', NEW.subscription_end));
    END IF;

    -- Insert audit log if there are changes to sensitive fields
    IF changes != '{}'::jsonb THEN
      INSERT INTO public.audit_logs (
        user_id,
        action,
        target_id,
        details,
        ip_address,
        user_agent
      ) VALUES (
        COALESCE(user_uuid, '00000000-0000-0000-0000-000000000000'::uuid),
        'profile_sensitive_field_update',
        NEW.user_id,
        jsonb_build_object(
          'changes', changes,
          'actor_role', role,
          'target_user_id', NEW.user_id
        ),
        current_setting('request.headers', true)::jsonb->>'x-forwarded-for',
        current_setting('request.headers', true)::jsonb->>'user-agent'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for audit logging (runs after enforce_profile_sensitive_fields)
DROP TRIGGER IF EXISTS audit_profile_sensitive_changes_trigger ON public.profiles;
CREATE TRIGGER audit_profile_sensitive_changes_trigger
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_profile_sensitive_changes();

-- Add indexes for better performance on audit queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_target ON public.audit_logs(action, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);

-- Update existing functions to have consistent search_path security
CREATE OR REPLACE FUNCTION public.deduct_credits(user_id_param uuid, amount_param integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE profiles 
  SET credits = GREATEST(0, credits - amount_param)
  WHERE user_id = user_id_param;
  
  -- Log credit deduction
  INSERT INTO public.audit_logs (
    user_id,
    action,
    target_id,
    details
  ) VALUES (
    user_id_param,
    'credits_deducted',
    user_id_param,
    jsonb_build_object('amount', amount_param)
  );
END;
$$;

-- Create function for secure data masking
CREATE OR REPLACE FUNCTION public.mask_sensitive_data(
  input_email text DEFAULT NULL,
  input_phone text DEFAULT NULL,
  is_admin boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF is_admin THEN
    RETURN jsonb_build_object(
      'email', input_email,
      'phone', input_phone
    );
  ELSE
    RETURN jsonb_build_object(
      'email', CASE 
        WHEN input_email IS NULL THEN NULL
        ELSE regexp_replace(input_email, '(.{2}).*@', '\1***@')
      END,
      'phone', CASE 
        WHEN input_phone IS NULL THEN NULL
        ELSE regexp_replace(input_phone, '(.{3}).*(.{2})$', '\1***\2')
      END
    );
  END IF;
END;
$$;

-- Create function to clean up old sensitive data
CREATE OR REPLACE FUNCTION public.cleanup_old_sensitive_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Clean up old call uploads older than 1 year that contain transcripts
  UPDATE public.call_uploads 
  SET transcript = NULL, ai_analysis = NULL
  WHERE created_at < NOW() - INTERVAL '1 year'
    AND (transcript IS NOT NULL OR ai_analysis IS NOT NULL);
    
  -- Log cleanup action
  INSERT INTO public.audit_logs (
    user_id,
    action,
    details
  ) VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,
    'sensitive_data_cleanup',
    jsonb_build_object('cleanup_date', NOW())
  );
END;
$$;