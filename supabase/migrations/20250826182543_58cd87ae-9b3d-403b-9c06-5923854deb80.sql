
-- 1) Create secure server-side logging function
create or replace function public.log_security_event(
  action_name text,
  event_details jsonb,
  target_user_id uuid default null
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $fn$
declare
  actor_id uuid := auth.uid();
  headers jsonb := current_setting('request.headers', true)::jsonb;
begin
  if actor_id is null then
    raise exception 'Authentication required';
  end if;

  insert into public.audit_logs (
    user_id,
    action,
    target_id,
    details,
    ip_address,
    user_agent
  ) values (
    actor_id,
    action_name,
    target_user_id,
    event_details,
    headers->>'x-forwarded-for',
    headers->>'user-agent'
  );
end;
$fn$;

-- Make sure authenticated users can call it
grant execute on function public.log_security_event(text, jsonb, uuid) to authenticated;

-- 2) Fix calls RLS so clients can update their own rows

-- Drop existing restrictive policy that only allows service role to update
drop policy if exists "Service role can update call records" on public.calls;

-- Allow service role updates (permissive)
create policy "Service role can update call records"
on public.calls
for update
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

-- Allow users to update their own calls (permissive)
create policy "Users can update their own calls"
on public.calls
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
