-- Sprint 1A EXPAND: add a server-attested link creation path without removing
-- the legacy authenticated INSERT path. Existing rows remain legacy/unverified.

BEGIN;

alter table public.link_requests
  add column submission_source text not null default 'legacy',
  add column safety_status text not null default 'unverified',
  add column safety_verified_at timestamptz,
  add column safety_policy_version text;

alter table public.link_requests
  add constraint link_requests_submission_source_check
  check (submission_source in ('legacy', 'trusted_server_v2')),
  add constraint link_requests_safety_status_check
  check (safety_status in ('unverified', 'clean', 'blocked', 'error')),
  add constraint link_requests_safety_verified_at_check
  check (
    (
      safety_status in ('clean', 'blocked')
      and safety_verified_at is not null
    )
    or (
      safety_status in ('unverified', 'error')
      and safety_verified_at is null
    )
  ),
  add constraint link_requests_safety_policy_version_check
  check (
    (
      submission_source = 'legacy'
      and safety_policy_version is null
    )
    or (
      submission_source = 'trusted_server_v2'
      and nullif(pg_catalog.btrim(safety_policy_version), '') is not null
      and pg_catalog.char_length(
        pg_catalog.btrim(safety_policy_version)
      ) <= 64
    )
  ),
  add constraint link_requests_legacy_safety_check
  check (
    submission_source <> 'legacy'
    or (
      safety_status = 'unverified'
      and safety_verified_at is null
      and safety_policy_version is null
    )
  ),
  add constraint link_requests_trusted_auto_approval_check
  check (
    submission_source <> 'trusted_server_v2'
    or auto_approval_blocked = (safety_status <> 'clean')
  );

-- These columns are deliberately absent from the existing authenticated
-- INSERT/UPDATE allowlists. Explicitly clear any column-level privilege that
-- might have been introduced by environment drift, without touching grants on
-- any legacy column or removing the legacy INSERT path.
revoke insert (
  submission_source,
  safety_status,
  safety_verified_at,
  safety_policy_version
) on table public.link_requests from public, anon, authenticated;

revoke update (
  submission_source,
  safety_status,
  safety_verified_at,
  safety_policy_version
) on table public.link_requests from public, anon, authenticated;

create function public.create_link_request_v2(
  p_user_id uuid,
  p_target_url text,
  p_requested_slug text,
  p_campaign_name text,
  p_note text,
  p_safety_status text,
  p_safety_verified_at timestamptz,
  p_safety_policy_version text,
  p_web_risk_status text,
  p_web_risk_threats text[],
  p_web_risk_checked_at timestamptz
)
returns table (
  id uuid,
  status text,
  auto_approval_blocked boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_target_url text;
  normalized_slug text;
  normalized_policy_version text;
  should_block_auto_approval boolean;
begin
  normalized_target_url := pg_catalog.btrim(coalesce(p_target_url, ''));
  normalized_slug := pg_catalog.btrim(coalesce(p_requested_slug, ''));
  normalized_policy_version := pg_catalog.btrim(
    coalesce(p_safety_policy_version, '')
  );

  if p_user_id is null
    or normalized_target_url = ''
    or normalized_slug = ''
    or normalized_policy_version = ''
  then
    raise exception using
      errcode = '22023',
      message = 'invalid create_link_request_v2 input';
  end if;

  if normalized_slug <> pg_catalog.lower(normalized_slug)
    or normalized_slug !~ '^[a-z0-9-]{2,80}$'
  then
    raise exception using
      errcode = '22023',
      message = 'invalid create_link_request_v2 input';
  end if;

  if p_safety_status is null
    or p_web_risk_status is null
    or p_safety_status not in ('unverified', 'clean', 'blocked', 'error')
    or p_web_risk_status not in ('clean', 'flagged', 'error', 'skipped')
    or p_web_risk_checked_at is null
  then
    raise exception using
      errcode = '22023',
      message = 'invalid create_link_request_v2 safety input';
  end if;

  if p_safety_status = 'clean' then
    if p_safety_verified_at is null
      or p_web_risk_status <> 'clean'
      or p_safety_verified_at is distinct from p_web_risk_checked_at
      or coalesce(pg_catalog.array_length(p_web_risk_threats, 1), 0) <> 0
    then
      raise exception using
        errcode = '22023',
        message = 'invalid create_link_request_v2 safety input';
    end if;
  elsif p_safety_status = 'blocked' then
    if p_safety_verified_at is null
      or p_web_risk_status <> 'flagged'
      or p_safety_verified_at is distinct from p_web_risk_checked_at
      or coalesce(pg_catalog.array_length(p_web_risk_threats, 1), 0) = 0
    then
      raise exception using
        errcode = '22023',
        message = 'invalid create_link_request_v2 safety input';
    end if;
  elsif p_safety_status = 'error' then
    if p_safety_verified_at is not null
      or p_web_risk_status <> 'error'
      or coalesce(pg_catalog.array_length(p_web_risk_threats, 1), 0) <> 0
    then
      raise exception using
        errcode = '22023',
        message = 'invalid create_link_request_v2 safety input';
    end if;
  elsif p_safety_verified_at is not null
    or p_web_risk_status <> 'skipped'
    or coalesce(pg_catalog.array_length(p_web_risk_threats, 1), 0) <> 0
  then
    raise exception using
      errcode = '22023',
      message = 'invalid create_link_request_v2 safety input';
  end if;

  should_block_auto_approval := p_safety_status <> 'clean';

  return query
  insert into public.link_requests as created_request (
    user_id,
    target_url,
    requested_slug,
    campaign_name,
    note,
    status,
    admin_note,
    reviewed_by,
    reviewed_at,
    auto_approval_blocked,
    web_risk_status,
    web_risk_threats,
    web_risk_checked_at,
    submission_source,
    safety_status,
    safety_verified_at,
    safety_policy_version
  )
  values (
    p_user_id,
    normalized_target_url,
    normalized_slug,
    nullif(pg_catalog.btrim(coalesce(p_campaign_name, '')), ''),
    nullif(pg_catalog.btrim(coalesce(p_note, '')), ''),
    'pending',
    null,
    null,
    null,
    should_block_auto_approval,
    p_web_risk_status,
    coalesce(p_web_risk_threats, array[]::text[]),
    p_web_risk_checked_at,
    'trusted_server_v2',
    p_safety_status,
    p_safety_verified_at,
    normalized_policy_version
  )
  returning
    created_request.id,
    created_request.status,
    created_request.auto_approval_blocked;
end;
$$;

revoke all on function public.create_link_request_v2(
  uuid,
  text,
  text,
  text,
  text,
  text,
  timestamptz,
  text,
  text,
  text[],
  timestamptz
) from public, anon, authenticated;

grant execute on function public.create_link_request_v2(
  uuid,
  text,
  text,
  text,
  text,
  text,
  timestamptz,
  text,
  text,
  text[],
  timestamptz
) to service_role;

-- The legacy approval RPC remains unchanged. The Edge Function calls this V2
-- function only when REQUIRE_LINK_SAFETY_ATTESTATION is enabled, giving the
-- final UPDATE an atomic attestation guard without breaking legacy rollout.
create function public.auto_approve_link_request_v2(
  request_id uuid,
  reviewer_id uuid
)
returns table (
  id uuid,
  status text,
  reviewed_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if request_id is null or reviewer_id is null then
    raise exception using
      errcode = '22023',
      message = 'invalid auto_approve_link_request_v2 input';
  end if;

  return query
  update public.link_requests as link_request
  set
    status = 'approved',
    reviewed_by = reviewer_id,
    reviewed_at = pg_catalog.now(),
    admin_note = null
  where link_request.id = request_id
    and link_request.status = 'pending'
    and link_request.submission_source = 'trusted_server_v2'
    and link_request.safety_status = 'clean'
    and link_request.safety_verified_at is not null
    and nullif(
      pg_catalog.btrim(link_request.safety_policy_version),
      ''
    ) is not null
    and link_request.auto_approval_blocked = false
  returning
    link_request.id,
    link_request.status,
    link_request.reviewed_at;
end;
$$;

revoke all on function public.auto_approve_link_request_v2(uuid, uuid)
from public, anon, authenticated;

grant execute on function public.auto_approve_link_request_v2(uuid, uuid)
to service_role;

COMMIT;
