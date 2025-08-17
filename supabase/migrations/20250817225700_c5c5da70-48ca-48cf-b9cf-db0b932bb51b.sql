-- 1) Create roles enum if not exists
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'user');
  END IF;
END $$;

-- 2) Create user_roles table (maps users to roles)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- (Optional) Keep table locked down by default; role checks will use SECURITY DEFINER function

-- 3) Fast lookup index
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);

-- 4) Create has_role() helper used in RLS and triggers
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

-- 5) Allow admins to SELECT/UPDATE any profile in addition to existing self policies
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Admins can view all profiles'
  ) THEN
    CREATE POLICY "Admins can view all profiles"
    ON public.profiles
    FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Admins can update any profile'
  ) THEN
    CREATE POLICY "Admins can update any profile"
    ON public.profiles
    FOR UPDATE
    USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- 6) Allow admins to log and view any credit transactions
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'credit_transactions' AND policyname = 'Admins can insert transactions for any user'
  ) THEN
    CREATE POLICY "Admins can insert transactions for any user"
    ON public.credit_transactions
    FOR INSERT
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'credit_transactions' AND policyname = 'Admins can view all transactions'
  ) THEN
    CREATE POLICY "Admins can view all transactions"
    ON public.credit_transactions
    FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- 7) Update enforce_profile_sensitive_fields to allow admin or service_role to change sensitive fields
CREATE OR REPLACE FUNCTION public.enforce_profile_sensitive_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$;

-- 8) Ensure trigger exists on profiles
DROP TRIGGER IF EXISTS enforce_profile_sensitive_fields_trigger ON public.profiles;
CREATE TRIGGER enforce_profile_sensitive_fields_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.enforce_profile_sensitive_fields();