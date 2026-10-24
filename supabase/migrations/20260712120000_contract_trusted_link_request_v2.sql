-- Sprint 1A CONTRACT: permanently close the legacy direct INSERT boundary.
-- Trusted link creation continues through the service-role-only
-- public.create_link_request_v2 function introduced by the EXPAND migration.

BEGIN;

-- Table-level and column-level privileges are independent in PostgreSQL.
-- Revoke both forms across the current schema so no known direct INSERT path
-- remains open to browser-facing roles. Existing SELECT/UPDATE grants stay.
REVOKE INSERT ON TABLE public.link_requests
FROM PUBLIC, anon, authenticated;

REVOKE INSERT (
  id,
  user_id,
  target_url,
  requested_slug,
  campaign_name,
  note,
  status,
  admin_note,
  reviewed_by,
  reviewed_at,
  created_at,
  updated_at,
  auto_approval_blocked,
  web_risk_status,
  web_risk_threats,
  web_risk_checked_at,
  submission_source,
  safety_status,
  safety_verified_at,
  safety_policy_version
) ON TABLE public.link_requests
FROM PUBLIC, anon, authenticated;

-- This policy only supported the retired authenticated direct INSERT path.
-- Removing it prevents a future grant from accidentally restoring that path.
-- SECURITY DEFINER V2 creation is not dependent on this policy.
DROP POLICY IF EXISTS link_requests_insert_own_pending
ON public.link_requests;

-- Reassert the legacy approval RPC boundary without changing either V2 RPC.
REVOKE EXECUTE ON FUNCTION public.auto_approve_link_request(uuid, uuid)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.auto_approve_link_request(uuid, uuid)
TO service_role;

COMMIT;
