-- Enrich click_events with privacy-preserving device + approximate location data.
--
-- Product rules respected by this migration:
--   * No raw IP address is stored. The existing privacy-preserving `visitor_key`
--     hash is untouched; this migration only adds derived, coarse signals.
--   * Location is APPROXIMATE (country / region / city level). VPN, mobile
--     carriers, iCloud Private Relay and corporate networks can make the city
--     wrong or empty, so all new columns are nullable and constraints stay soft.
--   * Old click_events rows keep NULL in every new column; the UI must treat
--     NULL as "Bilinmiyor" (handled in the app layer).

-- ============================================================================
-- 1) New nullable columns (no hard constraints — analytics input is untrusted)
-- ============================================================================

alter table public.click_events
  add column if not exists device_type text,
  add column if not exists os_name text,
  add column if not exists browser_name text,
  add column if not exists country_code text,
  add column if not exists country_name text,
  add column if not exists region text,
  add column if not exists city text,
  add column if not exists location_label text;

-- ============================================================================
-- 2) record_link_click: accept and persist the new derived fields
-- ============================================================================
-- The previous 13-argument signature is dropped and replaced with a 21-argument
-- one. Every new parameter defaults to NULL, so PostgREST callers that omit them
-- keep working. Values are still length-bounded and emptied-to-NULL inside the
-- function; no raw IP is ever accepted or stored.

drop function if exists public.record_link_click(
  uuid,
  text,
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
  text
);

create or replace function public.record_link_click(
  p_link_request_id uuid,
  p_slug text,
  p_channel_link_id uuid default null,
  p_channel_key text default null,
  p_channel_label text default null,
  p_referrer text default null,
  p_user_agent text default null,
  p_visitor_key text default null,
  p_utm_source text default null,
  p_utm_medium text default null,
  p_utm_campaign text default null,
  p_utm_content text default null,
  p_utm_term text default null,
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
security definer
set search_path = ''
as $$
begin
  insert into public.click_events (
    link_request_id,
    channel_link_id,
    slug,
    referrer,
    user_agent,
    visitor_key,
    channel_key,
    channel_label,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content,
    utm_term,
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
    link_requests.id,
    channel_links.id,
    coalesce(channel_links.slug, link_requests.requested_slug),
    nullif(left(p_referrer, 2000), ''),
    nullif(left(p_user_agent, 1000), ''),
    nullif(left(p_visitor_key, 128), ''),
    nullif(left(p_channel_key, 255), ''),
    nullif(left(p_channel_label, 255), ''),
    nullif(left(p_utm_source, 255), ''),
    nullif(left(p_utm_medium, 255), ''),
    nullif(left(p_utm_campaign, 255), ''),
    nullif(left(p_utm_content, 255), ''),
    nullif(left(p_utm_term, 255), ''),
    nullif(left(p_device_type, 32), ''),
    nullif(left(p_os_name, 64), ''),
    nullif(left(p_browser_name, 64), ''),
    nullif(left(p_country_code, 8), ''),
    nullif(left(p_country_name, 96), ''),
    nullif(left(p_region, 96), ''),
    nullif(left(p_city, 96), ''),
    nullif(left(p_location_label, 160), '')
  from public.link_requests
  left join public.channel_links
    on channel_links.id = p_channel_link_id
    and channel_links.link_request_id = link_requests.id
    and channel_links.slug = p_slug
  where link_requests.id = p_link_request_id
    and link_requests.status = 'approved'
    and (
      (
        p_channel_link_id is null
        and link_requests.requested_slug = p_slug
      )
      or (
        p_channel_link_id is not null
        and channel_links.id is not null
      )
    );
end;
$$;

revoke all on function public.record_link_click(
  uuid,
  text,
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
  text,
  text,
  text,
  text,
  text,
  text,
  text
) from public;
grant execute on function public.record_link_click(
  uuid,
  text,
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
  text,
  text,
  text,
  text,
  text,
  text,
  text
) to anon, authenticated;

-- ============================================================================
-- 3) get_link_click_summary: expose new fields on recent events + add
--    device / OS / approximate-location distribution buckets
-- ============================================================================
-- Signature is unchanged (uuid, text, int, int), so existing grants are kept.

create or replace function public.get_link_click_summary(
  p_link_request_id uuid,
  p_main_slug text default null,
  p_top_limit int default 12,
  p_recent_limit int default 20
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  is_owner boolean;
  istanbul_today date;
  seven_days_start date;
  result jsonb;
begin
  select exists (
    select 1
    from public.link_requests
    where id = p_link_request_id
      and (user_id = (select auth.uid()) or public.is_current_user_admin())
  ) into is_owner;

  if not is_owner then
    return jsonb_build_object(
      'today_clicks', 0,
      'last7_days_clicks', 0,
      'daily', '[]'::jsonb,
      'channels', '[]'::jsonb,
      'sources', '[]'::jsonb,
      'campaigns', '[]'::jsonb,
      'devices', '[]'::jsonb,
      'operating_systems', '[]'::jsonb,
      'locations', '[]'::jsonb,
      'recent', '[]'::jsonb
    );
  end if;

  istanbul_today := (now() at time zone 'Europe/Istanbul')::date;
  seven_days_start := istanbul_today - 6;

  with day_series as (
    select (seven_days_start + offset_days)::date as day
    from generate_series(0, 6) as day_offsets(offset_days)
  ),
  ranked_unique_click_events as (
    select
      ce.*,
      row_number() over (
        partition by
          ce.link_request_id,
          coalesce(ce.channel_link_id, '00000000-0000-0000-0000-000000000000'::uuid),
          ce.clicked_day,
          coalesce(ce.visitor_key, ce.id::text)
        order by ce.clicked_at asc, ce.id asc
      ) as unique_rank
    from public.click_events ce
    where ce.link_request_id = p_link_request_id
  ),
  unique_click_events as (
    select *
    from ranked_unique_click_events
    where unique_rank = 1
  ),
  daily as (
    select
      to_char(day_series.day, 'YYYY-MM-DD') as key,
      coalesce((
        select count(*)
        from unique_click_events
        where unique_click_events.clicked_day = day_series.day
      ), 0) as value
    from day_series
  ),
  today_count as (
    select count(*)::bigint as value
    from unique_click_events
    where clicked_day = istanbul_today
  ),
  seven_day_count as (
    select count(*)::bigint as value
    from unique_click_events
    where clicked_day >= seven_days_start
      and clicked_day <= istanbul_today
  ),
  source_buckets as (
    select
      coalesce(
        nullif(utm_source, ''),
        case
          when referrer is null or referrer = '' then U&'Do\011Frudan / Bilinmiyor'
          else regexp_replace(referrer, '^https?://(www\.)?', '')
        end
      ) as label,
      count(*)::bigint as value
    from unique_click_events
    group by 1
  ),
  channel_buckets as (
    select
      coalesce(
        nullif(channel_label, ''),
        case
          when channel_key = 'main' or (p_main_slug is not null and slug = p_main_slug) then U&'Do\011Frudan / Ana link'
          when nullif(utm_source, '') is not null then utm_source
          else 'Bilinmiyor'
        end
      ) as label,
      count(*)::bigint as value
    from unique_click_events
    group by 1
  ),
  campaign_buckets as (
    select
      utm_campaign as label,
      count(*)::bigint as value
    from unique_click_events
    where utm_campaign is not null
      and utm_campaign <> ''
    group by 1
  ),
  device_buckets as (
    select
      coalesce(nullif(device_type, ''), 'unknown') as label,
      count(*)::bigint as value
    from unique_click_events
    group by 1
  ),
  os_buckets as (
    select
      coalesce(nullif(os_name, ''), 'unknown') as label,
      count(*)::bigint as value
    from unique_click_events
    group by 1
  ),
  location_buckets as (
    select
      coalesce(nullif(location_label, ''), 'Bilinmiyor') as label,
      count(*)::bigint as value
    from unique_click_events
    group by 1
  ),
  recent as (
    select
      jsonb_build_object(
        'id', id,
        'link_request_id', link_request_id,
        'channel_link_id', channel_link_id,
        'slug', slug,
        'clicked_at', clicked_at,
        'referrer', referrer,
        'user_agent', user_agent,
        'channel_key', channel_key,
        'channel_label', channel_label,
        'utm_source', utm_source,
        'utm_medium', utm_medium,
        'utm_campaign', utm_campaign,
        'utm_content', utm_content,
        'utm_term', utm_term,
        'device_type', device_type,
        'os_name', os_name,
        'browser_name', browser_name,
        'country_code', country_code,
        'country_name', country_name,
        'region', region,
        'city', city,
        'location_label', location_label
      ) as payload
    from unique_click_events
    order by clicked_at desc
    limit greatest(coalesce(p_recent_limit, 20), 0)
  )
  select jsonb_build_object(
    'today_clicks', coalesce((select value from today_count), 0),
    'last7_days_clicks', coalesce((select value from seven_day_count), 0),
    'daily', coalesce((select jsonb_agg(jsonb_build_object('key', key, 'value', value) order by key) from daily), '[]'::jsonb),
    'sources', coalesce((
      select jsonb_agg(jsonb_build_object('label', label, 'value', value) order by value desc)
      from (
        select label, value from source_buckets
        order by value desc
        limit greatest(coalesce(p_top_limit, 6), 0)
      ) as top_sources
    ), '[]'::jsonb),
    'channels', coalesce((
      select jsonb_agg(jsonb_build_object('label', label, 'value', value) order by value desc)
      from (
        select label, value from channel_buckets
        order by value desc
        limit greatest(coalesce(p_top_limit, 12), 0)
      ) as top_channels
    ), '[]'::jsonb),
    'campaigns', coalesce((
      select jsonb_agg(jsonb_build_object('label', label, 'value', value) order by value desc)
      from (
        select label, value from campaign_buckets
        order by value desc
        limit greatest(coalesce(p_top_limit, 6), 0)
      ) as top_campaigns
    ), '[]'::jsonb),
    'devices', coalesce((
      select jsonb_agg(jsonb_build_object('label', label, 'value', value) order by value desc)
      from (
        select label, value from device_buckets
        order by value desc
        limit greatest(coalesce(p_top_limit, 12), 0)
      ) as top_devices
    ), '[]'::jsonb),
    'operating_systems', coalesce((
      select jsonb_agg(jsonb_build_object('label', label, 'value', value) order by value desc)
      from (
        select label, value from os_buckets
        order by value desc
        limit greatest(coalesce(p_top_limit, 12), 0)
      ) as top_os
    ), '[]'::jsonb),
    'locations', coalesce((
      select jsonb_agg(jsonb_build_object('label', label, 'value', value) order by value desc)
      from (
        select label, value from location_buckets
        order by value desc
        limit greatest(coalesce(p_top_limit, 12), 0)
      ) as top_locations
    ), '[]'::jsonb),
    'recent', coalesce((select jsonb_agg(payload) from recent), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

revoke all on function public.get_link_click_summary(uuid, text, int, int) from public;
revoke all on function public.get_link_click_summary(uuid, text, int, int) from anon;
grant execute on function public.get_link_click_summary(uuid, text, int, int) to authenticated;
