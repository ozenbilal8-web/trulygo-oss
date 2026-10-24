-- Retention infrastructure for click_events and rate_limits.
--
-- This migration does NOT schedule any automatic cleanup. It only adds:
--   1) A global index on click_events.clicked_at so a date-range delete can
--      use an index scan instead of a sequential scan (the existing
--      (link_request_id, clicked_at desc) / (slug, clicked_at desc) indexes
--      are good for analytics reads but not for org-wide cutoff deletes).
--   2) Two SECURITY DEFINER helper functions the operator can invoke from
--      the Supabase SQL editor when storage growth warrants pruning.
--
-- Both helpers clamp the cutoff with greatest(...) so a malformed argument
-- (NULL, 0, negative) cannot wipe the live hot window. They return the
-- number of rows actually deleted so the operator can confirm the impact.
--
-- Not touched here:
--   * analytics RPCs (get_link_request_click_summaries,
--     get_link_click_summary, get_current_user_total_clicks_today)
--   * record_link_click insert path
--   * channel_links, link_requests, link_vitrines schemas
--   * the auto-approve edge function

-- ============================================================================
-- 1) Index for retention scans
-- ============================================================================

create index if not exists click_events_clicked_at_idx
  on public.click_events (clicked_at);

-- ============================================================================
-- 2) Manual cleanup helpers (NOT scheduled — operator-triggered only)
-- ============================================================================
--
-- Usage from Supabase SQL editor (or any session with execute rights):
--   select public.cleanup_click_events_older_than(180);  -- keep 180 days
--   select public.cleanup_rate_limits_older_than(1);     -- keep 1 day
--
-- Both functions are SECURITY DEFINER with a pinned empty search_path so
-- every reference inside the body is schema-qualified. Execute is revoked
-- from public/anon/authenticated and granted only to service_role; the
-- Supabase SQL editor runs as postgres and can call them regardless.

create or replace function public.cleanup_click_events_older_than(p_days integer)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  effective_days integer;
  cutoff timestamptz;
  removed bigint;
begin
  -- Floor at 30 days so an accidental small/zero/null argument cannot delete
  -- the live analytics window the dashboard depends on. GREATEST / COALESCE
  -- are SQL conditional expressions, not pg_catalog functions, so they must
  -- stay unqualified even with `set search_path = ''` — see the comment in
  -- 20260516155000_fix_public_redirect_rpc.sql for the same gotcha.
  effective_days := greatest(coalesce(p_days, 180), 30);
  cutoff := pg_catalog.now() - pg_catalog.make_interval(days => effective_days);

  delete from public.click_events
  where clicked_at < cutoff;

  get diagnostics removed = row_count;
  return removed;
end;
$$;

revoke all on function public.cleanup_click_events_older_than(integer) from public;
revoke all on function public.cleanup_click_events_older_than(integer) from anon, authenticated;
grant execute on function public.cleanup_click_events_older_than(integer) to service_role;

create or replace function public.cleanup_rate_limits_older_than(p_days integer)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  effective_days integer;
  cutoff timestamptz;
  removed bigint;
begin
  -- Floor at 1 day so this helper can never drop rows inside the active
  -- fixed-window bucket the limiter is currently writing into. GREATEST /
  -- COALESCE stay unqualified — see the click_events helper above for the
  -- pg_catalog conditional-expression gotcha.
  effective_days := greatest(coalesce(p_days, 1), 1);
  cutoff := pg_catalog.now() - pg_catalog.make_interval(days => effective_days);

  delete from public.rate_limits
  where updated_at < cutoff;

  get diagnostics removed = row_count;
  return removed;
end;
$$;

revoke all on function public.cleanup_rate_limits_older_than(integer) from public;
revoke all on function public.cleanup_rate_limits_older_than(integer) from anon, authenticated;
grant execute on function public.cleanup_rate_limits_older_than(integer) to service_role;
