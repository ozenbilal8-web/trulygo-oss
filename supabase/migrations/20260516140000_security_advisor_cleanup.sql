-- Security Advisor cleanup migration.
--
-- Goals:
--   1) Defensively re-revoke EXECUTE on every SECURITY DEFINER (and trigger
--      helper) function from PUBLIC, then re-grant it to the minimum set of
--      roles. Several functions (notably handle_new_user_profile) were
--      replaced by later `create or replace function` statements without an
--      explicit revoke. PostgreSQL preserves the existing privileges across
--      CREATE OR REPLACE, but Supabase Security Advisor occasionally still
--      flags these as "function is grantable to PUBLIC" — restating the
--      intended grants here removes that ambiguity.
--   2) Block bucket enumeration on the Link Vitrini storage buckets while
--      keeping the public file endpoint available. Files remain readable via
--      `/storage/v1/object/public/<bucket>/<path>` (the buckets stay marked
--      `public = true`); only the broad SELECT policy on `storage.objects`
--      that previously allowed `storage.list()` for anyone is removed. A
--      narrower SELECT policy lets the owning user still inspect their own
--      folder if a future feature needs it.
--
-- This migration intentionally does NOT change:
--   * RLS policies on `link_requests`, `click_events`, `channel_links`,
--     `profiles`, `link_vitrines`, `link_vitrine_items`, `rate_limits`.
--   * Table column grants.
--   * Function bodies, signatures or `search_path` settings (every existing
--     SECURITY DEFINER function already pins `set search_path = ''`).
--   * The `auto-approve-link-request` edge function.

-- ============================================================================
-- 1) Trigger helper functions (callable only via triggers, not by clients)
-- ============================================================================

revoke all on function public.set_profiles_updated_at() from public;
revoke all on function public.handle_new_user_profile() from public;
revoke all on function public.set_link_requests_updated_at() from public;
revoke all on function public.prevent_reviewed_link_target_url_change() from public;
revoke all on function public.set_channel_links_updated_at() from public;
revoke all on function public.enforce_channel_link_parent() from public;
revoke all on function public.prevent_link_request_channel_slug_conflict() from public;
revoke all on function public.set_link_vitrines_updated_at() from public;
revoke all on function public.set_link_vitrine_items_updated_at() from public;
revoke all on function public.invoke_link_request_auto_approval() from public;

-- ============================================================================
-- 2) Functions callable by authenticated users only
-- ============================================================================

-- Used by RLS policies and server-side admin role checks.
revoke all on function public.is_current_user_admin() from public;
revoke all on function public.is_current_user_admin() from anon;
grant execute on function public.is_current_user_admin() to authenticated;

-- KVKK self-delete: only the logged-in account can wipe itself.
revoke all on function public.delete_current_user() from public;
revoke all on function public.delete_current_user() from anon;
grant execute on function public.delete_current_user() to authenticated;

-- Analytics aggregations: re-check ownership/admin inside their bodies via
-- auth.uid() / is_current_user_admin(). No reason to expose them to anon.
revoke all on function public.get_link_request_click_summaries(uuid[]) from public;
revoke all on function public.get_link_request_click_summaries(uuid[]) from anon;
grant execute on function public.get_link_request_click_summaries(uuid[]) to authenticated;

revoke all on function public.get_link_click_summary(uuid, text, int, int) from public;
revoke all on function public.get_link_click_summary(uuid, text, int, int) from anon;
grant execute on function public.get_link_click_summary(uuid, text, int, int) to authenticated;

revoke all on function public.get_current_user_total_clicks_today() from public;
revoke all on function public.get_current_user_total_clicks_today() from anon;
grant execute on function public.get_current_user_total_clicks_today() to authenticated;

-- ============================================================================
-- 3) Functions callable by both anon and authenticated
-- ============================================================================

-- Public redirect analytics — the click recorder runs from `createAnonymousClient`
-- on every approved-slug redirect, including for logged-in visitors. Both roles
-- need execute.
revoke all on function public.record_link_click(
  uuid,
  text,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) from public;
grant execute on function public.record_link_click(
  uuid,
  text,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) to anon, authenticated;

-- Rate limiter — needed for unauthenticated auth flows (login / register /
-- forgot-password) as well as authenticated link / vitrine flows. The function
-- is the only entry point into `public.rate_limits` (the table itself has no
-- grants), so keeping anon access here is required.
revoke all on function public.check_rate_limit(text, text, integer, integer) from public;
grant execute on function public.check_rate_limit(text, text, integer, integer)
  to anon, authenticated;

-- ============================================================================
-- 4) Service-role-only functions
-- ============================================================================

-- Called by the auto-approve edge function with the service-role key after the
-- safety checks pass. Clients must never be able to flip a link_request to
-- approved.
revoke all on function public.auto_approve_link_request(uuid, uuid) from public;
revoke all on function public.auto_approve_link_request(uuid, uuid) from anon, authenticated;
grant execute on function public.auto_approve_link_request(uuid, uuid) to service_role;

-- ============================================================================
-- 5) Storage policies: block bucket enumeration but keep public file reads
-- ============================================================================
--
-- The Link Vitrini avatar and banner buckets stay `public = true` so existing
-- `getPublicUrl()` links keep working without auth. The previous SELECT
-- policy granted listing rights to every anon/authenticated caller, which the
-- advisor flags as "public bucket allows listing". Application code never
-- calls `storage.list()` (only `upload`, `remove`, `getPublicUrl`), so we can
-- drop the broad policy and replace it with an owner-scoped one. The public
-- file endpoint serves objects through the public bucket bypass and is
-- unaffected.

drop policy if exists link_vitrine_avatars_public_read on storage.objects;
drop policy if exists link_vitrine_banners_public_read on storage.objects;

drop policy if exists link_vitrine_avatars_select_own on storage.objects;

create policy link_vitrine_avatars_select_own
on storage.objects
for select
to authenticated
using (
  bucket_id = 'link-vitrine-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists link_vitrine_banners_select_own on storage.objects;

create policy link_vitrine_banners_select_own
on storage.objects
for select
to authenticated
using (
  bucket_id = 'link-vitrine-banners'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
