-- Hotfix: fix `public.resolve_public_link_redirect(text)` so that approved
-- main slugs and approved channel slugs actually return a row.
--
-- Root causes of the production outage:
--
--   1) `pg_catalog.coalesce(...)` does not exist.
--      COALESCE is a SQL conditional expression (a sugar form of CASE), not
--      a function, so it cannot be schema-qualified. The original migration
--      (20260516150000_public_redirect_rpc.sql) tried to defensively prefix
--      it the same way `pg_catalog.btrim` and `pg_catalog.lower` are
--      prefixed — that works for those because they ARE functions in
--      pg_catalog, but it is invalid for COALESCE. Production logged:
--          ERROR: function pg_catalog.coalesce(text, unknown) does not exist
--      so the CREATE OR REPLACE failed and the function in the live DB was
--      either never updated or left in a broken state.
--
--   2) PL/pgSQL OUT-parameter shadowing in the original RETURNS TABLE
--      function. The output columns include `requested_slug` and
--      `target_url`, which are identical to the underlying table column
--      names. PL/pgSQL's default `variable_conflict` resolution makes such
--      bare identifiers refer to the OUT parameter (which is NULL on entry)
--      rather than to the table column, so predicates like
--          where lr.requested_slug = normalized_slug
--      could be parsed correctly while other expressions and the row
--      construction silently compared / projected against the NULL OUT
--      parameter. Net effect: even after COALESCE was patched manually the
--      RPC kept returning zero rows.
--
-- The fix:
--
--   * Rewrite as a LANGUAGE SQL function with an explicit CTE pipeline.
--     SQL functions do not have the PL/pgSQL OUT-parameter shadowing
--     problem because their RETURNS TABLE column names are only used to
--     describe the returned row layout, not to introduce variables in the
--     body's scope.
--   * Every column reference in the SELECT lists and predicates is aliased
--     by its source (`lr.requested_slug`, `cl.slug`, `n.slug`, `m.*`,
--     `c.*`), so there is no ambiguity between the function's output
--     columns and the underlying tables.
--   * COALESCE / BTRIM / LOWER are called unqualified. `pg_catalog` is
--     implicitly placed in front of `search_path` even when
--     `set search_path = ''` is in effect, so these built-ins still resolve.
--   * Signature, output column names, type and grants are unchanged, so
--     `src/lib/link-requests.ts` `getApprovedLinkBySlug` keeps working
--     without any code change.
--   * The contract migration 20260516160000_drop_public_link_select_policies.sql
--     remains untouched and MUST NOT be applied until this hotfix is verified
--     in production.
--   * `auto-approve-link-request` edge function and `record_link_click`
--     analytics path are not touched.

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
language sql
stable
security definer
set search_path = ''
as $$
  with normalized as (
    select btrim(lower(coalesce(p_slug, ''))) as slug
  ),
  main_match as (
    select
      lr.id                              as link_request_id,
      lr.requested_slug                  as requested_slug,
      lr.target_url                      as target_url,
      lr.requested_slug                  as clicked_slug,
      null::uuid                         as channel_link_id,
      'main'::text                       as channel_key,
      U&'Do\011Frudan / Ana link'::text  as channel_label,
      'direct'::text                     as utm_source,
      'main'::text                       as utm_medium,
      lr.requested_slug                  as utm_campaign,
      null::text                         as utm_content
    from public.link_requests lr
    cross join normalized n
    where n.slug <> ''
      and lr.requested_slug = n.slug
      and lr.status = 'approved'
    limit 1
  ),
  channel_match as (
    select
      lr.id              as link_request_id,
      lr.requested_slug  as requested_slug,
      lr.target_url      as target_url,
      cl.slug            as clicked_slug,
      cl.id              as channel_link_id,
      cl.channel_key     as channel_key,
      cl.channel_label   as channel_label,
      cl.utm_source      as utm_source,
      cl.utm_medium      as utm_medium,
      cl.utm_campaign    as utm_campaign,
      cl.utm_content     as utm_content
    from public.channel_links cl
    join public.link_requests lr on lr.id = cl.link_request_id
    cross join normalized n
    where n.slug <> ''
      and cl.slug = n.slug
      and lr.status = 'approved'
      and lr.requested_slug is not null
      and not exists (select 1 from main_match)
    limit 1
  )
  select
    m.link_request_id,
    m.requested_slug,
    m.target_url,
    m.clicked_slug,
    m.channel_link_id,
    m.channel_key,
    m.channel_label,
    m.utm_source,
    m.utm_medium,
    m.utm_campaign,
    m.utm_content
  from main_match m
  union all
  select
    c.link_request_id,
    c.requested_slug,
    c.target_url,
    c.clicked_slug,
    c.channel_link_id,
    c.channel_key,
    c.channel_label,
    c.utm_source,
    c.utm_medium,
    c.utm_campaign,
    c.utm_content
  from channel_match c;
$$;

revoke all on function public.resolve_public_link_redirect(text) from public;
grant execute on function public.resolve_public_link_redirect(text) to anon, authenticated;
