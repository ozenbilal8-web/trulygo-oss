-- KVKK compliance migration:
--   1) Add marketing_consent column to profiles so the registration form can persist user preference.
--   2) Add a security-definer RPC that lets the currently authenticated user delete their own auth.users
--      row, which cascades to profiles, link_requests, click_events and channel_links.

alter table public.profiles
  add column if not exists marketing_consent boolean not null default false;

grant update (marketing_consent) on table public.profiles to authenticated;

create or replace function public.delete_current_user()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then
    raise exception 'not authenticated';
  end if;

  delete from auth.users where id = current_user_id;
end;
$$;

revoke all on function public.delete_current_user() from public;
grant execute on function public.delete_current_user() to authenticated;
