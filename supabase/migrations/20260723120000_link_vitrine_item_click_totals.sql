begin;

-- Link Vitrini clicks use the existing click event stream. A click event belongs
-- to exactly one subject: either an approved short-link request or a Vitrin item.
alter table public.click_events
alter column link_request_id drop not null;

alter table public.click_events
add column if not exists link_vitrine_item_id uuid;

alter table public.click_events
drop constraint if exists click_events_link_vitrine_item_id_fkey;

alter table public.click_events
add constraint click_events_link_vitrine_item_id_fkey
foreign key (link_vitrine_item_id)
references public.link_vitrine_items(id)
on delete cascade;

alter table public.click_events
drop constraint if exists click_events_single_subject_check;

alter table public.click_events
add constraint click_events_single_subject_check
check (
  (
    link_request_id is not null
    and link_vitrine_item_id is null
  )
  or
  (
    link_request_id is null
    and link_vitrine_item_id is not null
  )
);

create index if not exists click_events_link_vitrine_item_id_clicked_at_idx
on public.click_events (link_vitrine_item_id, clicked_at desc)
where link_vitrine_item_id is not null;

-- Vitrin click dedupe reuses the existing server-generated visitor_key. Keep
-- short-link rows untouched while making the privacy contract explicit for the
-- new subject type: a Vitrin event must carry the versioned irreversible token
-- and must never persist a raw user-agent value.
alter table public.click_events
drop constraint if exists click_events_vitrine_visitor_privacy_check;

alter table public.click_events
add constraint click_events_vitrine_visitor_privacy_check
check (
  link_vitrine_item_id is null
  or (
    user_agent is null
    and visitor_key is not null
    and visitor_key ~ '^v1:(cookie|fallback):[A-Za-z0-9_-]{43}$'
  )
);

create index if not exists click_events_vitrine_item_visitor_clicked_at_idx
on public.click_events (
  link_vitrine_item_id,
  visitor_key,
  clicked_at desc
)
where link_vitrine_item_id is not null
  and visitor_key is not null;

-- Item reconciliation runs as the caller so the existing table grants and RLS
-- policies remain authoritative. Locking the owned parent serializes concurrent
-- editor saves; all item mutations then succeed or fail in one transaction.
create or replace function public.sync_owned_link_vitrine_items(
  p_vitrine_id uuid,
  p_items jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  item_count integer;
begin
  if p_items is null or pg_catalog.jsonb_typeof(p_items) <> 'array' then
    raise exception 'p_items must be a JSON array'
      using errcode = '22023';
  end if;

  item_count := pg_catalog.jsonb_array_length(p_items);

  if item_count > 100 then
    raise exception 'p_items exceeds the maximum item count'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from pg_catalog.jsonb_array_elements(p_items) as elements(item)
    where pg_catalog.jsonb_typeof(elements.item) <> 'object'
  ) then
    raise exception 'every p_items element must be a JSON object'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from pg_catalog.jsonb_array_elements(p_items) as elements(item)
    where elements.item ? 'id'
      and pg_catalog.jsonb_typeof(elements.item -> 'id') <> 'null'
      and coalesce(elements.item ->> 'id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ) then
    raise exception 'item id must be a canonical UUID or null'
      using errcode = '22023';
  end if;

  perform 1
  from public.link_vitrines
  where link_vitrines.id = p_vitrine_id
    and link_vitrines.user_id = (select auth.uid())
  for update;

  if not found then
    raise exception 'link vitrine is not owned by the current user'
      using errcode = '42501';
  end if;

  if exists (
    select submitted.id
    from pg_catalog.jsonb_to_recordset(p_items) as submitted(id uuid)
    where submitted.id is not null
    group by submitted.id
    having count(*) > 1
  ) then
    raise exception 'duplicate item id'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from pg_catalog.jsonb_to_recordset(p_items) as submitted(id uuid)
    where submitted.id is not null
      and not exists (
        select 1
        from public.link_vitrine_items
        where link_vitrine_items.id = submitted.id
          and link_vitrine_items.vitrine_id = p_vitrine_id
      )
  ) then
    raise exception 'item id does not belong to the owned link vitrine'
      using errcode = '42501';
  end if;

  update public.link_vitrine_items as existing_item
  set
    platform = submitted.platform,
    label = submitted.label,
    url = submitted.url,
    is_active = submitted.is_active,
    sort_order = submitted.sort_order,
    is_sponsored = submitted.is_sponsored,
    sponsored_label = submitted.sponsored_label,
    animation_enabled = submitted.animation_enabled,
    animation_type = submitted.animation_type
  from pg_catalog.jsonb_to_recordset(p_items) as submitted(
    id uuid,
    platform text,
    label text,
    url text,
    is_active boolean,
    sort_order integer,
    is_sponsored boolean,
    sponsored_label text,
    animation_enabled boolean,
    animation_type text
  )
  where submitted.id = existing_item.id
    and existing_item.vitrine_id = p_vitrine_id;

  delete from public.link_vitrine_items as removed_item
  where removed_item.vitrine_id = p_vitrine_id
    and not exists (
      select 1
      from pg_catalog.jsonb_to_recordset(p_items) as submitted(id uuid)
      where submitted.id = removed_item.id
    );

  insert into public.link_vitrine_items (
    vitrine_id,
    platform,
    label,
    url,
    is_active,
    sort_order,
    is_sponsored,
    sponsored_label,
    animation_enabled,
    animation_type
  )
  select
    p_vitrine_id,
    submitted.platform,
    submitted.label,
    submitted.url,
    submitted.is_active,
    submitted.sort_order,
    submitted.is_sponsored,
    submitted.sponsored_label,
    submitted.animation_enabled,
    submitted.animation_type
  from pg_catalog.jsonb_to_recordset(p_items) as submitted(
    id uuid,
    platform text,
    label text,
    url text,
    is_active boolean,
    sort_order integer,
    is_sponsored boolean,
    sponsored_label text,
    animation_enabled boolean,
    animation_type text
  )
  where submitted.id is null;
end;
$$;

revoke all on function public.sync_owned_link_vitrine_items(uuid, jsonb)
from public, anon, authenticated;
grant execute on function public.sync_owned_link_vitrine_items(uuid, jsonb)
to authenticated;

-- Remove the unpublished Sprint 1 draft overload, which accepted raw
-- user-agent input and had public-role grants.
drop function if exists public.record_link_vitrine_item_click(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text
);

create or replace function public.record_link_vitrine_item_click(
  p_link_vitrine_item_id uuid,
  p_handle text,
  p_visitor_key text,
  p_referrer text default null,
  p_device_type text default null,
  p_os_name text default null,
  p_browser_name text default null,
  p_country_code text default null,
  p_country_name text default null,
  p_region text default null,
  p_city text default null,
  p_location_label text default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  normalized_handle text;
  normalized_visitor_key text;
  recorded_at timestamptz;
begin
  normalized_handle := pg_catalog.btrim(coalesce(p_handle, ''));
  normalized_visitor_key := nullif(
    pg_catalog.btrim(coalesce(p_visitor_key, '')),
    ''
  );
  recorded_at := pg_catalog.statement_timestamp();

  if p_link_vitrine_item_id is null
    or normalized_handle !~ '^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$'
    or normalized_visitor_key is null
    or normalized_visitor_key !~ '^v1:(cookie|fallback):[A-Za-z0-9_-]{43}$'
  then
    return;
  end if;

  -- Serialize only this item + visitor pair for the duration of the RPC
  -- transaction. Hash collisions can delay an unrelated pair but cannot cause
  -- a false dedupe because the exact values are checked again below.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      p_link_vitrine_item_id::text
        || pg_catalog.chr(31)
        || normalized_visitor_key,
      0
    )
  );

  insert into public.click_events (
    link_request_id,
    link_vitrine_item_id,
    slug,
    clicked_at,
    referrer,
    visitor_key,
    device_type,
    os_name,
    browser_name,
    country_code,
    country_name,
    region,
    city,
    location_label
  )
  select
    null::uuid,
    link_vitrine_items.id,
    'v/' || link_vitrines.handle || '/click/' || link_vitrine_items.id::text,
    recorded_at,
    nullif(pg_catalog.left(p_referrer, 2000), ''),
    normalized_visitor_key,
    nullif(pg_catalog.left(p_device_type, 32), ''),
    nullif(pg_catalog.left(p_os_name, 64), ''),
    nullif(pg_catalog.left(p_browser_name, 64), ''),
    nullif(pg_catalog.left(p_country_code, 8), ''),
    nullif(pg_catalog.left(p_country_name, 96), ''),
    nullif(pg_catalog.left(p_region, 96), ''),
    nullif(pg_catalog.left(p_city, 96), ''),
    nullif(pg_catalog.left(p_location_label, 160), '')
  from public.link_vitrine_items
  join public.link_vitrines
    on link_vitrines.id = link_vitrine_items.vitrine_id
  where link_vitrine_items.id = p_link_vitrine_item_id
    and link_vitrine_items.is_active = true
    and link_vitrine_items.url is not null
    and link_vitrines.is_published = true
    and link_vitrines.handle = normalized_handle
    and not exists (
      select 1
      from public.click_events as recent_click
      where recent_click.link_vitrine_item_id = link_vitrine_items.id
        and recent_click.visitor_key = normalized_visitor_key
        and recent_click.clicked_at > recorded_at - interval '60 seconds'
    );
end;
$$;

revoke all on function public.record_link_vitrine_item_click(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) from public, anon, authenticated, service_role;
grant execute on function public.record_link_vitrine_item_click(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) to service_role;

create or replace function public.get_link_vitrine_item_click_totals(
  p_vitrine_id uuid
)
returns table (
  link_vitrine_item_id uuid,
  total_clicks text
)
language sql
stable
security definer
set search_path = ''
as $$
  with allowed_items as (
    select link_vitrine_items.id
    from public.link_vitrine_items
    join public.link_vitrines
      on link_vitrines.id = link_vitrine_items.vitrine_id
    where link_vitrines.id = p_vitrine_id
      and link_vitrines.user_id = (select auth.uid())
  )
  select
    allowed_items.id as link_vitrine_item_id,
    count(click_events.id)::text as total_clicks
  from allowed_items
  left join public.click_events
    on click_events.link_vitrine_item_id = allowed_items.id
  group by allowed_items.id;
$$;

revoke all on function public.get_link_vitrine_item_click_totals(uuid)
from public, anon, authenticated;
grant execute on function public.get_link_vitrine_item_click_totals(uuid)
to authenticated;

-- The owner UI promises an all-time raw total. Preserve Vitrin item events when
-- the existing operator-only short-link retention helper is invoked. This keeps
-- the existing click_events stream as the single source of truth, at the cost
-- of unbounded Vitrin event growth until a future archive/rollup policy exists.
create or replace function public.cleanup_click_events_older_than(p_days integer)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  effective_days integer;
  cutoff timestamptz;
  removed bigint;
begin
  effective_days := greatest(coalesce(p_days, 180), 30);
  cutoff := pg_catalog.now() - pg_catalog.make_interval(days => effective_days);

  delete from public.click_events
  where click_events.clicked_at < cutoff
    and click_events.link_vitrine_item_id is null;

  get diagnostics removed = row_count;
  return removed;
end;
$$;

revoke all on function public.cleanup_click_events_older_than(integer)
from public, anon, authenticated;
grant execute on function public.cleanup_click_events_older_than(integer)
to service_role;

commit;
