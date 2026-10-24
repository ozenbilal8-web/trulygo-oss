-- Non-destructive application rollback for the Link Vitrini collaboration
-- feature. It deliberately keeps settings, verification, and request rows.
-- Re-enable the grants from the matching migration when the application is
-- ready to serve the feature again.

begin;

revoke execute on function public.save_current_user_link_vitrine_collaboration_settings(uuid, text, boolean)
from authenticated;
revoke execute on function public.get_current_user_link_vitrine_collaboration_settings()
from authenticated;
revoke execute on function public.get_current_user_link_vitrine_collaboration_request_summaries(integer)
from authenticated;
revoke execute on function public.get_current_user_link_vitrine_collaboration_request_detail(uuid)
from authenticated;
revoke execute on function public.update_current_user_link_vitrine_collaboration_request_status(uuid, text, text)
from authenticated;

revoke execute on function public.get_public_link_vitrine_collaboration_availability(text)
from anon, authenticated;

revoke execute on function public.prepare_link_vitrine_collaboration_email_verification(uuid, uuid, text, text, timestamptz)
from service_role;
revoke execute on function public.revoke_link_vitrine_collaboration_email_verification(text)
from service_role;
revoke execute on function public.consume_link_vitrine_collaboration_email_verification(text)
from service_role;
revoke execute on function public.create_link_vitrine_collaboration_request(text, text, text, text, text, text, text, text, text, text, text)
from service_role;
revoke execute on function public.update_link_vitrine_collaboration_notification(uuid, text, text, text)
from service_role;

commit;
