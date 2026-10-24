create table if not exists public.click_events (
  id uuid primary key default gen_random_uuid(),
  link_request_id uuid not null references public.link_requests(id) on delete cascade,
  slug text not null,
  clicked_at timestamptz not null default now(),
  referrer text,
  user_agent text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text
);

-- TODO: If abuse prevention later needs IP-derived signals, store only privacy-preserving hashes or aggregates. Do not store raw IP addresses.

create index if not exists click_events_link_request_id_clicked_at_idx
on public.click_events (link_request_id, clicked_at desc);

create index if not exists click_events_slug_clicked_at_idx
on public.click_events (slug, clicked_at desc);

alter table public.click_events enable row level security;

grant select (id, requested_slug, target_url, status)
on table public.link_requests to anon;

drop policy if exists click_events_select_own_link_events on public.click_events;

create policy click_events_select_own_link_events
on public.click_events
for select
to authenticated
using (
  exists (
    select 1
    from public.link_requests
    where link_requests.id = click_events.link_request_id
      and link_requests.user_id = (select auth.uid())
  )
);

drop policy if exists click_events_select_admin_events on public.click_events;

create policy click_events_select_admin_events
on public.click_events
for select
to authenticated
using (public.is_current_user_admin());

create or replace function public.record_link_click(
  p_link_request_id uuid,
  p_slug text,
  p_referrer text default null,
  p_user_agent text default null,
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
    slug,
    referrer,
    user_agent,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content,
    utm_term
  )
  select
    link_requests.id,
    link_requests.requested_slug,
    nullif(left(p_referrer, 2000), ''),
    nullif(left(p_user_agent, 1000), ''),
    nullif(left(p_utm_source, 255), ''),
    nullif(left(p_utm_medium, 255), ''),
    nullif(left(p_utm_campaign, 255), ''),
    nullif(left(p_utm_content, 255), ''),
    nullif(left(p_utm_term, 255), '')
  from public.link_requests
  where link_requests.id = p_link_request_id
    and link_requests.requested_slug = p_slug
    and link_requests.status = 'approved';
end;
$$;

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
  click_totals as (
    select
      click_events.link_request_id,
      count(*)::bigint as total_clicks,
      max(click_events.clicked_at) as last_clicked_at
    from public.click_events
    join allowed_link_requests
      on allowed_link_requests.id = click_events.link_request_id
    group by click_events.link_request_id
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
        click_events.link_request_id,
        click_events.referrer,
        count(*) as event_count,
        max(click_events.clicked_at) as last_clicked_at
      from public.click_events
      join allowed_link_requests
        on allowed_link_requests.id = click_events.link_request_id
      where click_events.referrer is not null
        and click_events.referrer <> ''
      group by click_events.link_request_id, click_events.referrer
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

revoke all on table public.click_events from anon, authenticated;
grant select on table public.click_events to authenticated;

revoke all on function public.record_link_click(
  uuid,
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
  text,
  text,
  text,
  text,
  text,
  text,
  text
) to anon, authenticated;

revoke all on function public.get_link_request_click_summaries(uuid[]) from public;
grant execute on function public.get_link_request_click_summaries(uuid[]) to authenticated;
