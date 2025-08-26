-- Normalize function search_path across all security-sensitive functions
CREATE OR REPLACE FUNCTION public.update_call_replays_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_call_uploads_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name'
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.check_email_exists(email_to_check text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE email = email_to_check
  );
$$;

CREATE OR REPLACE FUNCTION public.enforce_profile_sensitive_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  claims jsonb;
  role text;
  user_uuid uuid;
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

  -- Block unauthorized changes to sensitive fields
  IF (NEW.credits IS DISTINCT FROM OLD.credits)
     OR (NEW.subscription_type IS DISTINCT FROM OLD.subscription_type)
     OR (NEW.subscription_end IS DISTINCT FROM OLD.subscription_end) THEN
    IF NOT (
      role = 'service_role'
      OR (user_uuid IS NOT NULL AND public.has_role(user_uuid, 'admin'))
    ) THEN
      RAISE EXCEPTION 'Modifying credits/subscription fields is not allowed for this operation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;