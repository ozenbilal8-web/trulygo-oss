-- Enforce single Link Vitrini per user at the database level.
-- The existing link_vitrines_user_id_created_at_idx is kept for ordering reads;
-- this new unique index guarantees only one row per user_id can exist.
create unique index if not exists link_vitrines_user_id_key
on public.link_vitrines (user_id);
