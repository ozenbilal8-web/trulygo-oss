-- Targeted fixed-window rate limiting backed by Postgres.
--
-- Design goals:
--   * No external service (no Upstash/Redis). Single Postgres table + RPC.
--   * Raw IPs / emails / user ids never land in the DB; only sha256 hashes.
--   * Race-safe: insert ... on conflict do update set count = rate_limits.count + 1.
--   * Caller can choose any (action, limit, window_seconds) tuple at runtime.
--   * Table is locked down via RLS; anon/authenticated cannot read it directly.
--     The only entry point is the security definer RPC public.check_rate_limit().
--
-- Cleanup of stale rows is left to a future cron / scheduled task so that the
-- hot insert path stays cheap. Suggested job: `delete from public.rate_limits
-- where updated_at < now() - interval '1 day'` once per hour.

create table if not exists public.rate_limits (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  key_hash text not null,
  window_start timestamptz not null,
  count integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rate_limits_action_format_check check (
    action ~ '^[a-z0-9:_.-]{1,64}$'
  ),
  constraint rate_limits_key_hash_format_check check (
    key_hash ~ '^[a-f0-9]{64}$'
  ),
  constraint rate_limits_count_nonneg_check check (count >= 0)
);

create unique index if not exists rate_limits_action_key_window_key
on public.rate_limits (action, key_hash, window_start);

create index if not exists rate_limits_updated_at_idx
on public.rate_limits (updated_at);

alter table public.rate_limits enable row level security;

-- No SELECT/INSERT/UPDATE/DELETE grants for anon or authenticated; the only
-- entry point is the security definer RPC below.
revoke all on table public.rate_limits from anon, authenticated;

create or replace function public.check_rate_limit(
  p_action text,
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_action text;
  normalized_key text;
  hashed_key text;
  effective_limit integer;
  effective_window_seconds integer;
  epoch_now bigint;
  window_epoch bigint;
  current_window timestamptz;
  current_count integer;
begin
  normalized_action := pg_catalog.btrim(coalesce(p_action, ''));
  normalized_key := pg_catalog.btrim(coalesce(p_key, ''));

  -- Defensive: invalid input is treated as "blocked" so a caller cannot
  -- bypass the limiter by passing empty values.
  if normalized_action = '' or normalized_key = '' then
    return false;
  end if;

  effective_limit := greatest(coalesce(p_limit, 0), 0);
  effective_window_seconds := greatest(coalesce(p_window_seconds, 0), 1);

  if effective_limit <= 0 then
    return false;
  end if;

  -- Namespace the key with the action so the same raw value (e.g. an IP) used
  -- across different actions does not collide and cannot be enumerated.
  hashed_key := pg_catalog.encode(
    pg_catalog.sha256((normalized_action || '|' || normalized_key)::bytea),
    'hex'
  );

  -- Fixed window aligned to the unix epoch.
  epoch_now := pg_catalog.date_part('epoch', pg_catalog.now())::bigint;
  window_epoch := (epoch_now / effective_window_seconds) * effective_window_seconds;
  current_window := pg_catalog.to_timestamp(window_epoch);

  insert into public.rate_limits as rl (action, key_hash, window_start, count)
  values (normalized_action, hashed_key, current_window, 1)
  on conflict (action, key_hash, window_start)
  do update set
    count = rl.count + 1,
    updated_at = pg_catalog.now()
  returning rl.count into current_count;

  return current_count <= effective_limit;
end;
$$;

revoke all on function public.check_rate_limit(text, text, integer, integer) from public;
grant execute on function public.check_rate_limit(text, text, integer, integer) to anon, authenticated;
