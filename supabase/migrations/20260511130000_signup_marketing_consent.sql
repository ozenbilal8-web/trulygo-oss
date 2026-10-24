-- KVKK fix: read marketing_consent from auth.users.raw_user_meta_data on signup,
-- so the value is persisted even when email confirmation is on and the client has no session
-- to update the profiles row from the application side.

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
    nullif(new.raw_user_meta_data->>'marketing_consent', '')::boolean,
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
