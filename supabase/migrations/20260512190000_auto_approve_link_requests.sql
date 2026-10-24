create or replace function public.invoke_link_request_auto_approval()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  project_url text;
  webhook_secret text;
  function_url text;
  payload jsonb;
  headers jsonb;
  request_id bigint;
begin
  if new.status <> 'pending' then
    return new;
  end if;

  if pg_catalog.to_regclass('vault.decrypted_secrets') is null
    or pg_catalog.to_regprocedure('net.http_post(text,jsonb,jsonb,jsonb,integer)') is null
  then
    return new;
  end if;

  execute
    'select decrypted_secret from vault.decrypted_secrets where name = $1 limit 1'
  into project_url
  using 'project_url';

  execute
    'select decrypted_secret from vault.decrypted_secrets where name = $1 limit 1'
  into webhook_secret
  using 'link_request_auto_approve_webhook_secret';

  if project_url is null
    or pg_catalog.btrim(project_url) = ''
    or webhook_secret is null
    or pg_catalog.btrim(webhook_secret) = ''
  then
    return new;
  end if;

  function_url = pg_catalog.rtrim(project_url, '/')
    || '/functions/v1/auto-approve-link-request';

  payload = pg_catalog.jsonb_build_object(
    'type',
    'INSERT',
    'table',
    'link_requests',
    'schema',
    'public',
    'record',
    pg_catalog.to_jsonb(new),
    'old_record',
    null
  );

  headers = pg_catalog.jsonb_build_object(
    'Content-Type',
    'application/json',
    'x-trulygo-webhook-secret',
    webhook_secret
  );

  begin
    execute
      'select net.http_post($1, $2, $3, $4, $5)'
    into request_id
    using function_url, payload, '{}'::jsonb, headers, 2000;
  exception
    when others then
      return new;
  end;

  return new;
end;
$$;

drop trigger if exists invoke_link_request_auto_approval on public.link_requests;

create trigger invoke_link_request_auto_approval
after insert on public.link_requests
for each row
when (new.status = 'pending')
execute function public.invoke_link_request_auto_approval();

revoke all on function public.invoke_link_request_auto_approval() from public;
