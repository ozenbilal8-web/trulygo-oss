alter table public.link_requests
add constraint link_requests_requested_slug_format_check
check (
  requested_slug is null
  or (
    requested_slug = lower(requested_slug)
    and requested_slug ~ '^[a-z0-9-]{2,80}$'
  )
)
not valid;

alter table public.link_requests
add constraint link_requests_requested_slug_reserved_check
check (
  requested_slug is null
  or requested_slug not in (
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
)
not valid;

create unique index if not exists link_requests_active_slug_key
on public.link_requests (lower(requested_slug))
where requested_slug is not null
  and status in ('pending', 'approved');

drop policy if exists link_requests_select_approved_public on public.link_requests;

create policy link_requests_select_approved_public
on public.link_requests
for select
to anon, authenticated
using (
  status = 'approved'
  and requested_slug is not null
);

grant select (requested_slug, target_url, status)
on table public.link_requests to anon;
