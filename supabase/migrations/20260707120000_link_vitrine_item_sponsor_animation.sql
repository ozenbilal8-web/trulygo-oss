alter table public.link_vitrine_items
add column if not exists is_sponsored boolean not null default false,
add column if not exists sponsored_label text,
add column if not exists animation_enabled boolean not null default false,
add column if not exists animation_type text;

alter table public.link_vitrine_items
drop constraint if exists link_vitrine_items_sponsored_label_check;

alter table public.link_vitrine_items
add constraint link_vitrine_items_sponsored_label_check
check (
  (
    is_sponsored = false
    and sponsored_label is null
  )
  or (
    is_sponsored = true
    and sponsored_label in ('ad', 'sponsored', 'collaboration')
  )
);

alter table public.link_vitrine_items
drop constraint if exists link_vitrine_items_animation_type_check;

alter table public.link_vitrine_items
add constraint link_vitrine_items_animation_type_check
check (
  (
    animation_enabled = false
    and animation_type is null
  )
  or (
    animation_enabled = true
    and animation_type in ('pulse', 'shake', 'neon', 'shine', 'glow')
  )
);

grant select (
  is_sponsored,
  sponsored_label,
  animation_enabled,
  animation_type
)
on table public.link_vitrine_items to anon;
