begin;

-- Manual contract rollback for
-- post_deploy/20260724121000_remove_link_vitrine_item_click_runtime.sql.
-- The contract migration deliberately preserves click_events, its Link Vitrini
-- columns, constraints, indexes and historical rows, so the previous app
-- contract can be restored without rewriting production data.
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
from public, anon, authenticated, service_role;

grant execute on function public.get_link_vitrine_item_click_totals(uuid)
to authenticated;

commit;
