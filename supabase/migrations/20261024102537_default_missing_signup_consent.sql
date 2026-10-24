-- Missing and JSON-null consent metadata must be an explicit opt-out.
-- SQL three-valued logic previously produced NULL for a missing key, which
-- violated profiles.marketing_consent NOT NULL and blocked normal signups.
-- Preserve the exact 'true' opt-in rule without casting untrusted metadata.
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  consent_value boolean;
begin
  consent_value := coalesce(
    new.raw_user_meta_data->>'marketing_consent' = 'true',
    false
  );

  insert into public.profiles (id, email, role, marketing_consent)
  values (new.id, new.email, 'user', consent_value)
  on conflict (id) do update
    set email = excluded.email,
        marketing_consent = excluded.marketing_consent,
        updated_at = now()
    where profiles.email is distinct from excluded.email
       or profiles.marketing_consent is distinct from excluded.marketing_consent;

  return new;
end;
$$;

-- This function is an Auth insert trigger, never a client-callable RPC.
revoke all on function public.handle_new_user_profile()
  from public, anon, authenticated, service_role;
