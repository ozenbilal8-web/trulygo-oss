-- Callers of this SECURITY DEFINER function select the bucket and limit.
-- Public execution would let a client consume another user's or an admin's
-- quota. Only trusted server code may select and mutate these counters.
revoke all on function public.check_rate_limit(text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, text, integer, integer)
  to service_role;

-- Fail the migration if inherited grants unexpectedly leave the RPC exposed.
do $$
begin
  if pg_catalog.has_function_privilege('anon',
    'public.check_rate_limit(text,text,integer,integer)', 'execute')
    or pg_catalog.has_function_privilege('authenticated',
    'public.check_rate_limit(text,text,integer,integer)', 'execute') then
    raise exception 'Rate-limit RPC must not be executable by public clients';
  end if;
  if not pg_catalog.has_function_privilege('service_role',
    'public.check_rate_limit(text,text,integer,integer)', 'execute') then
    raise exception 'Rate-limit RPC must be executable by the trusted server';
  end if;
end;
$$;
