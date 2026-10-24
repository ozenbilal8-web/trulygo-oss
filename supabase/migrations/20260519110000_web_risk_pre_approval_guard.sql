-- Google Web Risk pre-approval guard.
--
-- Adds a server-action-driven safety layer in front of the existing
-- auto-approval flow. The Web Risk Lookup call itself runs in
-- src/app/dashboard/actions.ts (Next.js server action) — this migration only
-- adds the columns that capture the result and the DB-level constraint that
-- prevents auto_approve_link_request from flipping a flagged row to approved.
--
-- Design contract:
--   1) The existing auto-approve trigger and edge function (auto-approve-link-request)
--      are NOT modified. The trigger still fires on every new pending row; the
--      edge function still runs its DNS / keyword / redirect checks; the only
--      change is in the RPC the edge function calls at the end. When the row
--      was pre-flagged by the server action (auto_approval_blocked = true) the
--      RPC's WHERE clause no longer matches and the update is a silent no-op,
--      so the link stays pending and falls into admin review.
--   2) Default values are chosen so that any existing pending row and any new
--      row created BEFORE this migration deploys keeps the historical
--      behavior — auto_approval_blocked defaults to false, so the RPC matches
--      it just like before.
--   3) Direct INSERTs that bypass the server action (e.g. supabase-js from a
--      malicious client) will land with auto_approval_blocked = false and go
--      through the existing auto-approval flow — this guard is server-action
--      complementary defense, not a hard DB-level Web Risk gate. The edge
--      function's own DNS / keyword / redirect / bot-block checks remain the
--      authoritative safety net for those bypass paths.
--
-- Not touched here:
--   * link_requests RLS policies (admin / owner select rules, insert rules)
--   * any other RPC (record_link_click, resolve_public_link_redirect,
--     check_rate_limit, get_*_click_summaries, cleanup_*)
--   * channel_links, link_vitrines, signal_*, click_events, rate_limits
--   * the auto-approve trigger function invoke_link_request_auto_approval
--   * the auto-approve edge function supabase/functions/auto-approve-link-request

-- ============================================================================
-- 1) New columns
-- ============================================================================

alter table public.link_requests
  add column if not exists auto_approval_blocked boolean not null default false,
  add column if not exists web_risk_status text,
  add column if not exists web_risk_threats text[],
  add column if not exists web_risk_checked_at timestamptz;

-- Constrain the status column to the four values the application emits. Older
-- rows (web_risk_status is null) are tolerated so the migration is backfill-free.
alter table public.link_requests
  drop constraint if exists link_requests_web_risk_status_check;

alter table public.link_requests
  add constraint link_requests_web_risk_status_check
  check (
    web_risk_status is null
    or web_risk_status in ('clean', 'flagged', 'error', 'skipped')
  );

-- Constrain the threat array to the three Web Risk threat types the lookup
-- endpoint is configured to query. NULL is allowed; an empty array is also
-- allowed (a clean lookup writes an empty array).
alter table public.link_requests
  drop constraint if exists link_requests_web_risk_threats_check;

alter table public.link_requests
  add constraint link_requests_web_risk_threats_check
  check (
    web_risk_threats is null
    or web_risk_threats <@ array[
      'MALWARE',
      'SOCIAL_ENGINEERING',
      'UNWANTED_SOFTWARE'
    ]::text[]
  );

-- ============================================================================
-- 2) Extend the column-level INSERT grant
-- ============================================================================
--
-- Authenticated users may now write the Web Risk fields when they insert their
-- own request. The server action sets them; a malicious direct insert can only
-- spoof the display (and slow its OWN link by setting auto_approval_blocked to
-- true) — the actual auto-approval gate still runs through the edge function's
-- own checks for rows that were not pre-flagged.

grant insert (
  auto_approval_blocked,
  web_risk_status,
  web_risk_threats,
  web_risk_checked_at
) on table public.link_requests to authenticated;

-- ============================================================================
-- 3) auto_approve_link_request — refuse to approve pre-flagged rows
-- ============================================================================
--
-- The Edge Function continues to call this RPC after its own safety checks
-- pass. The WHERE clause below silently no-ops when the row was flagged by
-- the server-action Web Risk layer, so the link stays pending and lands in
-- the admin queue. The signature, return type and grants are intentionally
-- unchanged so the live edge function deploy keeps working.

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
    and lr.auto_approval_blocked = false
  returning
    lr.id,
    lr.status,
    lr.reviewed_at;
end;
$$;

revoke all on function public.auto_approve_link_request(uuid, uuid) from public;
revoke all on function public.auto_approve_link_request(uuid, uuid) from anon, authenticated;
grant execute on function public.auto_approve_link_request(uuid, uuid) to service_role;
