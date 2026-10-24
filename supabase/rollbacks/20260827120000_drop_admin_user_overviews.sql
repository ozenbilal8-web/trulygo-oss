BEGIN;

REVOKE ALL ON FUNCTION public.get_admin_user_overviews(uuid[])
FROM public, anon, authenticated, service_role;

DROP FUNCTION IF EXISTS public.get_admin_user_overviews(uuid[]);

COMMIT;
