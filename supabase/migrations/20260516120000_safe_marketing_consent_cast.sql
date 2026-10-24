-- Hardening: replace the unsafe `::boolean` cast inside handle_new_user_profile.
--
-- Previous behaviour (see 20260511130000_signup_marketing_consent.sql) cast
-- raw_user_meta_data->>'marketing_consent' to boolean with `::boolean`.
-- PostgreSQL accepts a wider set of literal forms there (`true`, `yes`, `1`, ...)
-- but anything outside that set raises and would crash the auth.users insert
-- trigger, blocking sign-ups. The raw_user_meta_data column is attacker-influenced
-- (any value the client passes inside `options.data` lands here), so a non-boolean
-- value is plausible.
--
-- New behaviour: treat the value as opt-in only when it is exactly the string
-- "true". Anything else (other strings, null, missing key, JSON booleans
-- rendered as text, etc.) is treated as opt-out. No data migration is needed
-- because existing profiles.marketing_consent rows are untouched.

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  consent_value boolean;
begin
  consent_value := (
    new.raw_user_meta_data is not null
    and new.raw_user_meta_data->>'marketing_consent' = 'true'
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
