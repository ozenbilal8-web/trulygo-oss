-- Public redirect resolver — EXPAND step.
--
-- This migration only ADDS the new SECURITY DEFINER RPC. The existing
-- `link_requests_select_approved_public` / `channel_links_select_approved_public`
-- policies and anon column grants are left in place so that production code
-- still on the old direct-SELECT path keeps working during the rollout.
--
-- The matching CONTRACT migration
--   20260516160000_drop_public_link_select_policies.sql
-- removes those legacy policies and grants. It must NOT be applied until:
--   1) This migration has been applied in production.
--   2) The Next.js deploy that switches `getApprovedLinkBySlug` to the RPC
--      has gone live and a public redirect / channel redirect has been
--      smoke-tested end-to-end.
--
-- Rationale: if the contract step ran first, in-flight requests served by the
-- previous Vercel build would still hit `link_requests` / `channel_links`
-- directly and 404 the redirect. Splitting expand/contract eliminates that
-- window.
--
-- Not touched here:
--   * `auto-approve-link-request` edge function (service-role bypass).
--   * `record_link_click`, analytics RPCs, channel-link RLS, dashboard/admin
--     policies, Link Vitrini policies and 20260516140000 cleanup.

-- ============================================================================
-- Secure resolver RPC
-- ============================================================================
--
-- Returns at most one row with only the columns the public redirect needs.
-- For a main-slug match we synthesize the channel metadata the application
-- already expects ('main' / 'direct' / requested_slug). For a channel-link
-- match we project the channel's own `utm_*` values.
--
-- The function deliberately does NOT return admin_note, note, reviewed_by,
-- user_id, reviewed_at, created_at, updated_at — those stay reachable only
-- through the `*_select_own_or_admin` policies on the underlying tables.

create or replace function public.resolve_public_link_redirect(p_slug text)
returns table (
  link_request_id uuid,
  requested_slug text,
  target_url text,
  clicked_slug text,
  channel_link_id uuid,
  channel_key text,
  channel_label text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  normalized_slug text;
begin
  normalized_slug := pg_catalog.btrim(pg_catalog.lower(pg_catalog.coalesce(p_slug, '')));

  if normalized_slug = '' then
    return;
  end if;

  return query
    select
      lr.id,
      lr.requested_slug,
      lr.target_url,
      lr.requested_slug,
      null::uuid,
      'main'::text,
      U&'Do\011Frudan / Ana link'::text,
      'direct'::text,
      'main'::text,
      lr.requested_slug,
      null::text
    from public.link_requests lr
    where lr.requested_slug = normalized_slug
      and lr.status = 'approved'
    limit 1;

  -- FOUND is set by the preceding RETURN QUERY. If the main slug matched we
  -- skip the channel-link branch.
  if found then
    return;
  end if;

  return query
    select
      lr.id,
      lr.requested_slug,
      lr.target_url,
      cl.slug,
      cl.id,
      cl.channel_key,
      cl.channel_label,
      cl.utm_source,
      cl.utm_medium,
      cl.utm_campaign,
      cl.utm_content
    from public.channel_links cl
    join public.link_requests lr on lr.id = cl.link_request_id
    where cl.slug = normalized_slug
      and lr.status = 'approved'
      and lr.requested_slug is not null
    limit 1;
end;
$$;

revoke all on function public.resolve_public_link_redirect(text) from public;
grant execute on function public.resolve_public_link_redirect(text) to anon, authenticated;
