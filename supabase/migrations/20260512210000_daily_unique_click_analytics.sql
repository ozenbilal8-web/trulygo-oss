alter table public.click_events
add column if not exists visitor_key text,
add column if not exists clicked_day date;

update public.click_events
set clicked_day = (clicked_at at time zone 'Europe/Istanbul')::date
where clicked_day is null;

alter table public.click_events
alter column clicked_day set default ((now() at time zone 'Europe/Istanbul')::date);

alter table public.click_events
alter column clicked_day set not null;

create index if not exists click_events_daily_unique_lookup_idx
on public.click_events (
  link_request_id,
  clicked_day,
  channel_link_id,
  visitor_key,
  clicked_at desc
);

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
  p_utm_term text default null
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
    utm_term
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
    nullif(left(p_utm_term, 255), '')
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
  text
) to anon, authenticated;

create or replace function public.get_link_request_click_summaries(
  p_link_request_ids uuid[]
)
returns table (
  link_request_id uuid,
  total_clicks bigint,
  last_clicked_at timestamptz,
  top_referrer text
)
language sql
stable
security definer
set search_path = ''
as $$
  with allowed_link_requests as (
    select link_requests.id
    from public.link_requests
    where link_requests.id = any(p_link_request_ids)
      and (
        link_requests.user_id = (select auth.uid())
        or public.is_current_user_admin()
      )
  ),
  ranked_unique_click_events as (
    select
      click_events.*,
      row_number() over (
        partition by
          click_events.link_request_id,
          coalesce(click_events.channel_link_id, '00000000-0000-0000-0000-000000000000'::uuid),
          click_events.clicked_day,
          coalesce(click_events.visitor_key, click_events.id::text)
        order by click_events.clicked_at asc, click_events.id asc
      ) as unique_rank
    from public.click_events
    join allowed_link_requests
      on allowed_link_requests.id = click_events.link_request_id
  ),
  unique_click_events as (
    select *
    from ranked_unique_click_events
    where unique_rank = 1
  ),
  click_totals as (
    select
      unique_click_events.link_request_id,
      count(*)::bigint as total_clicks,
      max(unique_click_events.clicked_at) as last_clicked_at
    from unique_click_events
    group by unique_click_events.link_request_id
  ),
  ranked_referrers as (
    select
      referrer_counts.link_request_id,
      referrer_counts.referrer,
      row_number() over (
        partition by referrer_counts.link_request_id
        order by referrer_counts.event_count desc, referrer_counts.last_clicked_at desc
      ) as rank
    from (
      select
        unique_click_events.link_request_id,
        unique_click_events.referrer,
        count(*) as event_count,
        max(unique_click_events.clicked_at) as last_clicked_at
      from unique_click_events
      where unique_click_events.referrer is not null
        and unique_click_events.referrer <> ''
      group by unique_click_events.link_request_id, unique_click_events.referrer
    ) as referrer_counts
  )
  select
    allowed_link_requests.id as link_request_id,
    coalesce(click_totals.total_clicks, 0) as total_clicks,
    click_totals.last_clicked_at,
    ranked_referrers.referrer as top_referrer
  from allowed_link_requests
  left join click_totals
    on click_totals.link_request_id = allowed_link_requests.id
  left join ranked_referrers
    on ranked_referrers.link_request_id = allowed_link_requests.id
    and ranked_referrers.rank = 1;
$$;

revoke all on function public.get_link_request_click_summaries(uuid[]) from public;
grant execute on function public.get_link_request_click_summaries(uuid[]) to authenticated;

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
  with ranked_unique_click_events as (
    select
      ce.id,
      row_number() over (
        partition by
          ce.link_request_id,
          coalesce(ce.channel_link_id, '00000000-0000-0000-0000-000000000000'::uuid),
          ce.clicked_day,
          coalesce(ce.visitor_key, ce.id::text)
        order by ce.clicked_at asc, ce.id asc
      ) as unique_rank
    from public.click_events ce
    join public.link_requests lr
      on lr.id = ce.link_request_id
    where lr.user_id = (select auth.uid())
      and ce.clicked_day = ((now() at time zone 'Europe/Istanbul')::date)
  )
  select coalesce(count(*)::bigint, 0)
  from ranked_unique_click_events
  where unique_rank = 1;
$$;

revoke all on function public.get_current_user_total_clicks_today() from public;
grant execute on function public.get_current_user_total_clicks_today() to authenticated;
