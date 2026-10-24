-- Public redirect resolver — CONTRACT step.
--
-- Companion to 20260516150000_public_redirect_rpc.sql (the EXPAND step).
--
-- This migration closes the column-leak window by:
--   1) Dropping the over-broad public SELECT policies that previously let
--      anon and authenticated callers project every column of any approved
--      link_request / channel_link row (including admin_note, note,
--      reviewed_by, user_id, reviewed_at, created_at, updated_at).
--   2) Revoking `anon`'s residual table-level column grants on these tables.
--
-- Pre-condition checklist (must all be true BEFORE applying):
--   * 20260516150000_public_redirect_rpc.sql is already applied in this
--     environment.
--   * The Vercel build whose `getApprovedLinkBySlug` calls
--     `resolve_public_link_redirect` is live and serving the `/[slug]` route.
--   * A main-slug redirect and a channel-slug redirect have been smoke-tested
--     against the production deploy and both work.
--
-- Why split: the previous single-step migration risked a redirect outage if
-- it ran before the new Vercel build was promoted (the old build would still
-- query `link_requests` / `channel_links` directly and hit the dropped
-- policies, returning 0 rows = "link aktif değil").
--
-- What still works after this contract:
--   * Owners and admins read their own rows via `link_requests_select_own_or_admin`
--     and `channel_links_select_own_or_admin` (unchanged).
--   * `auto-approve-link-request` edge function (service-role bypass).
--   * `record_link_click`, analytics RPCs, dashboard, admin and Link Vitrini.
--   * Public redirect via `resolve_public_link_redirect` (added in EXPAND).

-- ============================================================================
-- 1) Drop the public-approved SELECT policies
-- ============================================================================

drop policy if exists link_requests_select_approved_public on public.link_requests;
drop policy if exists channel_links_select_approved_public on public.channel_links;

-- ============================================================================
-- 2) Revoke anon table-level column grants that are no longer reachable
-- ============================================================================
--
-- Earlier migrations granted column-level SELECT on `link_requests` and
-- `channel_links` to `anon` so the dropped policies could expose the minimum
-- redirect columns. With the RPC now owning that responsibility, anon should
-- have no direct table access at all. Removing the grants keeps anon out of
-- advisor output for these tables.

revoke select on table public.link_requests from anon;
revoke select on table public.channel_links from anon;
