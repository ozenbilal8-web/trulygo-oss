-- Add 5 new selectable Link Vitrini themes.
--
-- The theme is persisted to public.link_vitrines.theme, which is guarded by a
-- CHECK constraint that only allowed the original 5 ids. Adding new themes in
-- config alone would make save/publish fail with a constraint violation, so the
-- constraint is widened here (same drop/recreate pattern used by
-- 20260516171000_link_vitrine_marketplace_platforms.sql for platform ids).
--
-- UI/styling for these themes lives entirely in config + globals.css; this
-- migration only unblocks persistence. No data is modified and the column
-- default ('dark-premium') is unchanged.

alter table public.link_vitrines
drop constraint if exists link_vitrines_theme_check;

alter table public.link_vitrines
add constraint link_vitrines_theme_check check (
  theme in (
    'dark-premium',
    'minimal-light',
    'green-glow',
    'glass-effect',
    'plain-black',
    'rose-premium',
    'violet-neon',
    'cyan-tech',
    'amber-gold',
    'dark-ruby'
  )
);
