create table if not exists public.link_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  target_url text not null,
  requested_slug text,
  campaign_name text,
  note text,
  status text not null default 'pending',
  admin_note text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint link_requests_status_check check (
    status in ('pending', 'approved', 'rejected', 'suspended')
  )
);

create index if not exists link_requests_user_id_created_at_idx
on public.link_requests (user_id, created_at desc);

create index if not exists link_requests_status_created_at_idx
on public.link_requests (status, created_at desc);

alter table public.link_requests enable row level security;

create or replace function public.is_current_user_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

create or replace function public.set_link_requests_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_link_requests_updated_at on public.link_requests;

create trigger set_link_requests_updated_at
before update on public.link_requests
for each row
execute function public.set_link_requests_updated_at();

create or replace function public.prevent_reviewed_link_target_url_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status <> 'pending' and new.target_url is distinct from old.target_url then
    raise exception 'target_url cannot be changed after review';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_reviewed_link_target_url_change on public.link_requests;

create trigger prevent_reviewed_link_target_url_change
before update on public.link_requests
for each row
execute function public.prevent_reviewed_link_target_url_change();

drop policy if exists link_requests_select_own_or_admin on public.link_requests;

create policy link_requests_select_own_or_admin
on public.link_requests
for select
to authenticated
using (
  user_id = (select auth.uid())
  or public.is_current_user_admin()
);

drop policy if exists link_requests_insert_own_pending on public.link_requests;

create policy link_requests_insert_own_pending
on public.link_requests
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and status = 'pending'
  and admin_note is null
  and reviewed_by is null
  and reviewed_at is null
);

drop policy if exists link_requests_admin_update_review_fields on public.link_requests;

create policy link_requests_admin_update_review_fields
on public.link_requests
for update
to authenticated
using (public.is_current_user_admin())
with check (public.is_current_user_admin());

revoke all on table public.link_requests from anon, authenticated;
grant select on table public.link_requests to authenticated;
grant insert (user_id, target_url, requested_slug, campaign_name, note)
on table public.link_requests to authenticated;
grant update (status, admin_note, reviewed_by, reviewed_at)
on table public.link_requests to authenticated;

revoke all on function public.is_current_user_admin() from public;
grant execute on function public.is_current_user_admin() to authenticated;
revoke all on function public.set_link_requests_updated_at() from public;
revoke all on function public.prevent_reviewed_link_target_url_change() from public;
