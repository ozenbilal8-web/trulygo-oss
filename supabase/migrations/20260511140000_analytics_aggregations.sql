-- Performance migration: move analytics aggregation from JavaScript (which previously
-- streamed up to 3000 click_events rows for every analytics page view) into the database.
--
-- Adds two server-side aggregations:
--   1) public.get_link_click_summary — per-link analytics dashboard payload (daily, sources,
--      channels, campaigns, recent events).
--   2) public.get_current_user_total_clicks_today — today's click count across all of the
--      current user's links, computed in Europe/Istanbul.
--
-- Both functions are security definer and re-check ownership via auth.uid() or
-- is_current_user_admin(), so RLS guarantees still hold for the underlying tables.

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
  istanbul_today_start timestamptz;
  seven_days_start timestamptz;
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
      'recent', '[]'::jsonb
    );
  end if;

  istanbul_today_start := date_trunc('day', now() at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul';
  seven_days_start := istanbul_today_start - interval '6 days';

  with day_series as (
    select generate_series(0, 6) as offset_days
  ),
  daily as (
    select
      to_char((istanbul_today_start + (offset_days - 6) * interval '1 day') at time zone 'Europe/Istanbul', 'YYYY-MM-DD') as key,
      coalesce((
        select count(*)
        from public.click_events ce
        where ce.link_request_id = p_link_request_id
          and ce.clicked_at >= (istanbul_today_start + (offset_days - 6) * interval '1 day')
          and ce.clicked_at < (istanbul_today_start + (offset_days - 5) * interval '1 day')
      ), 0) as value
    from day_series
  ),
  today_count as (
    select count(*)::bigint as value
    from public.click_events ce
    where ce.link_request_id = p_link_request_id
      and ce.clicked_at >= istanbul_today_start
  ),
  seven_day_count as (
    select count(*)::bigint as value
    from public.click_events ce
    where ce.link_request_id = p_link_request_id
      and ce.clicked_at >= seven_days_start
  ),
  source_buckets as (
    select
      coalesce(
        nullif(utm_source, ''),
        case
          when referrer is null or referrer = '' then 'Doğrudan / Bilinmiyor'
          else regexp_replace(referrer, '^https?://(www\.)?', '')
        end
      ) as label,
      count(*)::bigint as value
    from public.click_events
    where link_request_id = p_link_request_id
    group by 1
  ),
  channel_buckets as (
    select
      coalesce(
        nullif(channel_label, ''),
        case
          when channel_key = 'main' or (p_main_slug is not null and slug = p_main_slug) then 'Doğrudan / Ana link'
          when nullif(utm_source, '') is not null then utm_source
          else 'Bilinmiyor'
        end
      ) as label,
      count(*)::bigint as value
    from public.click_events
    where link_request_id = p_link_request_id
    group by 1
  ),
  campaign_buckets as (
    select
      utm_campaign as label,
      count(*)::bigint as value
    from public.click_events
    where link_request_id = p_link_request_id
      and utm_campaign is not null
      and utm_campaign <> ''
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
        'utm_term', utm_term
      ) as payload
    from public.click_events
    where link_request_id = p_link_request_id
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
    'recent', coalesce((select jsonb_agg(payload) from recent), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

revoke all on function public.get_link_click_summary(uuid, text, int, int) from public;
grant execute on function public.get_link_click_summary(uuid, text, int, int) to authenticated;

create or replace function public.get_current_user_total_clicks_today()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(count(*)::bigint, 0)
  from public.click_events ce
  join public.link_requests lr on lr.id = ce.link_request_id
  where lr.user_id = (select auth.uid())
    and ce.clicked_at >= (date_trunc('day', now() at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul');
$$;

revoke all on function public.get_current_user_total_clicks_today() from public;
grant execute on function public.get_current_user_total_clicks_today() to authenticated;
