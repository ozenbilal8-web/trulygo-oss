create or replace function public.delete_own_link_request(
  p_link_request_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  deleted_id uuid;
begin
  if current_user_id is null then
    return false;
  end if;

  delete from public.link_requests
  where id = p_link_request_id
    and user_id = current_user_id
  returning id into deleted_id;

  return deleted_id is not null;
end;
$$;

revoke all on function public.delete_own_link_request(uuid) from public;
revoke all on function public.delete_own_link_request(uuid) from anon;
grant execute on function public.delete_own_link_request(uuid) to authenticated;
