begin;

revoke execute on function public.get_current_user_link_vitrine_collaboration_notifications()
from public, anon, authenticated, service_role;

commit;
