-- Add marketplace platforms to Link Vitrini items.
-- `sort_order` remains the display order field and is now interpreted as one
-- global order across social + marketplace links.
alter table public.link_vitrine_items
drop constraint if exists link_vitrine_items_platform_check;

alter table public.link_vitrine_items
add constraint link_vitrine_items_platform_check check (
  platform in (
    'instagram',
    'facebook',
    'x',
    'linkedin',
    'youtube',
    'tiktok',
    'twitch',
    'kick',
    'discord',
    'telegram',
    'whatsapp',
    'website',
    'hepsiburada',
    'trendyol',
    'amazon',
    'n11',
    'idefix',
    'pttavm',
    'ciceksepeti',
    'pazarama'
  )
);
