create table if not exists public.channel_links (
  id uuid primary key default gen_random_uuid(),
  link_request_id uuid not null references public.link_requests(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  slug text not null,
  channel_key text not null,
  channel_label text not null,
  utm_source text not null,
  utm_medium text not null,
  utm_campaign text not null,
  utm_content text,
  is_custom boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint channel_links_slug_format_check check (
    slug = lower(slug)
    and slug ~ '^[a-z0-9-]{2,80}$'
  ),
  constraint channel_links_channel_key_format_check check (
    channel_key = lower(channel_key)
    and channel_key ~ '^[a-z0-9][a-z0-9-]{0,79}$'
  ),
  constraint channel_links_reserved_slug_check check (
    slug not in (
      'admin',
      'dashboard',
      'login',
      'register',
      'privacy',
      'terms',
      'not-approved',
      'api',
      'auth',
      'static'
    )
  ),
  constraint channel_links_labels_not_blank_check check (
    btrim(channel_label) <> ''
    and btrim(utm_source) <> ''
    and btrim(utm_medium) <> ''
    and btrim(utm_campaign) <> ''
  )
);

create unique index if not exists channel_links_slug_key
on public.channel_links (lower(slug));

create unique index if not exists channel_links_link_request_channel_key_key
on public.channel_links (link_request_id, channel_key);

create index if not exists channel_links_link_request_id_created_at_idx
on public.channel_links (link_request_id, created_at desc);

create index if not exists channel_links_user_id_created_at_idx
on public.channel_links (user_id, created_at desc);

create or replace function public.set_channel_links_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_channel_links_updated_at on public.channel_links;

create trigger set_channel_links_updated_at
before update on public.channel_links
for each row
execute function public.set_channel_links_updated_at();

create or replace function public.enforce_channel_link_parent()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  parent_user_id uuid;
  parent_status text;
begin
  select link_requests.user_id, link_requests.status
  into parent_user_id, parent_status
  from public.link_requests
  where link_requests.id = new.link_request_id;

  if parent_user_id is null then
    raise exception 'channel link parent does not exist'
      using errcode = 'foreign_key_violation';
  end if;

  if parent_status <> 'approved' then
    raise exception 'channel links require an approved parent link'
      using errcode = 'check_violation';
  end if;

  if new.user_id is distinct from parent_user_id then
    raise exception 'channel link owner must match parent link owner'
      using errcode = 'check_violation';
  end if;

  if exists (
    select 1
    from public.link_requests
    where link_requests.requested_slug is not null
      and lower(link_requests.requested_slug) = lower(new.slug)
      and link_requests.status in ('pending', 'approved')
  ) then
    raise exception 'channel link slug conflicts with an active link request'
      using errcode = 'unique_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_channel_link_parent on public.channel_links;

create trigger enforce_channel_link_parent
before insert or update on public.channel_links
for each row
execute function public.enforce_channel_link_parent();

create or replace function public.prevent_link_request_channel_slug_conflict()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.requested_slug is not null
    and new.status in ('pending', 'approved')
    and exists (
      select 1
      from public.channel_links
      where lower(channel_links.slug) = lower(new.requested_slug)
    )
  then
    raise exception 'link request slug conflicts with an existing channel link'
      using errcode = 'unique_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_link_request_channel_slug_conflict on public.link_requests;

create trigger prevent_link_request_channel_slug_conflict
before insert or update of requested_slug, status on public.link_requests
for each row
execute function public.prevent_link_request_channel_slug_conflict();

alter table public.channel_links enable row level security;

drop policy if exists channel_links_select_own_or_admin on public.channel_links;

create policy channel_links_select_own_or_admin
on public.channel_links
for select
to authenticated
using (
  user_id = (select auth.uid())
  or public.is_current_user_admin()
);

drop policy if exists channel_links_select_approved_public on public.channel_links;

create policy channel_links_select_approved_public
on public.channel_links
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.link_requests
    where link_requests.id = channel_links.link_request_id
      and link_requests.status = 'approved'
  )
);

drop policy if exists channel_links_insert_own_approved_parent on public.channel_links;

create policy channel_links_insert_own_approved_parent
on public.channel_links
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.link_requests
    where link_requests.id = channel_links.link_request_id
      and link_requests.user_id = (select auth.uid())
      and link_requests.status = 'approved'
      and link_requests.requested_slug is not null
  )
);

alter table public.click_events
add column if not exists channel_link_id uuid,
add column if not exists channel_key text,
add column if not exists channel_label text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'click_events_channel_link_id_fkey'
  ) then
    alter table public.click_events
    add constraint click_events_channel_link_id_fkey
    foreign key (channel_link_id)
    references public.channel_links(id)
    on delete set null;
  end if;
end;
$$;

create index if not exists click_events_channel_link_id_clicked_at_idx
on public.click_events (channel_link_id, clicked_at desc);

create index if not exists click_events_channel_key_clicked_at_idx
on public.click_events (channel_key, clicked_at desc);

drop function if exists public.record_link_click(
  uuid,
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

revoke all on table public.channel_links from anon, authenticated;
grant select (
  id,
  link_request_id,
  slug,
  channel_key,
  channel_label,
  utm_source,
  utm_medium,
  utm_campaign,
  utm_content,
  is_custom,
  created_at,
  updated_at
)
on table public.channel_links to anon, authenticated;
grant insert (
  link_request_id,
  user_id,
  slug,
  channel_key,
  channel_label,
  utm_source,
  utm_medium,
  utm_campaign,
  utm_content,
  is_custom
)
on table public.channel_links to authenticated;

grant select (
  id,
  requested_slug,
  target_url,
  campaign_name,
  status
)
on table public.link_requests to anon;

revoke all on function public.set_channel_links_updated_at() from public;
revoke all on function public.enforce_channel_link_parent() from public;
revoke all on function public.prevent_link_request_channel_slug_conflict() from public;

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
  text
) to anon, authenticated;
