-- Allow one Link Vitrini platform to own multiple URL rows.
-- Existing single-link rows remain valid; application code now groups rows by
-- platform and uses sort_order for platform order plus in-platform order.
drop index if exists public.link_vitrine_items_vitrine_platform_key;

create index if not exists link_vitrine_items_vitrine_platform_sort_idx
on public.link_vitrine_items (vitrine_id, platform, sort_order);
