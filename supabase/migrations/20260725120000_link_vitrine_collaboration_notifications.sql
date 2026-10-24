begin;

create or replace function public.get_current_user_link_vitrine_collaboration_notifications()
returns table (
  has_vitrine boolean,
  request_id uuid,
  subject text,
  status text,
  created_at timestamptz,
  unread_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with current_context as (
    select (
      select link_vitrines.id
      from public.link_vitrines
      where link_vitrines.user_id = (select auth.uid())
      limit 1
    ) as vitrine_id
  ),
  recent_requests as (
    select
      requests.id as request_id,
      requests.subject,
      requests.status,
      requests.created_at
    from public.link_vitrine_collaboration_requests as requests
    join current_context
      on current_context.vitrine_id = requests.vitrine_id
    order by requests.created_at desc, requests.id desc
    limit 20
  ),
  unread_requests as (
    select count(*)::bigint as unread_count
    from public.link_vitrine_collaboration_requests as requests
    join current_context
      on current_context.vitrine_id = requests.vitrine_id
    where requests.status = 'new'
  )
  select
    current_context.vitrine_id is not null as has_vitrine,
    recent_requests.request_id,
    recent_requests.subject,
    recent_requests.status,
    recent_requests.created_at,
    unread_requests.unread_count
  from current_context
  cross join unread_requests
  left join recent_requests on true
  order by
    recent_requests.created_at desc nulls last,
    recent_requests.request_id desc nulls last;
$$;

revoke all on function public.get_current_user_link_vitrine_collaboration_notifications()
from public, anon, authenticated, service_role;

grant execute on function public.get_current_user_link_vitrine_collaboration_notifications()
to authenticated;

commit;
