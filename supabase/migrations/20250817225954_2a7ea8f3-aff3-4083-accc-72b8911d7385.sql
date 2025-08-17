-- Grant admin role to the provided email
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE email = 'sales@webnixo.net'
ON CONFLICT (user_id, role) DO NOTHING;