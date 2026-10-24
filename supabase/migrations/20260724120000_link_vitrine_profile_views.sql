begin;

-- Profile views are intentionally isolated from the shared short-link
-- click_events stream. This additive, forward-only migration does not rewrite
-- existing analytics rows or the Link Vitrini item-click history.
create table public.link_vitrine_profile_views (
  id uuid primary key default gen_random_uuid(),
  vitrine_id uuid not null
    references public.link_vitrines(id)
    on delete cascade,
  visitor_hash text not null,
  viewed_at timestamptz not null default now(),
  constraint link_vitrine_profile_views_visitor_hash_check
  check (
    visitor_hash ~ '^pv1:(cookie|fallback):[A-Za-z0-9_-]{43}$'
  )
);

-- Supports the rolling 30-minute lookup for one profile + visitor pair.
create index link_vitrine_profile_views_dedupe_idx
on public.link_vitrine_profile_views (
  vitrine_id,
  visitor_hash,
  viewed_at desc
);

-- Keep the all-time owner-facing total separate from public.link_vitrines.
-- authenticated users can select published Link Vitrini rows, so putting the
-- counter on that table would expose other owners' totals.
create table public.link_vitrine_profile_view_totals (
  vitrine_id uuid primary key
    references public.link_vitrines(id)
    on delete cascade,
  profile_view_count bigint not null default 0,
  updated_at timestamptz not null default now(),
  constraint link_vitrine_profile_view_totals_nonnegative_check
  check (profile_view_count >= 0)
);

alter table public.link_vitrine_profile_views enable row level security;
alter table public.link_vitrine_profile_view_totals enable row level security;

-- Neither browser roles nor service_role receive direct table privileges.
-- The service-role-only recorder below is the sole write path, while owners
-- read only the scalar returned by the authenticated getter.
revoke all on table public.link_vitrine_profile_views
from public, anon, authenticated, service_role;

revoke all on table public.link_vitrine_profile_view_totals
from public, anon, authenticated, service_role;

create or replace function public.record_link_vitrine_profile_view(
  p_handle text,
  p_visitor_hash text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_handle text;
  normalized_visitor_hash text;
  target_vitrine_id uuid;
  recorded_at timestamptz;
begin
  normalized_handle := pg_catalog.btrim(coalesce(p_handle, ''));
  normalized_visitor_hash := pg_catalog.btrim(coalesce(p_visitor_hash, ''));
  recorded_at := pg_catalog.statement_timestamp();

  if normalized_handle !~ '^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$'
    or normalized_visitor_hash !~ '^pv1:(cookie|fallback):[A-Za-z0-9_-]{43}$'
  then
    return false;
  end if;

  -- Resolve the canonical public handle inside the trusted database function.
  -- Callers cannot choose a profile id or create views for unpublished rows.
  select link_vitrines.id
  into target_vitrine_id
  from public.link_vitrines
  where link_vitrines.handle = normalized_handle
    and link_vitrines.is_published = true;

  if target_vitrine_id is null then
    return false;
  end if;

  -- Serialize only this profile + visitor pair. A hash collision can delay an
  -- unrelated pair, but the exact pair is checked again before the insert.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      target_vitrine_id::text
        || pg_catalog.chr(31)
        || normalized_visitor_hash,
      0
    )
  );

  insert into public.link_vitrine_profile_views (
    vitrine_id,
    visitor_hash,
    viewed_at
  )
  select
    target_vitrine_id,
    normalized_visitor_hash,
    recorded_at
  where not exists (
    select 1
    from public.link_vitrine_profile_views as recent_view
    where recent_view.vitrine_id = target_vitrine_id
      and recent_view.visitor_hash = normalized_visitor_hash
      and recent_view.viewed_at > recorded_at - interval '30 minutes'
  );

  if not found then
    return false;
  end if;

  -- The event and all-time total change in the same RPC transaction. Any
  -- failure here rolls the accepted event back as well.
  insert into public.link_vitrine_profile_view_totals as totals (
    vitrine_id,
    profile_view_count,
    updated_at
  )
  values (
    target_vitrine_id,
    1,
    recorded_at
  )
  on conflict (vitrine_id)
  do update set
    profile_view_count = totals.profile_view_count + 1,
    updated_at = excluded.updated_at;

  return true;
end;
$$;

revoke all on function public.record_link_vitrine_profile_view(text, text)
from public, anon, authenticated, service_role;

grant execute on function public.record_link_vitrine_profile_view(text, text)
to service_role;

create or replace function public.get_current_user_link_vitrine_profile_view_count()
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  current_user_id uuid;
  current_profile_view_count text;
begin
  current_user_id := (select auth.uid());

  if current_user_id is null then
    raise exception 'authentication required'
      using errcode = '42501';
  end if;

  select coalesce(profile_view_totals.profile_view_count, 0)::text
  into current_profile_view_count
  from public.link_vitrines
  left join public.link_vitrine_profile_view_totals as profile_view_totals
    on profile_view_totals.vitrine_id = link_vitrines.id
  where link_vitrines.user_id = current_user_id;

  return coalesce(current_profile_view_count, '0');
end;
$$;

revoke all on function public.get_current_user_link_vitrine_profile_view_count()
from public, anon, authenticated, service_role;

grant execute on function public.get_current_user_link_vitrine_profile_view_count()
to authenticated;

commit;
