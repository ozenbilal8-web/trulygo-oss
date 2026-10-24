-- Global redirect slugs must not depend on which rows an API caller can see.
-- Keep the existing namespace: active main requests and ALL channel rows.
begin;

lock table public.link_requests, public.channel_links in share row exclusive mode;

do $$
begin
  if exists (
    select 1
    from public.link_requests as main
    join public.channel_links as channel
      on pg_catalog.lower(channel.slug) = pg_catalog.lower(main.requested_slug)
    where main.requested_slug is not null
      and main.status in ('pending', 'approved')
  ) then
    raise exception 'existing main/channel slug collision requires operator resolution';
  end if;
end;
$$;

create or replace function public.lock_link_slug_namespace(p_old_slug text, p_new_slug text)
returns void
language plpgsql
volatile
set search_path = ''
as $$
declare
  namespace_key bigint;
begin
  -- Each query in a VOLATILE function gets a fresh READ COMMITTED snapshot.
  -- A transaction-wide snapshot could miss a writer that committed while this
  -- transaction waited for its lock, so refuse that unsupported write mode.
  if pg_catalog.current_setting('transaction_isolation') <> 'read committed' then
    raise exception 'link slug writes require READ COMMITTED isolation'
      using errcode = 'feature_not_supported';
  end if;

  -- Sorting the actual lock keys also handles rare hash collisions. Lock both
  -- old and new names before renames; all writers use the same namespace.
  for namespace_key in
    select distinct pg_catalog.hashtextextended(
      'trulygo:link-slug:' || pg_catalog.lower(candidate.slug), 0
    ) as lock_value
    from pg_catalog.unnest(array[p_old_slug, p_new_slug]) as candidate(slug)
    where candidate.slug is not null
    order by lock_value
  loop
    perform pg_catalog.pg_advisory_xact_lock(namespace_key);
  end loop;
end;
$$;

create or replace function public.enforce_channel_link_parent()
returns trigger
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  parent_user_id uuid;
  parent_status text;
  old_slug text;
begin
  if tg_op = 'UPDATE' then
    old_slug := old.slug;
  end if;
  perform public.lock_link_slug_namespace(old_slug, new.slug);

  -- Do not expose another account's parent status through a trigger error.
  -- Service-role operations remain possible; ordinary inserts are also
  -- constrained by the unchanged owner-only RLS insert policy.
  if auth.role() = 'authenticated' and new.user_id is distinct from auth.uid() then
    raise exception 'channel link parent unavailable' using errcode = 'insufficient_privilege';
  end if;

  select main.user_id, main.status
  into parent_user_id, parent_status
  from public.link_requests as main
  where main.id = new.link_request_id and main.user_id = new.user_id;

  if parent_user_id is null then
    raise exception 'channel link parent unavailable' using errcode = 'foreign_key_violation';
  end if;
  if parent_status <> 'approved' then
    raise exception 'channel links require an approved parent link' using errcode = 'check_violation';
  end if;

  -- This query runs AFTER lock acquisition with a refreshed snapshot and the
  -- function owner's privileges, including rows hidden by caller RLS.
  if exists (
    select 1
    from public.link_requests as main
    where main.requested_slug is not null
      and pg_catalog.lower(main.requested_slug) = pg_catalog.lower(new.slug)
      and main.status in ('pending', 'approved')
  ) then
    raise exception 'requested slug is unavailable' using errcode = 'unique_violation';
  end if;
  return new;
end;
$$;

create or replace function public.prevent_link_request_channel_slug_conflict()
returns trigger
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  old_slug text;
begin
  if tg_op = 'UPDATE' then
    old_slug := old.requested_slug;
  end if;
  perform public.lock_link_slug_namespace(old_slug, new.requested_slug);

  if new.requested_slug is not null
    and new.status in ('pending', 'approved')
    and exists (
      select 1 from public.channel_links as channel
      where pg_catalog.lower(channel.slug) = pg_catalog.lower(new.requested_slug)
    )
  then
    raise exception 'requested slug is unavailable' using errcode = 'unique_violation';
  end if;
  return new;
end;
$$;

-- These are trigger internals, never public API RPCs. Trigger execution still
-- works after revocation; PostgreSQL checks EXECUTE when a trigger is created.
revoke all on function public.lock_link_slug_namespace(text, text) from public, anon, authenticated, service_role;
revoke all on function public.enforce_channel_link_parent() from public, anon, authenticated, service_role;
revoke all on function public.prevent_link_request_channel_slug_conflict() from public, anon, authenticated, service_role;

-- Table-level REVOKE does not remove historical column grants. Public routes
-- use resolve_public_link_redirect; authenticated owner/admin grants stay.
revoke select on table public.link_requests, public.channel_links from public, anon;
revoke select (id, requested_slug, target_url, campaign_name, status)
  on table public.link_requests from public, anon;
revoke select (id, link_request_id, slug, channel_key, channel_label,
  utm_source, utm_medium, utm_campaign, utm_content, is_custom, created_at, updated_at)
  on table public.channel_links from public, anon;

do $$
begin
  if pg_catalog.has_any_column_privilege('anon', 'public.link_requests', 'SELECT')
    or pg_catalog.has_any_column_privilege('anon', 'public.channel_links', 'SELECT')
  then
    raise exception 'anonymous raw link column access must be revoked';
  end if;
end;
$$;

commit;
