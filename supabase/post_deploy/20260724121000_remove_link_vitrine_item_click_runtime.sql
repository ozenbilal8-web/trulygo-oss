begin;

-- Post-deploy contract cleanup. This file intentionally lives outside
-- supabase/migrations, so `supabase db push` cannot remove the old RPC contract
-- while the previous application version may still be serving traffic.
--
-- Apply only after the new profile-view app release is verified and its
-- rollback window has closed. Dropping these RPC entry points does not delete
-- historical events.
-- If the application must be rolled back during deployment, run
-- supabase/rollbacks/20260724121000_restore_link_vitrine_item_click_runtime.sql
-- before restoring the previous app version.
drop function if exists public.record_link_vitrine_item_click(
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
  text,
  text
);

drop function if exists public.get_link_vitrine_item_click_totals(uuid);

-- Deliberately preserved:
--   * public.sync_owned_link_vitrine_items(uuid, jsonb), which is the atomic,
--     owner-scoped editor save path and is not an analytics-only RPC;
--   * click_events rows, columns, constraints, foreign keys and indexes;
--   * cleanup_click_events_older_than(integer), whose current behavior keeps
--     the legacy Link Vitrini item-click history intact.
-- Any archive or destructive schema contraction requires a later, separately
-- approved migration after production data has an explicit disposition.

commit;
