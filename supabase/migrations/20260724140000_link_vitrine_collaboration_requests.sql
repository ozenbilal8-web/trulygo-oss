begin;

create table public.link_vitrine_collaboration_settings (
  vitrine_id uuid primary key
    references public.link_vitrines(id)
    on delete cascade,
  requests_enabled boolean not null default false,
  notification_email text not null,
  notification_email_verified_at timestamptz,
  verification_requested_at timestamptz,
  verification_expires_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint link_vitrine_collaboration_settings_email_check
  check (
    notification_email = lower(btrim(notification_email))
    and char_length(notification_email) between 3 and 254
    and notification_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    and notification_email !~ E'[\r\n]'
  ),
  constraint link_vitrine_collaboration_settings_verification_window_check
  check (
    (verification_requested_at is null and verification_expires_at is null)
    or (
      verification_requested_at is not null
      and verification_expires_at is not null
      and verification_expires_at > verification_requested_at
      and verification_expires_at <= verification_requested_at + interval '60 minutes'
    )
  )
);

create table public.link_vitrine_collaboration_email_verifications (
  id uuid primary key default gen_random_uuid(),
  vitrine_id uuid not null
    references public.link_vitrine_collaboration_settings(vitrine_id)
    on delete cascade,
  email text not null,
  token_hash text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  constraint link_vitrine_collaboration_email_verifications_email_check
  check (
    email = lower(btrim(email))
    and char_length(email) between 3 and 254
    and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    and email !~ E'[\r\n]'
  ),
  constraint link_vitrine_collaboration_email_verifications_token_hash_check
  check (token_hash ~ '^cr1:verify:[A-Za-z0-9_-]{43}$'),
  constraint link_vitrine_collaboration_email_verifications_expiry_check
  check (expires_at > created_at and expires_at <= created_at + interval '60 minutes'),
  constraint link_vitrine_collaboration_email_verifications_consumed_check
  check (consumed_at is null or consumed_at >= created_at)
);

create unique index link_vitrine_collaboration_email_verifications_token_key
on public.link_vitrine_collaboration_email_verifications (token_hash);

create unique index link_vitrine_collaboration_email_verifications_one_active_idx
on public.link_vitrine_collaboration_email_verifications (vitrine_id)
where consumed_at is null;

create index link_vitrine_collaboration_email_verifications_expiry_idx
on public.link_vitrine_collaboration_email_verifications (expires_at)
where consumed_at is null;

create table public.link_vitrine_collaboration_requests (
  id uuid primary key default gen_random_uuid(),
  vitrine_id uuid not null
    references public.link_vitrines(id)
    on delete cascade,
  sender_name text not null,
  sender_email text not null,
  sender_phone text,
  request_type text not null,
  budget_amount numeric(14, 2),
  budget_currency text,
  subject text not null,
  message text not null,
  status text not null default 'new',
  visitor_hash text not null,
  payload_hash text not null,
  notification_status text not null default 'pending',
  notification_provider_id text,
  notification_attempted_at timestamptz,
  notification_error_code text,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint link_vitrine_collaboration_requests_sender_name_check
  check (
    char_length(btrim(sender_name)) between 1 and 100
    and sender_name !~ E'[\r\n]'
  ),
  constraint link_vitrine_collaboration_requests_sender_email_check
  check (
    sender_email = lower(btrim(sender_email))
    and char_length(sender_email) between 3 and 254
    and sender_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    and sender_email !~ E'[\r\n]'
  ),
  constraint link_vitrine_collaboration_requests_sender_phone_check
  check (
    sender_phone is null
    or (
      char_length(btrim(sender_phone)) between 1 and 30
      and sender_phone !~ E'[\r\n]'
    )
  ),
  constraint link_vitrine_collaboration_requests_type_check
  check (
    request_type in (
      'collaboration',
      'advertising',
      'sponsorship',
      'product',
      'event',
      'other'
    )
  ),
  constraint link_vitrine_collaboration_requests_budget_check
  check (
    (budget_amount is null and budget_currency is null)
    or (
      budget_amount is not null
      and budget_amount >= 0
      and budget_currency is not null
      and budget_currency in ('TRY', 'USD', 'EUR')
    )
  ),
  constraint link_vitrine_collaboration_requests_subject_check
  check (
    char_length(btrim(subject)) between 1 and 150
    and subject !~ E'[\r\n]'
  ),
  constraint link_vitrine_collaboration_requests_message_check
  check (char_length(btrim(message)) between 20 and 3000),
  constraint link_vitrine_collaboration_requests_status_check
  check (status in ('new', 'read', 'replied')),
  constraint link_vitrine_collaboration_requests_visitor_hash_check
  check (visitor_hash ~ '^cr1:visitor:[A-Za-z0-9_-]{43}$'),
  constraint link_vitrine_collaboration_requests_payload_hash_check
  check (payload_hash ~ '^cr1:payload:[A-Za-z0-9_-]{43}$'),
  constraint link_vitrine_collaboration_requests_notification_status_check
  check (notification_status in ('pending', 'sent', 'failed')),
  constraint link_vitrine_collaboration_requests_notification_provider_id_check
  check (
    notification_provider_id is null
    or char_length(notification_provider_id) between 1 and 255
  ),
  constraint link_vitrine_collaboration_requests_notification_error_code_check
  check (
    notification_error_code is null
    or notification_error_code ~ '^[a-z0-9_]{1,64}$'
  ),
  constraint link_vitrine_collaboration_requests_notification_result_check
  check (
    (notification_status = 'pending'
      and notification_provider_id is null
      and notification_attempted_at is null
      and notification_error_code is null)
    or (notification_status = 'sent'
      and notification_provider_id is not null
      and notification_attempted_at is not null
      and notification_error_code is null)
    or (notification_status = 'failed'
      and notification_provider_id is null
      and notification_attempted_at is not null
      and notification_error_code is not null)
  )
);

create index link_vitrine_collaboration_requests_owner_list_idx
on public.link_vitrine_collaboration_requests (vitrine_id, created_at desc);

create index link_vitrine_collaboration_requests_payload_dedupe_idx
on public.link_vitrine_collaboration_requests (
  vitrine_id,
  payload_hash,
  created_at desc
);

create or replace function public.set_link_vitrine_collaboration_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = statement_timestamp();
  return new;
end;
$$;

create trigger set_link_vitrine_collaboration_settings_updated_at
before update on public.link_vitrine_collaboration_settings
for each row
execute function public.set_link_vitrine_collaboration_updated_at();

create trigger set_link_vitrine_collaboration_requests_updated_at
before update on public.link_vitrine_collaboration_requests
for each row
execute function public.set_link_vitrine_collaboration_updated_at();

create or replace function public.invalidate_link_vitrine_collaboration_email_verification()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.notification_email := lower(btrim(new.notification_email));

  if tg_op = 'INSERT' then
    new.notification_email_verified_at := null;
    new.verification_requested_at := null;
    new.verification_expires_at := null;
  elsif new.notification_email is distinct from old.notification_email then
    update public.link_vitrine_collaboration_email_verifications
    set consumed_at = statement_timestamp()
    where vitrine_id = old.vitrine_id
      and consumed_at is null;

    new.notification_email_verified_at := null;
    new.verification_requested_at := null;
    new.verification_expires_at := null;
  end if;

  return new;
end;
$$;

create trigger invalidate_link_vitrine_collaboration_email_verification
before insert or update of notification_email
on public.link_vitrine_collaboration_settings
for each row
execute function public.invalidate_link_vitrine_collaboration_email_verification();

alter table public.link_vitrine_collaboration_settings enable row level security;
alter table public.link_vitrine_collaboration_email_verifications enable row level security;
alter table public.link_vitrine_collaboration_requests enable row level security;

revoke all on table public.link_vitrine_collaboration_settings
from public, anon, authenticated, service_role;
revoke all on table public.link_vitrine_collaboration_email_verifications
from public, anon, authenticated, service_role;
revoke all on table public.link_vitrine_collaboration_requests
from public, anon, authenticated, service_role;

create or replace function public.save_current_user_link_vitrine_collaboration_settings(
  p_vitrine_id uuid,
  p_notification_email text,
  p_requests_enabled boolean
)
returns table (
  vitrine_id uuid,
  requests_enabled boolean,
  notification_email text,
  notification_email_verified_at timestamptz,
  verification_requested_at timestamptz,
  verification_expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  normalized_email text := lower(btrim(coalesce(p_notification_email, '')));
begin
  if current_user_id is null
    or char_length(normalized_email) not between 3 and 254
    or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or normalized_email ~ E'[\r\n]'
    or not exists (
      select 1
      from public.link_vitrines
      where link_vitrines.id = p_vitrine_id
        and link_vitrines.user_id = current_user_id
    )
  then
    return;
  end if;

  insert into public.link_vitrine_collaboration_settings (
    vitrine_id,
    requests_enabled,
    notification_email
  )
  values (
    p_vitrine_id,
    coalesce(p_requests_enabled, false),
    normalized_email
  )
  on conflict on constraint link_vitrine_collaboration_settings_pkey do update
  set
    requests_enabled = excluded.requests_enabled,
    notification_email = excluded.notification_email;

  return query
  select
    settings.vitrine_id,
    settings.requests_enabled,
    settings.notification_email,
    settings.notification_email_verified_at,
    settings.verification_requested_at,
    settings.verification_expires_at
  from public.link_vitrine_collaboration_settings as settings
  where settings.vitrine_id = p_vitrine_id;
end;
$$;

create or replace function public.get_current_user_link_vitrine_collaboration_settings()
returns table (
  vitrine_id uuid,
  requests_enabled boolean,
  notification_email text,
  notification_email_verified_at timestamptz,
  verification_requested_at timestamptz,
  verification_expires_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    settings.vitrine_id,
    settings.requests_enabled,
    settings.notification_email,
    settings.notification_email_verified_at,
    settings.verification_requested_at,
    settings.verification_expires_at
  from public.link_vitrine_collaboration_settings as settings
  join public.link_vitrines
    on link_vitrines.id = settings.vitrine_id
  where link_vitrines.user_id = (select auth.uid())
  limit 1;
$$;

create or replace function public.get_current_user_link_vitrine_collaboration_request_summaries(
  p_limit integer default 50
)
returns table (
  request_id uuid,
  sender_name text,
  request_type text,
  budget_amount text,
  budget_currency text,
  subject text,
  message_preview text,
  status text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    requests.id,
    requests.sender_name,
    requests.request_type,
    requests.budget_amount::text,
    requests.budget_currency,
    requests.subject,
    left(requests.message, 180),
    requests.status,
    requests.created_at
  from public.link_vitrine_collaboration_requests as requests
  join public.link_vitrines
    on link_vitrines.id = requests.vitrine_id
  where link_vitrines.user_id = (select auth.uid())
  order by requests.created_at desc
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
$$;

create or replace function public.get_current_user_link_vitrine_collaboration_request_detail(
  p_request_id uuid
)
returns table (
  request_id uuid,
  sender_name text,
  sender_email text,
  sender_phone text,
  request_type text,
  budget_amount text,
  budget_currency text,
  subject text,
  message text,
  status text,
  notification_status text,
  notification_attempted_at timestamptz,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    requests.id,
    requests.sender_name,
    requests.sender_email,
    requests.sender_phone,
    requests.request_type,
    requests.budget_amount::text,
    requests.budget_currency,
    requests.subject,
    requests.message,
    requests.status,
    requests.notification_status,
    requests.notification_attempted_at,
    requests.created_at
  from public.link_vitrine_collaboration_requests as requests
  join public.link_vitrines
    on link_vitrines.id = requests.vitrine_id
  where requests.id = p_request_id
    and link_vitrines.user_id = (select auth.uid())
  limit 1;
$$;

create or replace function public.update_current_user_link_vitrine_collaboration_request_status(
  p_request_id uuid,
  p_expected_status text,
  p_new_status text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed_request_id uuid;
begin
  if (select auth.uid()) is null
    or p_expected_status not in ('new', 'read', 'replied')
    or p_new_status not in ('new', 'read', 'replied')
  then
    return false;
  end if;

  update public.link_vitrine_collaboration_requests as requests
  set status = p_new_status
  where requests.id = p_request_id
    and requests.status = p_expected_status
    and exists (
      select 1
      from public.link_vitrines
      where link_vitrines.id = requests.vitrine_id
        and link_vitrines.user_id = (select auth.uid())
    )
  returning requests.id into changed_request_id;

  return changed_request_id is not null;
end;
$$;

create or replace function public.get_public_link_vitrine_collaboration_availability(
  p_handle text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.link_vitrines
    join public.link_vitrine_collaboration_settings as settings
      on settings.vitrine_id = link_vitrines.id
    where link_vitrines.handle = lower(btrim(coalesce(p_handle, '')))
      and link_vitrines.handle ~ '^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$'
      and link_vitrines.is_published = true
      and settings.requests_enabled = true
      and settings.notification_email_verified_at is not null
  );
$$;

create or replace function public.prepare_link_vitrine_collaboration_email_verification(
  p_vitrine_id uuid,
  p_owner_user_id uuid,
  p_email text,
  p_token_hash text,
  p_expires_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_email text := lower(btrim(coalesce(p_email, '')));
  current_email text;
begin
  if p_token_hash !~ '^cr1:verify:[A-Za-z0-9_-]{43}$'
    or p_expires_at <= statement_timestamp()
    or p_expires_at > statement_timestamp() + interval '60 minutes'
  then
    return false;
  end if;

  select settings.notification_email
  into current_email
  from public.link_vitrine_collaboration_settings as settings
  join public.link_vitrines
    on link_vitrines.id = settings.vitrine_id
  where settings.vitrine_id = p_vitrine_id
    and link_vitrines.user_id = p_owner_user_id
  for update of settings;

  if current_email is null or current_email <> normalized_email then
    return false;
  end if;

  update public.link_vitrine_collaboration_email_verifications
  set consumed_at = statement_timestamp()
  where vitrine_id = p_vitrine_id
    and consumed_at is null;

  insert into public.link_vitrine_collaboration_email_verifications (
    vitrine_id,
    email,
    token_hash,
    expires_at
  )
  values (
    p_vitrine_id,
    normalized_email,
    p_token_hash,
    p_expires_at
  );

  update public.link_vitrine_collaboration_settings
  set
    verification_requested_at = statement_timestamp(),
    verification_expires_at = p_expires_at
  where vitrine_id = p_vitrine_id;

  return true;
end;
$$;

create or replace function public.revoke_link_vitrine_collaboration_email_verification(
  p_token_hash text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate_vitrine_id uuid;
  locked_vitrine_id uuid;
  affected_vitrine_id uuid;
begin
  select verifications.vitrine_id
  into candidate_vitrine_id
  from public.link_vitrine_collaboration_email_verifications as verifications
  where verifications.token_hash = p_token_hash
    and verifications.consumed_at is null;

  if candidate_vitrine_id is null then
    return false;
  end if;

  select settings.vitrine_id
  into locked_vitrine_id
  from public.link_vitrine_collaboration_settings as settings
  where settings.vitrine_id = candidate_vitrine_id
  for update;

  if locked_vitrine_id is null then
    return false;
  end if;

  update public.link_vitrine_collaboration_email_verifications
  set consumed_at = statement_timestamp()
  where token_hash = p_token_hash
    and consumed_at is null
  returning vitrine_id into affected_vitrine_id;

  if affected_vitrine_id is null then
    return false;
  end if;

  update public.link_vitrine_collaboration_settings
  set
    verification_requested_at = null,
    verification_expires_at = null
  where vitrine_id = affected_vitrine_id;

  return true;
end;
$$;

create or replace function public.consume_link_vitrine_collaboration_email_verification(
  p_token_hash text
)
returns table (
  verified boolean,
  profile_handle text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate_vitrine_id uuid;
  locked_vitrine_id uuid;
  token_row public.link_vitrine_collaboration_email_verifications%rowtype;
  verified_handle text;
begin
  select verifications.vitrine_id
  into candidate_vitrine_id
  from public.link_vitrine_collaboration_email_verifications as verifications
  where verifications.token_hash = p_token_hash
    and verifications.consumed_at is null
    and verifications.expires_at > statement_timestamp();

  if candidate_vitrine_id is null then
    return query select false, null::text;
    return;
  end if;

  select settings.vitrine_id
  into locked_vitrine_id
  from public.link_vitrine_collaboration_settings as settings
  where settings.vitrine_id = candidate_vitrine_id
  for update;

  if locked_vitrine_id is null then
    return query select false, null::text;
    return;
  end if;

  select verifications.*
  into token_row
  from public.link_vitrine_collaboration_email_verifications as verifications
  where verifications.token_hash = p_token_hash
    and verifications.consumed_at is null
    and verifications.expires_at > statement_timestamp()
  for update;

  if token_row.id is null then
    return query select false, null::text;
    return;
  end if;

  update public.link_vitrine_collaboration_email_verifications
  set consumed_at = statement_timestamp()
  where id = token_row.id
    and consumed_at is null;

  update public.link_vitrine_collaboration_settings as settings
  set
    notification_email_verified_at = statement_timestamp(),
    verification_requested_at = null,
    verification_expires_at = null
  from public.link_vitrines
  where settings.vitrine_id = token_row.vitrine_id
    and settings.notification_email = token_row.email
    and link_vitrines.id = settings.vitrine_id
  returning link_vitrines.handle into verified_handle;

  if verified_handle is null then
    return query select false, null::text;
    return;
  end if;

  return query select true, verified_handle;
end;
$$;

create or replace function public.create_link_vitrine_collaboration_request(
  p_handle text,
  p_sender_name text,
  p_sender_email text,
  p_sender_phone text,
  p_request_type text,
  p_budget_amount text,
  p_budget_currency text,
  p_subject text,
  p_message text,
  p_visitor_hash text,
  p_payload_hash text
)
returns table (
  request_id uuid,
  request_created boolean,
  recipient_email text,
  profile_display_name text,
  profile_handle text,
  request_created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_handle text := lower(btrim(coalesce(p_handle, '')));
  normalized_email text := lower(btrim(coalesce(p_sender_email, '')));
  resolved_vitrine_id uuid;
  resolved_display_name text;
  resolved_recipient_email text;
  existing_request_id uuid;
  existing_created_at timestamptz;
  inserted_request_id uuid;
  inserted_created_at timestamptz;
begin
  if normalized_handle !~ '^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$'
    or char_length(btrim(coalesce(p_sender_name, ''))) not between 1 and 100
    or p_sender_name ~ E'[\r\n]'
    or char_length(normalized_email) not between 3 and 254
    or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or normalized_email ~ E'[\r\n]'
    or (p_sender_phone is not null and char_length(btrim(p_sender_phone)) not between 1 and 30)
    or p_request_type not in ('collaboration', 'advertising', 'sponsorship', 'product', 'event', 'other')
    or char_length(btrim(coalesce(p_subject, ''))) not between 1 and 150
    or p_subject ~ E'[\r\n]'
    or char_length(btrim(coalesce(p_message, ''))) not between 20 and 3000
    or p_visitor_hash !~ '^cr1:visitor:[A-Za-z0-9_-]{43}$'
    or p_payload_hash !~ '^cr1:payload:[A-Za-z0-9_-]{43}$'
    or (
      p_budget_amount is null
      and p_budget_currency is not null
    )
    or (
      p_budget_amount is not null
      and (
        p_budget_amount !~ '^(0|[1-9][0-9]{0,11})(\.[0-9]{1,2})?$'
        or p_budget_currency is null
        or p_budget_currency not in ('TRY', 'USD', 'EUR')
      )
    )
  then
    return;
  end if;

  select
    link_vitrines.id,
    link_vitrines.display_name,
    settings.notification_email
  into
    resolved_vitrine_id,
    resolved_display_name,
    resolved_recipient_email
  from public.link_vitrines
  join public.link_vitrine_collaboration_settings as settings
    on settings.vitrine_id = link_vitrines.id
  where link_vitrines.handle = normalized_handle
    and link_vitrines.is_published = true
    and settings.requests_enabled = true
    and settings.notification_email_verified_at is not null
  limit 1;

  if resolved_vitrine_id is null then
    return;
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(resolved_vitrine_id::text || ':' || p_payload_hash, 0)
  );

  select requests.id, requests.created_at
  into existing_request_id, existing_created_at
  from public.link_vitrine_collaboration_requests as requests
  where requests.vitrine_id = resolved_vitrine_id
    and requests.payload_hash = p_payload_hash
    and requests.created_at >= statement_timestamp() - interval '10 minutes'
  order by requests.created_at desc
  limit 1;

  if existing_request_id is not null then
    return query
    select
      existing_request_id,
      false,
      resolved_recipient_email,
      resolved_display_name,
      normalized_handle,
      existing_created_at;
    return;
  end if;

  insert into public.link_vitrine_collaboration_requests (
    vitrine_id,
    sender_name,
    sender_email,
    sender_phone,
    request_type,
    budget_amount,
    budget_currency,
    subject,
    message,
    visitor_hash,
    payload_hash
  )
  values (
    resolved_vitrine_id,
    btrim(p_sender_name),
    normalized_email,
    nullif(btrim(coalesce(p_sender_phone, '')), ''),
    p_request_type,
    p_budget_amount::numeric(14, 2),
    p_budget_currency,
    btrim(p_subject),
    btrim(p_message),
    p_visitor_hash,
    p_payload_hash
  )
  returning id, created_at into inserted_request_id, inserted_created_at;

  return query
  select
    inserted_request_id,
    true,
    resolved_recipient_email,
    resolved_display_name,
    normalized_handle,
    inserted_created_at;
end;
$$;

create or replace function public.update_link_vitrine_collaboration_notification(
  p_request_id uuid,
  p_notification_status text,
  p_provider_id text,
  p_error_code text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed_request_id uuid;
begin
  if p_notification_status is null
    or p_notification_status not in ('sent', 'failed')
    or (
      p_notification_status = 'sent'
      and (
        p_provider_id is null
        or char_length(p_provider_id) not between 1 and 255
        or p_error_code is not null
      )
    )
    or (
      p_notification_status = 'failed'
      and (
        p_provider_id is not null
        or p_error_code is null
        or p_error_code !~ '^[a-z0-9_]{1,64}$'
      )
    )
  then
    return false;
  end if;

  update public.link_vitrine_collaboration_requests
  set
    notification_status = p_notification_status,
    notification_provider_id = p_provider_id,
    notification_attempted_at = statement_timestamp(),
    notification_error_code = p_error_code
  where id = p_request_id
    and notification_status = 'pending'
  returning id into changed_request_id;

  return changed_request_id is not null;
end;
$$;

revoke all on function public.set_link_vitrine_collaboration_updated_at()
from public, anon, authenticated, service_role;
revoke all on function public.invalidate_link_vitrine_collaboration_email_verification()
from public, anon, authenticated, service_role;
revoke all on function public.save_current_user_link_vitrine_collaboration_settings(uuid, text, boolean)
from public, anon, authenticated, service_role;
revoke all on function public.get_current_user_link_vitrine_collaboration_settings()
from public, anon, authenticated, service_role;
revoke all on function public.get_current_user_link_vitrine_collaboration_request_summaries(integer)
from public, anon, authenticated, service_role;
revoke all on function public.get_current_user_link_vitrine_collaboration_request_detail(uuid)
from public, anon, authenticated, service_role;
revoke all on function public.update_current_user_link_vitrine_collaboration_request_status(uuid, text, text)
from public, anon, authenticated, service_role;
revoke all on function public.get_public_link_vitrine_collaboration_availability(text)
from public, anon, authenticated, service_role;
revoke all on function public.prepare_link_vitrine_collaboration_email_verification(uuid, uuid, text, text, timestamptz)
from public, anon, authenticated, service_role;
revoke all on function public.revoke_link_vitrine_collaboration_email_verification(text)
from public, anon, authenticated, service_role;
revoke all on function public.consume_link_vitrine_collaboration_email_verification(text)
from public, anon, authenticated, service_role;
revoke all on function public.create_link_vitrine_collaboration_request(text, text, text, text, text, text, text, text, text, text, text)
from public, anon, authenticated, service_role;
revoke all on function public.update_link_vitrine_collaboration_notification(uuid, text, text, text)
from public, anon, authenticated, service_role;

grant execute on function public.save_current_user_link_vitrine_collaboration_settings(uuid, text, boolean)
to authenticated;
grant execute on function public.get_current_user_link_vitrine_collaboration_settings()
to authenticated;
grant execute on function public.get_current_user_link_vitrine_collaboration_request_summaries(integer)
to authenticated;
grant execute on function public.get_current_user_link_vitrine_collaboration_request_detail(uuid)
to authenticated;
grant execute on function public.update_current_user_link_vitrine_collaboration_request_status(uuid, text, text)
to authenticated;

grant execute on function public.get_public_link_vitrine_collaboration_availability(text)
to anon, authenticated;

grant execute on function public.prepare_link_vitrine_collaboration_email_verification(uuid, uuid, text, text, timestamptz)
to service_role;
grant execute on function public.revoke_link_vitrine_collaboration_email_verification(text)
to service_role;
grant execute on function public.consume_link_vitrine_collaboration_email_verification(text)
to service_role;
grant execute on function public.create_link_vitrine_collaboration_request(text, text, text, text, text, text, text, text, text, text, text)
to service_role;
grant execute on function public.update_link_vitrine_collaboration_notification(uuid, text, text, text)
to service_role;

commit;
