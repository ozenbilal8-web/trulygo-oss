create or replace function public.auto_approve_link_request(
  request_id uuid,
  reviewer_id uuid
)
returns table (
  id uuid,
  status text,
  reviewed_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  update public.link_requests as lr
  set
    status = 'approved',
    reviewed_by = reviewer_id,
    reviewed_at = pg_catalog.now(),
    admin_note = null
  where lr.id = request_id
    and lr.status = 'pending'
  returning
    lr.id,
    lr.status,
    lr.reviewed_at;
end;
$$;

revoke all on function public.auto_approve_link_request(uuid, uuid) from public;
grant execute on function public.auto_approve_link_request(uuid, uuid) to service_role;
