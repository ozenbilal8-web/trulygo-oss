BEGIN;

-- Resolve only the Auth/account fields required by the server-rendered admin UI.
-- Browser-facing roles cannot execute this function; the application performs
-- its own profile-role authorization before the server-only service client calls it.
CREATE OR REPLACE FUNCTION public.get_admin_user_overviews(p_user_ids uuid[])
RETURNS TABLE (
  user_id uuid,
  email text,
  link_count bigint,
  has_link_vitrine boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  WITH requested_users AS (
    SELECT DISTINCT requested.user_id
    FROM pg_catalog.unnest(
      COALESCE(p_user_ids, ARRAY[]::uuid[])
    ) AS requested(user_id)
    WHERE requested.user_id IS NOT NULL
  ),
  link_counts AS (
    SELECT
      link_requests.user_id,
      count(*)::bigint AS link_count
    FROM public.link_requests
    INNER JOIN requested_users
      ON requested_users.user_id = link_requests.user_id
    GROUP BY link_requests.user_id
  ),
  vitrine_users AS (
    SELECT link_vitrines.user_id
    FROM public.link_vitrines
    INNER JOIN requested_users
      ON requested_users.user_id = link_vitrines.user_id
    GROUP BY link_vitrines.user_id
  )
  SELECT
    auth_users.id AS user_id,
    auth_users.email::text AS email,
    COALESCE(link_counts.link_count, 0::bigint) AS link_count,
    vitrine_users.user_id IS NOT NULL AS has_link_vitrine
  FROM requested_users
  INNER JOIN auth.users AS auth_users
    ON auth_users.id = requested_users.user_id
  LEFT JOIN link_counts
    ON link_counts.user_id = requested_users.user_id
  LEFT JOIN vitrine_users
    ON vitrine_users.user_id = requested_users.user_id
  ORDER BY auth_users.id;
$function$;

REVOKE ALL ON FUNCTION public.get_admin_user_overviews(uuid[])
FROM public, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.get_admin_user_overviews(uuid[])
TO service_role;

COMMIT;
